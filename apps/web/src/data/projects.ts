export type ProjectCategory =
  'ETUDES_AUDITS' | 'AGREMENTS' | 'FORMATION' | 'RECHERCHE';

/**
 * Référence de réalisation (source : `raw/PROFIL_EWES.md` §5). Les champs se
 * limitent à ce que le profil établit : pas de métrique ni de détail
 * technique non documenté.
 */
export interface Project {
  id: string;
  category: ProjectCategory;
  year: string;
  title: string;
  detail: string;
}

export interface ProjectCategoryOption {
  key: ProjectCategory | 'TOUS';
  label: string;
}
