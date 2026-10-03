-- CreateTable
CREATE TABLE "key_figures" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "sinceYear" INTEGER,
    "suffixFr" TEXT,
    "suffixEn" TEXT,
    "labelFr" TEXT NOT NULL,
    "labelEn" TEXT,
    "subtextFr" TEXT,
    "subtextEn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "key_figures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "key_figures_sortOrder_idx" ON "key_figures"("sortOrder");

-- Reprise de l'existant : les quatre chiffres affichés jusqu'ici sur la page À propos
-- (textes de apps/web/messages, espace « Metrics »), pour que le site ne change pas.
-- Insérés seulement si la table est vide (migration rejouée sur une base déjà renseignée).
INSERT INTO "key_figures" ("id", "value", "sinceYear", "suffixFr", "suffixEn", "labelFr", "labelEn", "subtextFr", "subtextEn", "sortOrder", "isVisible", "updatedAt")
SELECT * FROM (VALUES
  (gen_random_uuid()::text, 10, NULL::integer, NULL, NULL, 'Opérateurs miniers accompagnés', 'Mining operators supported', 'STL, SWANMINES, Anvil Mining Congo, COMIDE, Ruashi Mining, METALKOL, FMR Development, Kipushi Corporation, MMG et KCC', 'STL, SWANMINES, Anvil Mining Congo, COMIDE, Ruashi Mining, METALKOL, FMR Development, Kipushi Corporation, MMG and KCC', 0, true, now()),
  (gen_random_uuid()::text, 3, NULL::integer, NULL, NULL, 'Pôles d’expertise', 'Areas of expertise', 'Environnement, eau et travaux d’ingénierie', 'Environment, water and engineering works', 1, true, now()),
  (gen_random_uuid()::text, 3, NULL::integer, 'pays', 'countries', 'Partenaires internationaux', 'International partners', 'Collaboration avec des partenaires belges, français et canadiens', 'Collaboration with Belgian, French and Canadian partners', 2, true, now()),
  (gen_random_uuid()::text, 17, NULL::integer, 'ans', 'years', 'De références documentées', 'Of documented references', 'De la première EIES-PGEP référencée (2008) à l’enquête RSE de 2025', 'From the first referenced ESIA-PGEP (2008) to the 2025 CSR survey', 3, true, now())
) AS initial("id", "value", "sinceYear", "suffixFr", "suffixEn", "labelFr", "labelEn", "subtextFr", "subtextEn", "sortOrder", "isVisible", "updatedAt")
WHERE NOT EXISTS (SELECT 1 FROM "key_figures");
