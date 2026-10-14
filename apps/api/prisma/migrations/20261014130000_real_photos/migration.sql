-- Les visuels générés du prototype sont remplacés par les photographies réelles
-- d'EWES (archive de l'ancien site ewes.cd) et supprimés du site : les images
-- d'actualité importées par l'amorçage pointent vers les nouveaux fichiers, avec
-- un texte alternatif qui décrit la nouvelle photo. Une image choisie depuis le
-- portail (`/uploads/...`) n'est pas touchée.
UPDATE "article_images"
SET "url" = '/assets/images/ewes-photo-enquete-communautaire.jpg',
    "altFr" = 'Enquêteur EWES en réunion d’échange avec des habitants d’une zone minière',
    "altEn" = 'EWES surveyor holding a discussion with residents of a mining area'
WHERE "url" = '/assets/images/ewes-news-rse-survey.jpg';

UPDATE "article_images"
SET "url" = '/assets/images/ewes-photo-conference.jpg',
    "altFr" = 'Intervenant lors d’une conférence sur l’environnement minier',
    "altEn" = 'Speaker at a conference on the mining environment'
WHERE "url" = '/assets/images/ewes-laboratory-cinematic.png';

UPDATE "article_images"
SET "url" = '/assets/images/ewes-photo-vulgarisation-code-minier.jpg',
    "altFr" = 'Participants à une campagne de vulgarisation du code minier',
    "altEn" = 'Participants in an awareness campaign on the mining code'
WHERE "url" = '/assets/images/ewes-environment-field.png';

