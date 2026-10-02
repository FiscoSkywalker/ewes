import { getTranslations } from 'next-intl/server';
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
  year: number | null;
  yearEnd: number | null;
  projectType: string | null;
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

function toProject(item: PublicRealisation, locale: string): Project | null {
  // Le registre public exige année et type (obligatoires à la publication).
  if (item.year === null || item.projectType === null) return null;
  return {
    id: item.slug,
    category: item.projectType as ProjectCategory,
    year: item.year,
    yearEnd: item.yearEnd,
    client: item.clientName ?? '',
    mission: (locale === 'en' && item.titleEn) || item.titleFr,
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
