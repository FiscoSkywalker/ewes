import { Role } from '@prisma/client';

/** Libellés et portée de chaque rôle (blueprint/14_Admin_Backoffice.md §3), repris dans l'e-mail d'invitation. */
export const ROLE_INFO: Record<Role, { label: string; scope: string }> = {
  [Role.ADMINISTRATEUR]: {
    label: 'Administrateur',
    scope:
      'Accès complet : contenus du site, espace documentaire, comptes, droits d’accès et journal d’audit.',
  },
  [Role.GESTIONNAIRE]: {
    label: 'Gestionnaire',
    scope:
      'Gestion des contenus du site (pages, réalisations, actualités, documents publics) et classement documentaire.',
  },
  [Role.UTILISATEUR]: {
    label: 'Utilisateur',
    scope:
      'Consultation de l’espace documentaire privé, selon les droits qui vous sont attribués.',
  },
};
