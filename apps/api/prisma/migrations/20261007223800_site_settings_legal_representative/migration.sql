-- Représentant légal : donnée du contrat (raw/01-contrat-prestation-ewes.md). Les autres mentions
-- légales (RCCM, Id. Nat., NIF, capital, hébergeur) ne sont pas connues du projet : EWES les saisit
-- dans le portail (Paramètres > Informations légales). Sans ligne de réglages, la valeur d'origine
-- vient de site-settings.defaults.ts.
UPDATE "site_settings"
SET "legalRepresentative" = 'Arthur Kaniki Tshamala'
WHERE "legalRepresentative" IS NULL;
