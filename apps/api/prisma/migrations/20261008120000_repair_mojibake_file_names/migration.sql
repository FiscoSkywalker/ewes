-- Réparation des noms de fichiers enregistrés avec un mauvais encodage : avant la correction de
-- l'upload (Multer décodait le nom en latin1 au lieu d'UTF-8), « Pôle Eau.png » était stocké
-- « PÃ´le Eau.png ». Le nom d'origine se retrouve en ré-encodant la chaîne en latin1 puis en la
-- relisant en UTF-8.
--
-- Fonction jetable, tolérante : une valeur est réécrite seulement si ce ré-encodage réussit (tous
-- les caractères tiennent en latin1 ET les octets forment de l'UTF-8 valide) et change la valeur.
-- Un nom déjà correct (« Évaluation – 2024 ») échoue à l'un de ces deux tests et reste intact.
CREATE FUNCTION pg_temp.repair_mojibake(value text) RETURNS text AS $$
BEGIN
  IF value IS NULL OR value !~ '[ÂÃÄÅâ]' THEN
    RETURN value;
  END IF;
  RETURN convert_from(convert_to(value, 'LATIN1'), 'UTF8');
EXCEPTION WHEN OTHERS THEN
  RETURN value;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE "media"
SET "originalName" = pg_temp.repair_mojibake("originalName")
WHERE pg_temp.repair_mojibake("originalName") IS DISTINCT FROM "originalName";

UPDATE "private_documents"
SET "name" = pg_temp.repair_mojibake("name")
WHERE pg_temp.repair_mojibake("name") IS DISTINCT FROM "name";
