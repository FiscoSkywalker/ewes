export type ProjectCategory =
  'EAU' | 'ENVIRONNEMENT' | 'INGENIERIE' | 'MINES_INDUSTRIE';
export type ProjectStatus = 'REALISE' | 'EN_COURS' | 'SUIVI_CONTINU';

export interface Project {
  id: string;
  title: string;
  category: ProjectCategory;
  status: ProjectStatus;
  country: string;
  region: string;
  year: string;
  client: string;
  keyMetric: {
    value: string;
    label: string;
  };
  summary: string;
  description: string;
  technicalDetails: {
    capacity?: string;
    footprint?: string;
    impact?: string;
    technologies: string[];
  };
}

export interface ProjectCategoryOption {
  key: ProjectCategory | 'TOUS';
  label: string;
}
