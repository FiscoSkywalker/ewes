import type {
  DocumentCategory,
  DocumentPole,
  ShowcaseDocument,
} from '@/components/public/documents-showcase';

const API_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api/v1';

/** Durée de repli : la revalidation à la demande reste le mécanisme principal. */
const DOCUMENTS_REVALIDATE_SECONDS = 3_600;

export const DOCUMENTS_TAG = 'documents';

/** Plafond de l'API par requête ; au-delà on pagine. */
const PAGE_SIZE = 100;

const CATEGORY_BY_API: Record<string, DocumentCategory> = {
  REPORT: 'report',
  GUIDE: 'guide',
  DATASHEET: 'datasheet',
  BROCHURE: 'brochure',
  CERTIFICATE: 'certificate',
};

/** Slug du service (pôle) en base -> clé de pôle du site. */
const POLE_BY_SERVICE_SLUG: Record<string, DocumentPole> = {
  environnement: 'env',
  eau: 'eau',
  ingenierie: 'ing',
};

interface PublicDocumentApi {
  slug: string;
  titleFr: string;
  titleEn: string | null;
  excerptFr: string | null;
  excerptEn: string | null;
  category: string;
  year: number | null;
  pages: number | null;
  serviceSlug: string | null;
  file: { url: string; mimeType: string; sizeBytes: number };
}

interface DocumentsPage {
  data: PublicDocumentApi[];
  meta: { page: number; limit: number; total: number };
}

async function fetchPage(page: number): Promise<DocumentsPage> {
  const res = await fetch(
    `${API_URL}/documents-publics?limit=${PAGE_SIZE}&page=${page}`,
    {
      next: { revalidate: DOCUMENTS_REVALIDATE_SECONDS, tags: [DOCUMENTS_TAG] },
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as DocumentsPage;
}

/** Tous les documents publiés (pagination suivie) ; `null` si l'API échoue. */
async function fetchAllPublished(): Promise<PublicDocumentApi[] | null> {
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

/** « 740 Ko » / « 3,2 Mo » en français, « 740 KB » / « 3.2 MB » en anglais. */
export function formatFileSize(bytes: number, locale: string) {
  const units =
    locale === 'en' ? ['B', 'KB', 'MB', 'GB'] : ['o', 'Ko', 'Mo', 'Go'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: value < 10 && unit > 1 ? 1 : 0,
  }).format(value);
  return `${formatted} ${units[unit]}`;
}

/**
 * Documents publics du site (plus récents d'abord), pilotés par l'API. Une
 * API injoignable donne une liste vide : le site affiche alors son état vide
 * plutôt que des documents qui n'existent pas.
 */
export async function getPublicDocuments(
  locale: string,
): Promise<ShowcaseDocument[]> {
  const documents = await fetchAllPublished();
  if (!documents) return [];

  const english = locale === 'en';
  return documents.flatMap((document): ShowcaseDocument[] => {
    const category = CATEGORY_BY_API[document.category];
    if (!category) return [];
    return [
      {
        id: document.slug,
        category,
        pole: document.serviceSlug
          ? (POLE_BY_SERVICE_SLUG[document.serviceSlug] ?? null)
          : null,
        year: document.year ? String(document.year) : '',
        pages: document.pages,
        size: formatFileSize(document.file.sizeBytes, locale),
        format: document.file.mimeType === 'application/pdf' ? 'PDF' : 'FILE',
        title: (english && document.titleEn) || document.titleFr,
        excerpt: (english && document.excerptEn) || document.excerptFr || '',
        fileUrl: document.file.url,
      },
    ];
  });
}
