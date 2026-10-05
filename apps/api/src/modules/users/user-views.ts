import type { Role, User, UserInvitation } from '@prisma/client';

/** Compte tel que l'Administrateur le voit : jamais de hash de mot de passe ni de jeton. */
export interface UserView {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  /** Dernière connexion ou renouvellement de session (précision : durée du jeton d'accès). */
  lastActiveAt: Date | null;
  /** Fin du verrouillage après échecs de connexion répétés ; `null` si le compte n'est pas verrouillé. */
  lockedUntil: Date | null;
  /** Identifiant de la photo de profil, `null` sans photo (elle se lit par `GET /admin/users/:id/avatar`). */
  avatarVersion: string | null;
}

/** Identifiant public d'une photo : le nom du fichier sans extension, jamais le nom de stockage lui-même. */
export const avatarVersionOf = (avatarName: string | null) =>
  avatarName ? avatarName.replace(/\.webp$/, '') : null;

export interface UserDetailView extends UserView {
  /** Sessions de connexion encore valides. */
  activeSessions: number;
  /** Échecs de connexion encore comptés dans la fenêtre de verrouillage. */
  recentFailures: number;
  /** Droits documentaires explicites (dossiers, documents) : le rôle Utilisateur n'ouvre que ce qu'ils accordent. */
  grants: { folders: number; documents: number };
}

export const toUserView = (
  user: User,
  lastActiveAt: Date | null,
  lockedUntil: Date | null = null,
): UserView => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  lastActiveAt,
  lockedUntil,
  avatarVersion: avatarVersionOf(user.avatarName),
});

export type InvitationWithSender = UserInvitation & {
  invitedBy: { id: string; fullName: string } | null;
};

export interface InvitationView {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  /** `EXPIRED` : le lien n'est plus utilisable, l'invitation peut être renvoyée. */
  status: 'PENDING' | 'EXPIRED';
  invitedBy: { id: string; fullName: string } | null;
  expiresAt: Date;
  lastSentAt: Date;
  createdAt: Date;
}

export const toInvitationView = (
  invitation: InvitationWithSender,
  now: Date = new Date(),
): InvitationView => ({
  id: invitation.id,
  email: invitation.email,
  fullName: invitation.fullName,
  role: invitation.role,
  status: invitation.expiresAt <= now ? 'EXPIRED' : 'PENDING',
  invitedBy: invitation.invitedBy,
  expiresAt: invitation.expiresAt,
  lastSentAt: invitation.lastSentAt,
  createdAt: invitation.createdAt,
});
