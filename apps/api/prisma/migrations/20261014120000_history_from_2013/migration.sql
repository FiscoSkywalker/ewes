-- Demande d'EWES (2026-10-14) : le site ne présente l'entreprise qu'à partir de
-- 2013, année de sa création effective. Tout ce qui est antérieur est retiré.

-- 1. Réalisations commencées avant 2013 (références 2008, 2010, 2011 et 2012 de
--    l'import initial). Suppression définitive, demandée par le client ; images,
--    documents associés et partenaires suivent (ON DELETE CASCADE).
DELETE FROM "realisations" WHERE "year" < 2013;

-- 2. Chiffre clé « années » : compté depuis la création (2013) et non plus depuis
--    la première EIES-PGEP référencée (2008). Le libellé et le sous-texte d'origine
--    sont remplacés ; un texte déjà modifié depuis le portail n'est pas écrasé.
UPDATE "key_figures"
SET "sinceYear" = 2013, "updatedAt" = now()
WHERE "source" = 'YEARS_SINCE' AND "sinceYear" < 2013;

UPDATE "key_figures"
SET "labelFr" = 'D’expérience sur le terrain',
    "labelEn" = 'Of field experience',
    "updatedAt" = now()
WHERE "labelFr" = 'De références documentées';

UPDATE "key_figures"
SET "subtextFr" = 'Depuis la création d’EWES en 2013, jusqu’à l’enquête RSE de 2025',
    "subtextEn" = 'Since EWES was founded in 2013, up to the 2025 CSR survey',
    "updatedAt" = now()
WHERE "subtextFr" = 'De la première EIES-PGEP référencée (2008) à l’enquête RSE de 2025';
