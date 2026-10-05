import { z } from 'zod';
import { PenLine, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react';
import type { BadgeTone } from '@/components/admin/ui';
import type { Role } from './roles';

/** Compte tel que renvoyé par `GET /admin/users`. */
export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  /** Dernière connexion ou renouvellement de session. */
  lastActiveAt: string | null;
  /** Fin du verrouillage après échecs de connexion répétés ; `null` si le compte n'est pas verrouillé. */
  lockedUntil: string | null;
}

/** `GET /admin/users/:id`. */
export interface UserDetail extends UserSummary {
  activeSessions: number;
  /** Échecs de connexion encore comptés dans la fenêtre de verrouillage. */
  recentFailures: number;
  grants: { folders: number; documents: number };
}

/** `GET /admin/users/invitations`. */
export interface Invitation {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: 'PENDING' | 'EXPIRED';
  invitedBy: { id: string; fullName: string } | null;
  expiresAt: string;
  lastSentAt: string;
  createdAt: string;
}

/** Réponse d'une invitation ou d'un renvoi : le lien d'activation n'est montré qu'ici, une seule fois. */
export interface InviteResult {
  invitation: Invitation;
  activationUrl: string;
}

/** Compte verrouillé en ce moment (l'API reste juge : elle refuse la connexion). */
export const isLocked = (user: { lockedUntil: string | null }) =>
  user.lockedUntil !== null && Date.parse(user.lockedUntil) > Date.now();

/** Validité d'un lien d'invitation (jours), comme l'API. */
export const INVITATION_VALID_DAYS = 7;

export interface RoleProfile {
  label: string;
  /** Une ligne pour choisir. */
  tagline: string;
  icon: LucideIcon;
  tone: BadgeTone;
  /** Classes de teinte (pastille) : jamais la couleur seule, le libellé est toujours écrit. */
  tile: string;
  can: string[];
  cannot: string[];
}

/**
 * Portée de chaque rôle, en clair (blueprint/14_Admin_Backoffice.md §3). Ce
 * texte informe : c'est le serveur qui décide de ce qu'un rôle peut faire.
 */
export const ROLE_PROFILES: Record<Role, RoleProfile> = {
  ADMINISTRATEUR: {
    label: 'Administrateur',
    tagline: 'Pilote le portail, les comptes et les accès.',
    icon: ShieldCheck,
    tone: 'ing',
    tile: 'bg-ing-soft text-ing',
    can: [
      'Tout ce que fait un gestionnaire',
      'Inviter, désactiver et changer le rôle des comptes',
      'Attribuer les droits sur l’espace documentaire',
      'Consulter le journal d’audit et le suivi des e-mails',
    ],
    cannot: [],
  },
  GESTIONNAIRE: {
    label: 'Gestionnaire',
    tagline: 'Fait vivre le site : textes, réalisations, actualités.',
    icon: PenLine,
    tone: 'env',
    tile: 'bg-env-soft text-env',
    can: [
      'Modifier et publier les pages, pôles, réalisations et actualités',
      'Publier des documents publics et gérer la médiathèque',
      'Traiter les messages de contact',
      'Classer les documents de l’espace privé dans son périmètre',
    ],
    cannot: ['Gérer les comptes, les rôles et les droits d’accès'],
  },
  UTILISATEUR: {
    label: 'Utilisateur',
    tagline: 'Consulte l’espace documentaire privé.',
    icon: UserRound,
    tone: 'brand',
    tile: 'bg-brand-soft text-brand',
    can: ['Consulter les dossiers et documents qui lui sont accordés'],
    cannot: [
      'Modifier le contenu du site',
      'Voir un document sans droit explicite',
    ],
  },
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Mêmes limites que l'API (`InviteUserDto`) ; l'API revérifie tout. */
export const inviteSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Le nom est obligatoire.')
    .max(120, '120 caractères au plus.'),
  email: z
    .string()
    .trim()
    .min(1, 'L’adresse e-mail est obligatoire.')
    .max(254, '254 caractères au plus.')
    .refine(
      (value) => EMAIL.test(value),
      'Saisissez une adresse e-mail valide.',
    ),
  role: z.enum(['ADMINISTRATEUR', 'GESTIONNAIRE', 'UTILISATEUR']),
});

