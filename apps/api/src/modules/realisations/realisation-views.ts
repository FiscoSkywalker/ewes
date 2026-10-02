import { ContentStatus } from '@prisma/client';
import type { RealisationWithRelations } from './realisations.service.js';

/**
 * Réponse d'administration : les relations « à plat » (un document associé est
 * un objet document, pas une ligne de liaison) et sans les détails du fichier.
 */
export function toAdminView(realisation: RealisationWithRelations) {
  const { documents, ...rest } = realisation;
  return {
    ...rest,
    documents: documents.map(({ publicDocument: d }) => ({
      id: d.id,
      slug: d.slug,
      titleFr: d.titleFr,
      titleEn: d.titleEn,
      category: d.category,
      year: d.year,
      pages: d.pages,
      status: d.status,
      publishedAt: d.publishedAt,
    })),
  };
}

/**
 * Documents associés visibles par le public : seulement ceux qui sont eux-mêmes
 * publiés (un brouillon ou un archivé reste invisible), dans l'ordre choisi.
 */
export function publicDocumentsOf(
  realisation: RealisationWithRelations,
  now: Date = new Date(),
) {
  return realisation.documents
    .map(({ publicDocument }) => publicDocument)
    .filter(
      (document) =>
        document.status === ContentStatus.PUBLISHED &&
        document.publishedAt !== null &&
        document.publishedAt <= now,
    )
    .map((document) => ({
      slug: document.slug,
      titleFr: document.titleFr,
      titleEn: document.titleEn,
      category: document.category,
      year: document.year,
      pages: document.pages,
      file: {
        url: document.fileUrl,
        mimeType: document.fileType,
        sizeBytes: document.fileSizeBytes,
      },
    }));
}
