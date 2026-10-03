import { KeyFigureSource, type KeyFigure } from '@prisma/client';

/** Nombres tirés des réalisations publiées, pour les sources calculées en direct. */
export interface LiveCounts {
  missions: number;
  trainings: number;
}

/** Un chiffre clé avec la valeur effectivement affichée sur le site. */
export type KeyFigureWithValue = KeyFigure & { displayedValue: number };

/**
 * Valeur affichée selon la source du chiffre : le nombre saisi, l'écart avec
 * l'année courante, ou un compte en direct des réalisations. Jamais stockée
 * (sauf la valeur saisie) : elle suit l'année et les publications.
 */
export function displayedValue(
  figure: Pick<KeyFigure, 'source' | 'value' | 'sinceYear'>,
  counts: LiveCounts,
  now = new Date(),
) {
  switch (figure.source) {
    case KeyFigureSource.YEARS_SINCE:
      return Math.max(
        0,
        now.getFullYear() - (figure.sinceYear ?? now.getFullYear()),
      );
    case KeyFigureSource.MISSIONS:
      return counts.missions;
    case KeyFigureSource.TRAININGS:
      return counts.trainings;
    default:
      return figure.value;
  }
}

/** Vue du portail : la ligne telle quelle, plus la valeur effectivement affichée. */
export function toAdminView(figure: KeyFigureWithValue) {
  return figure;
}

/** Vue publique : ni identifiant, ni ordre, ni source, ni année de départ, ni visibilité. */
export function toPublicView(figure: KeyFigureWithValue) {
  return {
    value: figure.displayedValue,
    suffixFr: figure.suffixFr,
    suffixEn: figure.suffixEn,
    labelFr: figure.labelFr,
    labelEn: figure.labelEn,
    subtextFr: figure.subtextFr,
    subtextEn: figure.subtextEn,
  };
}
