/**
 * Chiffres clés : logique partagée par le site public (page À propos) et
 * l'aperçu du portail, pour que la bande de chiffres s'arrange de la même
 * façon que le visiteur la verra, quel que soit leur nombre (1 à 8).
 */

/** Au plus autant de chiffres que l'API en accepte (`MAX_KEY_FIGURES`). */
export const MAX_KEY_FIGURES = 8;

/** Colonnes de la grille : 2 dès `sm`, puis selon le nombre de chiffres dès `lg`. */
export function columnsFor(count: number) {
  const lg = count <= 4 ? Math.max(1, count) : count <= 6 ? 3 : 4;
  return { sm: Math.min(2, Math.max(1, count)), lg };
}

// Classes écrites en toutes lettres : Tailwind ne repère pas les noms construits.
const GRID_SM = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2' } as const;
const GRID_LG = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
} as const;
const SPAN_SM = { 1: '', 2: 'sm:col-span-2' } as const;
const SPAN_LG = {
  1: '',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
} as const;

/** Classes de la grille d'une bande de `count` chiffres. */
export function gridClass(count: number) {
  const { sm, lg } = columnsFor(count);
  return `grid grid-cols-1 ${GRID_SM[sm as 1 | 2]} ${GRID_LG[lg as 1 | 2 | 3 | 4]}`;
}

/**
 * Classes de la cellule `index` : la dernière d'une ligne incomplète occupe
 * la place restante (pas de case vide, pas de trait dans le vide).
 */
export function cellSpanClass(index: number, count: number) {
  if (index !== count - 1) return '';
  const { sm, lg } = columnsFor(count);
  const missingSm = (sm - (count % sm || sm)) as 0 | 1;
  const missingLg = lg - (count % lg || lg);
  return [
    missingSm ? SPAN_SM[2] : '',
    missingLg ? SPAN_LG[(1 + missingLg) as 2 | 3 | 4] : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Un chiffre tel qu'affiché, dans une seule langue. */
export interface LocalizedFigure {
  value: number;
  suffix: string;
  label: string;
  subtext: string;
}

/** Valeur mise en forme à la française ou à l'anglaise (« 12 000 » / « 12,000 »). */
export const formatFigureValue = (value: number, locale: string) =>
  new Intl.NumberFormat(locale).format(value);
