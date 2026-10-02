import type { Paginated } from '@/lib/api/backend';

/** Contenu qui affiche une image (renvoyé par `GET /admin/media`). */
export interface MediaUsage {
  type: 'ARTICLE' | 'REALISATION';
  id: string;
  title: string;
}

export interface MediaItem {
  id: string;
  /** Adresse publique relative (`/uploads/<nom>`), servie par l'API. */
  url: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string | null;
  createdAt: string;
  uploadedByName: string | null;
  usages: MediaUsage[];
}

/** `meta.usage` : effectifs hors filtre d'usage (recherche comprise), pour les onglets. */
export type MediaPage = Paginated<MediaItem> & {
  meta: { usage: { all: number; used: number; unused: number } };
};

export type MediaUsageFilter = 'all' | 'used' | 'unused';

export type MediaSortKey =
  'newest' | 'oldest' | 'nameAsc' | 'nameDesc' | 'largest' | 'smallest';

/** Choix de tri de l'écran → paramètres `sort` / `order` de l'API. */
export const MEDIA_SORTS: Record<
  MediaSortKey,
  { label: string; sort: string; order: 'asc' | 'desc' }
> = {
  newest: { label: 'Plus récentes', sort: 'createdAt', order: 'desc' },
  oldest: { label: 'Plus anciennes', sort: 'createdAt', order: 'asc' },
  nameAsc: { label: 'Nom (A → Z)', sort: 'originalName', order: 'asc' },
  nameDesc: { label: 'Nom (Z → A)', sort: 'originalName', order: 'desc' },
  largest: { label: 'Plus lourdes', sort: 'sizeBytes', order: 'desc' },
  smallest: { label: 'Plus légères', sort: 'sizeBytes', order: 'asc' },
};

export const USAGE_TYPE_LABELS: Record<MediaUsage['type'], string> = {
  ARTICLE: 'Article',
  REALISATION: 'Réalisation',
};

/** Écran d'édition du contenu qui utilise l'image. */
export const usageHref = (usage: MediaUsage) =>
  usage.type === 'ARTICLE'
    ? `/admin/actualites/${usage.id}`
    : `/admin/realisations/${usage.id}`;

/** Nom affichable : le nom d'origine, s'il a été conservé. */
export const mediaName = (media: Pick<MediaItem, 'originalName'>) =>
  media.originalName?.trim() || 'Image sans nom';

const FORMAT_LABELS: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
};

export const formatLabel = (mimeType: string) =>
  FORMAT_LABELS[mimeType] ?? mimeType;

/** Types d'images acceptés par la médiathèque, et plafond (`MAX_IMAGE_BYTES`, 5 Mo). */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(',');
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Contrôle de l'image choisie, avant tout envoi ; `null` si acceptable. */
export function imageProblem(file: File): string | null {
  if (file.size === 0) return 'Ce fichier est vide.';
  if (file.size > MAX_IMAGE_BYTES)
    return 'Image trop volumineuse : 5 Mo au plus.';
  return IMAGE_TYPES.includes(file.type)
    ? null
    : 'Formats acceptés : JPEG, PNG ou WebP.';
}

/** Adresse complète d'une image, à coller dans un message ou un autre outil. */
export const absoluteUrl = (url: string) =>
  new URL(url, window.location.origin).toString();
