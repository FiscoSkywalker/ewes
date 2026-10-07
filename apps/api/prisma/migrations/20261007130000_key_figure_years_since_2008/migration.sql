-- Le chiffre « 17 ans » de la page À propos (« De références documentées ») était repris
-- tel quel, en valeur fixe : il aurait cessé d'être juste à chaque nouvelle année. Décision
-- d'EWES : l'afficher calculé, « année courante − 2008 » (première EIES-PGEP référencée).
-- Ne touche que la ligne d'origine, encore intacte (valeur fixe 17 « ans ») : un chiffre
-- que l'équipe a déjà modifié depuis le portail n'est pas écrasé.
UPDATE "key_figures"
SET "source" = 'YEARS_SINCE', "sinceYear" = 2008, "updatedAt" = now()
WHERE "source" = 'FIXED'
  AND "value" = 17
  AND "suffixFr" = 'ans'
  AND "labelFr" = 'De références documentées';
