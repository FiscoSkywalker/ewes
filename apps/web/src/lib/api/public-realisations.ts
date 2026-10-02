import { getTranslations } from 'next-intl/server';
import { formatFileSize } from '@/lib/api/public-documents';
import type { Project, ProjectCategory } from '@/data/projects';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** Durée de repli : la revalidation à la demande reste le mécanisme principal. */
const REALISATIONS_REVALIDATE_SECONDS = 3_600;

export const REALISATIONS_TAG = 'realisations';

/** Plafond de l'API par requête ; au-delà on pagine. */
const PAGE_SIZE = 100;

interface PublicRealisation {
  slug: string;
  titleFr: string;
  titleEn: string | null;
  clientName: string | null;
  location?: string | null;
  year: number | null;
  yearEnd: number | null;
  projectType: string | null;
  descriptionFr?: string | null;
  descriptionEn?: string | null;
  objectivesFr?: string | null;
  objectivesEn?: string | null;
  resultsFr?: string | null;
  resultsEn?: string | null;
  /** Absents d'une réponse mise en cache avant l'arrivée des partenaires et des documents. */
  partners?: string[];
  documents?: PublicRealisationDocument[];
  /** Absent d'une réponse mise en cache avant l'arrivée des images. */
  images?: { url: string; altFr: string | null; altEn: string | null }[];
}

interface PublicRealisationDocument {
  slug: string;
  titleFr: string;
  titleEn: string | null;
  year: number | null;
  pages: number | null;
  file: { url: string; mimeType: string; sizeBytes: number };
}

interface RealisationsPage {
  data: PublicRealisation[];
  meta: { page: number; limit: number; total: number };
}

