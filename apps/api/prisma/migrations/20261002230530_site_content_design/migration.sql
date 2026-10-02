-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "metaDescriptionEn" TEXT,
ADD COLUMN     "metaDescriptionFr" TEXT;

-- AlterTable
ALTER TABLE "service_offerings" ADD COLUMN     "icon" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "imageAltEn" TEXT,
ADD COLUMN     "imageAltFr" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- Reprise de l'existant : jusqu'ici le pictogramme d'une prestation dépendait de
-- sa position dans le pôle (liste fixe côté site). On le fige en base pour que
-- réordonner les prestations ne change plus leurs pictogrammes.
UPDATE "service_offerings" AS o
SET "icon" = (
  CASE s."slug"
    WHEN 'environnement' THEN ARRAY['file-check', 'clipboard-check', 'droplets', 'trash-2', 'activity', 'wind', 'microscope', 'leaf']
    WHEN 'eau' THEN ARRAY['file-search', 'recycle', 'waves', 'filter', 'droplets', 'flask-conical', 'graduation-cap', 'factory']
    WHEN 'ingenierie' THEN ARRAY['gauge', 'building-2', 'cpu', 'zap']
  END
)[ranked."position"]
FROM "services" AS s,
  (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "serviceId" ORDER BY "sortOrder", "createdAt") AS "position"
    FROM "service_offerings"
  ) AS ranked
WHERE o."serviceId" = s."id"
  AND ranked."id" = o."id"
  AND s."slug" IN ('environnement', 'eau', 'ingenierie');
