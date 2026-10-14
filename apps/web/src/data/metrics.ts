/** Année de création d'EWES S.A.R.L. : le site ne présente rien d'antérieur (demande d'EWES). */
export const FOUNDING_YEAR = 2013;

export interface ImpactMetric {
  value: number;
  /** Si présent, `value` est recalculée : années écoulées depuis cette année. */
  sinceYear?: number;
  suffix: string;
  label: string;
  subtext: string;
}
