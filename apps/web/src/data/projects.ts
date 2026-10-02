export type ProjectCategory =
  'EIES' | 'AUDIT' | 'MONITORING' | 'AGREMENT' | 'FORMATION' | 'ETUDE';

/**
 * Référence de réalisation (source : `raw/PROFIL_EWES.md` §5 et « Autres
 * réalisations »). Les champs se limitent à ce que le profil établit :
 * année(s), client ou partenaire, nature de la mission — pas de métrique ni
 * de détail technique non documenté.
 */
export interface Project {
  id: string;
  category: ProjectCategory;
  year: number;
  /** Missions pluriannuelles (ex. SGS 2019–2021), sinon `null`. */
  yearEnd: number | null;
  client: string;
  mission: string;
  /**
   * Champs facultatifs, renseignés plus tard par l'API (module `realisations`)
   * — jamais inventés : sans image, la fiche affiche une couverture générée.
   */
  image?: string;
  imageAlt?: string;
  /** Adresse de la fiche détaillée (`/realisations/{slug}`) : absente des références statiques de repli. */
  slug?: string;
  location?: string;
  summary?: string;
}

export interface ProjectCategoryOption {
  key: ProjectCategory;
  /** Libellé du filtre (« Audits »). */
  label: string;
  /** Libellé court de l'étiquette dans le registre (« Audit »). */
  tag: string;
}

/** Année de rattachement d'une mission (fin de mission si pluriannuelle). */
export function projectYear(project: Project) {
  return project.yearEnd ?? project.year;
}

/** Classes de couleur de l'étiquette de chaque type de mission. */
export const PROJECT_CATEGORY_TONE: Record<ProjectCategory, string> = {
  EIES: 'text-malachite',
  AUDIT: 'text-copper',
  MONITORING: 'text-primary',
  AGREMENT: 'text-primary-deep',
  FORMATION: 'text-malachite',
  ETUDE: 'text-copper',
};
