/** Rôles applicatifs (enum `Role` de l'API, blueprint/14_Admin_Backoffice.md §3). */
export type Role = 'ADMINISTRATEUR' | 'GESTIONNAIRE' | 'UTILISATEUR';

export const ROLE_LABELS: Record<Role, string> = {
  ADMINISTRATEUR: 'Administrateur',
  GESTIONNAIRE: 'Gestionnaire',
  UTILISATEUR: 'Utilisateur',
};

export const ALL_ROLES: readonly Role[] = [
  'ADMINISTRATEUR',
  'GESTIONNAIRE',
  'UTILISATEUR',
];
export const STAFF: readonly Role[] = ['ADMINISTRATEUR', 'GESTIONNAIRE'];
export const ADMIN_ONLY: readonly Role[] = ['ADMINISTRATEUR'];

export function isRole(value: unknown): value is Role {
  return (
    typeof value === 'string' &&
    (ALL_ROLES as readonly string[]).includes(value)
  );
}

/**
 * Page d'arrivée selon le rôle : l'Utilisateur n'a pas accès au portail
 * d'administration, seulement à l'espace documentaire privé.
 */
export function homePathFor(role: Role): string {
  return role === 'UTILISATEUR' ? '/admin/documents' : '/admin';
}
