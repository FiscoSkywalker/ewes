import { z } from 'zod';
import type { ContentStatus } from './public-documents';
import type { PageTexts, SitePageSlug } from '@/lib/site-pages';

/** Page institutionnelle telle que renvoyée par `GET /admin/pages[/:id]`. */
export interface AdminPage {
  id: string;
  slug: string;
  titleFr: string;
  titleEn: string | null;
  contentFr: string;
  contentEn: string | null;
  metaDescriptionFr: string | null;
  metaDescriptionEn: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Longueur visée pour la description des moteurs de recherche : en dessous,
 * l'extrait paraît pauvre ; au-delà, Google le coupe.
 */
export const META_DESCRIPTION_RANGE = { min: 70, max: 160 } as const;

/** Mêmes limites que les DTO NestJS (l'API revérifie tout). */
export const pageSchema = z.object({
  titleFr: z
    .string()
    .trim()
    .min(1, 'Le titre en français est obligatoire.')
    .max(200, '200 caractères au plus.'),
  titleEn: z.string().trim().max(200, '200 caractères au plus.'),
  contentFr: z
    .string()
    .trim()
    .min(1, 'L’introduction en français est obligatoire.'),
  contentEn: z.string().trim(),
  metaDescriptionFr: z.string().trim().max(300, '300 caractères au plus.'),
  metaDescriptionEn: z.string().trim().max(300, '300 caractères au plus.'),
});

export type PageFormValues = z.infer<typeof pageSchema>;

/**
 * Valeurs de départ du formulaire : la page enregistrée, sinon les textes
 * d'origine du site (on part de ce que le visiteur lit, jamais d'une page
 * blanche). La description de référencement, elle, part vide : absente, le
 * site reprend l'introduction.
 */
export function toFormValues(
  page: AdminPage | null,
  defaults?: { fr: PageTexts; en: PageTexts },
): PageFormValues {
  if (page) {
    return {
      titleFr: page.titleFr,
      titleEn: page.titleEn ?? '',
      contentFr: page.contentFr,
      contentEn: page.contentEn ?? '',
      metaDescriptionFr: page.metaDescriptionFr ?? '',
      metaDescriptionEn: page.metaDescriptionEn ?? '',
    };
  }
  return {
    titleFr: defaults?.fr.title ?? '',
    titleEn: defaults?.en.title ?? '',
    contentFr: defaults?.fr.intro ?? '',
    contentEn: defaults?.en.intro ?? '',
    metaDescriptionFr: '',
    metaDescriptionEn: '',
  };
}

const orNull = (value: string) => (value === '' ? null : value);

/** Corps JSON : un champ facultatif vidé part en `null` (l'API l'efface, le site retombe sur le français). */
export function toPayload(values: PageFormValues) {
  return {
    titleFr: values.titleFr,
    titleEn: orNull(values.titleEn),
    contentFr: values.contentFr,
    contentEn: orNull(values.contentEn),
    metaDescriptionFr: orNull(values.metaDescriptionFr),
    metaDescriptionEn: orNull(values.metaDescriptionEn),
  };
}

/**
 * Ce que le visiteur lit pour une page du site : `default` (texte d'origine,
 * aucune page enregistrée), `draft` (enregistrée mais pas publiée : le site
 * affiche encore le texte d'origine) ou `live` (texte du portail en ligne).
 */
export type PageState = 'default' | 'draft' | 'live';

export function pageState(page: AdminPage | undefined): PageState {
  if (!page) return 'default';
  return page.status === 'PUBLISHED' ? 'live' : 'draft';
}

export const PAGE_STATE_LABELS: Record<PageState, string> = {
  default: 'Texte d’origine',
  draft: 'Brouillon',
  live: 'Personnalisée',
};

/** Enregistrements du portail rangés par slug de page du site. */
export function bySlug(pages: AdminPage[] | undefined) {
  return new Map<SitePageSlug | string, AdminPage>(
    (pages ?? []).map((page) => [page.slug, page]),
  );
}