export type InviteFormValues = z.infer<typeof inviteSchema>;

/** Rôle proposé par défaut : le moins privilégié (on élève ensuite, jamais l'inverse par distraction). */
export const EMPTY_INVITE: InviteFormValues = {
  fullName: '',
  email: '',
  role: 'UTILISATEUR',
};

/** Mêmes limites que l'API pour le mot de passe d'un compte invité. */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordGauge {
  /** 0 à 4 segments allumés. */
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  tone: 'bad' | 'warn' | 'ok';
}

/**
 * Jauge de **longueur** (c'est elle qui compte : une phrase de passe de
 * plusieurs mots vaut mieux qu'un mot court « compliqué »). Ne prétend pas
 * mesurer la robustesse réelle ; la règle appliquée est la longueur minimale.
 */
export function passwordGauge(password: string): PasswordGauge {
  const length = password.length;
  if (length === 0) return { level: 0, label: '', tone: 'bad' };
  if (length < PASSWORD_MIN_LENGTH) {
    return { level: 1, label: 'Trop court', tone: 'bad' };
  }
  if (length < 16) return { level: 2, label: 'Suffisant', tone: 'warn' };
  if (length < 22) return { level: 3, label: 'Bon', tone: 'ok' };
  return { level: 4, label: 'Excellent', tone: 'ok' };
}

/** Libellés des actions d'audit liées aux comptes (historique d'un compte, tableau de bord). */
export const USER_ACTION_LABELS: Record<string, string> = {
  USER_INVITED: 'Invitation envoyée',
  USER_INVITATION_RESENT: 'Invitation renvoyée',
  USER_INVITATION_REVOKED: 'Invitation retirée',
  USER_INVITATION_ACCEPTED: 'Compte activé',
  USER_ROLE_CHANGED: 'Rôle modifié',
  USER_DEACTIVATED: 'Compte désactivé',
  USER_REACTIVATED: 'Compte réactivé',
  USER_UNLOCKED: 'Compte déverrouillé',
  AUTH_ACCOUNT_LOCKED: 'Compte verrouillé (échecs répétés)',
  USER_PROFILE_UPDATED: 'Nom modifié',
  USER_PASSWORD_CHANGED: 'Mot de passe modifié',
  AUTH_PASSWORD_CHANGE_FAILED: 'Échec de changement de mot de passe',
  USER_AVATAR_CHANGED: 'Photo de profil modifiée',
  USER_AVATAR_REMOVED: 'Photo de profil retirée',
  USER_SESSIONS_CLOSED: 'Appareils déconnectés',
};

/** Ligne de journal d'audit (`GET /admin/audit-logs`). */
export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  actor: { id: string; fullName: string } | null;
  createdAt: string;
}

const roleLabel = (value: unknown) =>
  typeof value === 'string' && value in ROLE_PROFILES
    ? ROLE_PROFILES[value as Role].label
    : null;

/** Détail lisible d'une entrée (« Gestionnaire → Utilisateur »), `null` s'il n'y a rien à ajouter. */
export function auditDetail(entry: AuditEntry): string | null {
  if (entry.action === 'USER_ROLE_CHANGED') {
    const before = roleLabel(entry.beforeData?.role);
    const after = roleLabel(entry.afterData?.role);
    if (before && after) return `${before} → ${after}`;
  }
  if (entry.action === 'USER_PROFILE_UPDATED') {
    const { fullName: before } = entry.beforeData ?? {};
    const { fullName: after } = entry.afterData ?? {};
    if (typeof before === 'string' && typeof after === 'string') {
      return `${before} → ${after}`;
    }
  }
  if (entry.action === 'USER_SESSIONS_CLOSED') {
    const count = entry.afterData?.count;
    if (typeof count === 'number') {
      return `${count} appareil${count > 1 ? 's' : ''}`;
    }
  }
  if (
    entry.action === 'USER_INVITED' ||
    entry.action === 'USER_INVITATION_RESENT'
  ) {
    return roleLabel(entry.afterData?.role);
  }
  return null;
}
