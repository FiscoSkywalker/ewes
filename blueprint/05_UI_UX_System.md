# EWES
## Design System (UI/UX)
### Version 1.0 | Statut : Draft

---

# 1. Objet

Le design system rend l'expérience visiteur, gestionnaire et administrateur cohérente, accessible et implémentable comme des composants React réutilisables, en français et en anglais.

# 2. Principes d'expérience

Direction artistique institutionnelle et technique : élégante, sobre, moderne, facile à parcourir. Hiérarchie de lecture nette (l'expertise avant la décoration). Mobile-first sur l'ensemble du site public. Navigation intuitive avec appels à l'action visibles (contact, réalisations). Cohérence visuelle avec l'univers environnement/eau/ingénierie d'EWES (palette sobre, imagerie terrain).

# 3. Fondations

| Famille de token | Standard |
|---|---|
| Couleur | Tokens sémantiques uniquement : primaire, surface, texte, succès, avertissement, danger, désactivé |
| Espacement | Échelle 4, 8, 12, 16, 24, 32, 48 |
| Rayon | 8 pour les contrôles, 12 pour les cartes, 16 pour les panneaux |
| Typographie | Échelle centralisée, hiérarchie distincte titres/corps de texte, lisible en FR et EN |
| Icônes | Icône reconnaissable accompagnée d'un libellé texte pour toute action critique |

> Note (2026-09-29) — palette du site public (`apps/web/src/app/globals.css`) : le bleu acier reste la couleur primaire (pôle Eau, sections immersives) ; chaque pôle a un accent minéral nommé — malachite (Environnement), bleu primaire (Eau), cuivre (Travaux d'ingénierie) — exposé par la variable contextuelle `--pole` (classes `pole-env|eau|ing`, utilitaires `text-pole`/`bg-pole`/`border-pole`). Surfaces : `paper`/`paper-muted` pour les sections de lecture, `night`/`night-deep` pour les sections d'impact (Formation, Contact, footer), avec variantes `*-bright` réservées aux fonds nuit. Contrastes vérifiés : ≥ 4,5:1 sur papier, ≥ 7:1 sur nuit. Chaque pôle a aussi un motif de légende cartographique (`--pattern-env|eau|ing`), jamais utilisé seul pour porter une information (toujours accompagné du nom du pôle).

# 4. Composants partagés requis

Coquille de site (header/footer/sélecteur de langue), bouton primaire/secondaire/destructif, champ de texte, champ de recherche, carte réalisation, carte actualité, filtre de portfolio, chip de statut (publié/brouillon), fil d'ariane, état vide, état d'erreur, squelette de chargement, boîte de dialogue de confirmation, notification toast, bannière hors-ligne/erreur réseau.

# 5. Règles d'état et de retour utilisateur

Chaque page à données définit ses états : chargement, vide, erreur, non autorisé. Les boutons de soumission se verrouillent pendant une requête active mais préservent le contexte du formulaire en cas d'échec. Le statut n'est jamais communiqué uniquement par la couleur (toujours un libellé texte associé).

# 6. Navigation publique

Header avec menu principal (Accueil, À propos, Nos services, Nos réalisations, Actualités & publications, Documents, Contact) et sélecteur de langue persistant. Footer avec coordonnées, liens légaux et accès à l'espace documentaire privé.

# 7. Navigation portail d'administration / espace documentaire

Interface de type dashboard : navigation latérale par module (Éditorial, Documentaire, Contacts, Utilisateurs, Tableau de bord). Priorité à la densité d'information et à l'efficacité opérationnelle plutôt qu'à la démonstration visuelle.

# 8. Accessibilité et contenu

Contraste suffisant pour une lecture confortable, texte redimensionnable, libellés en français clair pour le public EWES (RDC), pas d'abréviation non expliquée, dates et unités localisées par langue.

# 9. Critères d'acceptation

Un visiteur comprend l'offre EWES sans tutoriel. Un Gestionnaire publie un contenu sans assistance après la formation prévue. Tout état critique reste compréhensible sans dépendre uniquement de la couleur. Chaque composant réutilisable a ses variantes documentées (état par défaut, focus, désactivé, erreur).

# 10. Références

`03_User_Personas.md`, `15_Public_Site_Pages.md`, `16_Rendering_State_Strategy.md`.