async function fetchPage(page: number): Promise<RealisationsPage> {
  const res = await fetch(
    `${API_URL}/realisations?limit=${PAGE_SIZE}&page=${page}`,
    {
      next: {
        revalidate: REALISATIONS_REVALIDATE_SECONDS,
        tags: [REALISATIONS_TAG],
      },
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as RealisationsPage;
}

/** Toutes les réalisations publiées, en suivant la pagination ; `null` si l'API échoue. */
async function fetchAllPublished(): Promise<PublicRealisation[] | null> {
  try {
    const first = await fetchPage(1);
    const all = [...first.data];
    const pages = Math.ceil(first.meta.total / PAGE_SIZE);
    for (let page = 2; page <= pages; page++) {
      all.push(...(await fetchPage(page)).data);
    }
    return all;
  } catch {
    return null;
  }
}

/** Texte de la langue demandée, repli sur le français. */
const pick = (
  fr: string | null | undefined,
  en: string | null | undefined,
  locale: string,
) => ((locale === 'en' && en?.trim()) || fr?.trim() || '') as string;

/** Un paragraphe par bloc séparé d'une ligne vide (convention de saisie du portail). */
const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

/** Premier paragraphe, coupé proprement : résumé affiché dans la fiche de lecture. */
function summaryOf(text: string): string | undefined {
  const [first] = paragraphs(text);
  if (!first) return undefined;
  if (first.length <= 280) return first;
  return `${first.slice(0, 280).replace(/\s+\S*$/, '')}…`;
}

function toProject(item: PublicRealisation, locale: string): Project | null {
  // Le registre public exige année et type (obligatoires à la publication).
  if (item.year === null || item.projectType === null) return null;
  const mission = (locale === 'en' && item.titleEn) || item.titleFr;
  // La première image de la galerie est l'image principale ; sans image, couverture générée.
  const [main] = item.images ?? [];
  return {
    id: item.slug,
    category: item.projectType as ProjectCategory,
    year: item.year,
    yearEnd: item.yearEnd,
    client: item.clientName ?? '',
    mission,
    slug: item.slug,
    ...(item.location && { location: item.location }),
    ...(summaryOf(pick(item.descriptionFr, item.descriptionEn, locale)) && {
      summary: summaryOf(pick(item.descriptionFr, item.descriptionEn, locale)),
    }),
    ...(main && {
      image: main.url,
      imageAlt: (locale === 'en' && main.altEn) || main.altFr || mission,
    }),
  };
}

/**
 * Références affichées sur le site (Accueil, /realisations), pilotées par
 * l'API. Repli sur les messages statiques si l'API est injoignable ou ne
 * renvoie rien : le site public ne doit jamais s'afficher vide ni casser.
 */
export async function getProjects(locale: string): Promise<Project[]> {
  const published = await fetchAllPublished();
  const projects = (published ?? [])
    .map((item) => toProject(item, locale))
    .filter((project): project is Project => project !== null);
  if (projects.length > 0) return projects;

  const t = await getTranslations({ locale, namespace: 'Projects' });
  return t.raw('items') as Project[];
}

/** Fiche détaillée d'une réalisation, prête à afficher dans la langue demandée. */
export interface ProjectDetail {
  /** Même forme que le registre : la couverture, la période et le type s'en déduisent. */
  project: Project;
  description: string[];
  objectives: string[];
  results: string[];
  partners: string[];
  /** Toutes les images de la galerie (la première est l'image principale). */
  gallery: { url: string; alt: string }[];
  documents: {
    slug: string;
    title: string;
    year: number | null;
    pages: number | null;
    size: string;
    url: string;
    format: string;
  }[];
}

/**
 * Slugs des fiches publiées : alimente `generateStaticParams`. Une API
 * injoignable donne une liste vide — les fiches se génèrent alors à la première
 * visite plutôt que de faire échouer la construction du site.
 */
export async function getRealisationSlugs(): Promise<string[]> {
  const published = await fetchAllPublished();
  return (published ?? [])
    .filter((item) => item.year !== null && item.projectType !== null)
    .map((item) => item.slug);
}

/**
 * Une réalisation publiée, par slug. `null` si elle n'existe pas (ou plus :
 * brouillon, archivée, supprimée) ; une panne de l'API lève une erreur, pour
 * qu'une indisponibilité passagère ne soit jamais mise en cache comme un 404.
 */
export async function getRealisation(
  slug: string,
  locale: string,
): Promise<ProjectDetail | null> {
  const res = await fetch(
    `${API_URL}/realisations/${encodeURIComponent(slug)}`,
    {
      next: {
        revalidate: REALISATIONS_REVALIDATE_SECONDS,
        tags: [REALISATIONS_TAG, `realisation:${slug}`],
      },
    },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const item = (await res.json()) as PublicRealisation & {
    images?: { url: string; altFr: string | null; altEn: string | null }[];
  };

  const project = toProject(item, locale);
  if (!project) return null;
  return {
    project,
    description: paragraphs(
      pick(item.descriptionFr, item.descriptionEn, locale),
    ),
    objectives: paragraphs(pick(item.objectivesFr, item.objectivesEn, locale)),
    results: paragraphs(pick(item.resultsFr, item.resultsEn, locale)),
    partners: item.partners ?? [],
    gallery: (item.images ?? []).map((image) => ({
      url: image.url,
      alt: pick(image.altFr, image.altEn, locale) || project.mission,
    })),
    documents: (item.documents ?? []).map((document) => ({
      slug: document.slug,
      title: pick(document.titleFr, document.titleEn, locale),
      year: document.year,
      pages: document.pages,
      size: formatFileSize(document.file.sizeBytes, locale),
      url: document.file.url,
      format: document.file.mimeType === 'application/pdf' ? 'PDF' : 'FILE',
    })),
  };
}

/** Autres missions du même type (les plus récentes), pour prolonger la lecture. */
export async function getRelatedProjects(
  slug: string,
  category: Project['category'],
  locale: string,
  limit = 3,
): Promise<Project[]> {
  const published = await fetchAllPublished();
  return (published ?? [])
    .filter((item) => item.slug !== slug && item.projectType === category)
    .map((item) => toProject(item, locale))
    .filter((project): project is Project => project !== null)
    .sort(
      (a, b) =>
        (b.yearEnd ?? b.year) - (a.yearEnd ?? a.year) || b.year - a.year,
    )
    .slice(0, limit);
}
