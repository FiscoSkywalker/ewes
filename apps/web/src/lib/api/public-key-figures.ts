import type { LocalizedFigure } from '@/lib/key-figures';

const API_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api/v1';

/** Durée de repli : la revalidation à la demande reste le mécanisme principal. */
const KEY_FIGURES_REVALIDATE_SECONDS = 86_400;

export const KEY_FIGURES_TAG = 'key-figures';

interface PublicKeyFigure {
  value: number;
  suffixFr: string | null;
  suffixEn: string | null;
  labelFr: string;
  labelEn: string | null;
  subtextFr: string | null;
  subtextEn: string | null;
}

/**
 * Lecture serveur des chiffres clés visibles, dans une seule langue (repli
 * explicite sur le français). Renvoie `null` si l'API est injoignable ou
 * répond une erreur : l'appelant retombe sur ses messages statiques. Une
 * liste **vide** est une réponse valable (tout est masqué) : elle ne déclenche
 * pas le repli, sinon masquer les chiffres ferait réapparaître les anciens.
 */
export async function getKeyFigures(
  locale: string,
): Promise<LocalizedFigure[] | null> {
  try {
    const res = await fetch(`${API_URL}/key-figures`, {
      next: {
        revalidate: KEY_FIGURES_REVALIDATE_SECONDS,
        // Les valeurs « missions » et « formations » suivent les réalisations publiées.
        tags: [KEY_FIGURES_TAG, 'realisations'],
      },
    });
    if (!res.ok) return null;
    const { data } = (await res.json()) as { data: PublicKeyFigure[] };
    const english = locale === 'en';
    return data.map((figure) => ({
      value: figure.value,
      suffix: ((english && figure.suffixEn) || figure.suffixFr || '').trim(),
      label: (english && figure.labelEn) || figure.labelFr,
      subtext: (english && figure.subtextEn) || figure.subtextFr || '',
    }));
  } catch {
    return null;
  }
}
