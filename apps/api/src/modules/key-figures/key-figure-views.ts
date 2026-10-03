import type { KeyFigure } from '@prisma/client';

/**
 * Valeur affichée : le nombre d'années écoulées depuis `sinceYear` quand il
 * est renseigné (recalculé à chaque lecture, jamais stocké), sinon la valeur
 * saisie.
 */
export function displayedValue(
  figure: Pick<KeyFigure, 'value' | 'sinceYear'>,
  now = new Date(),
) {
  return figure.sinceYear === null
    ? figure.value
    : Math.max(0, now.getFullYear() - figure.sinceYear);
}

/** Vue du portail : la ligne telle quelle, plus la valeur effectivement affichée. */
export function toAdminView(figure: KeyFigure) {
  return { ...figure, displayedValue: displayedValue(figure) };
}

/** Vue publique : ni identifiant, ni ordre, ni état de visibilité, ni année de départ. */
export function toPublicView(figure: KeyFigure) {
  return {
    value: displayedValue(figure),
    suffixFr: figure.suffixFr,
    suffixEn: figure.suffixEn,
    labelFr: figure.labelFr,
    labelEn: figure.labelEn,
    subtextFr: figure.subtextFr,
    subtextEn: figure.subtextEn,
  };
}
