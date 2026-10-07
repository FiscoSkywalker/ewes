import {
  CircleUserRound,
  Compass,
  FileText,
  FolderTree,
  Images,
  Inbox,
  KeyRound,
  Library,
  Newspaper,
  BriefcaseBusiness,
  Layers,
  ShieldCheck,
  Settings2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { ADMIN_ONLY, ALL_ROLES, STAFF, type Role } from './roles';
import type { NavTone } from './navigation';

/**
 * Contenu du « Guide d'utilisation » du portail (`/admin/aide`).
 *
 * Le texte vit dans le code, comme les pages légales : il est versionné, relu
 * en revue et suit les écrans qu'il décrit. Chaque rubrique, bloc et question
 * porte les rôles à qui elle s'adresse — comme le menu, c'est un confort
 * d'affichage (on ne montre pas à un Utilisateur le mode d'emploi d'un écran
 * qu'il n'a pas) : le serveur reste juge de ce que chaque rôle peut faire.
 *
 * Mise en forme minimale dans les textes : `**gras**` pour le nom d'un bouton,
 * d'un champ ou d'un écran tel qu'il apparaît à l'écran.
 *
 * Ce guide doit rester exact : toute évolution d'un écran, d'une limite ou
 * d'une règle décrite ici se répercute ici (blueprint/14_Admin_Backoffice.md §6).
 */

export type GuideBlock = { roles?: readonly Role[] } & (
  | { kind: 'steps'; title: string; steps: string[] }
  | { kind: 'list'; title: string; items: string[] }
  | { kind: 'terms'; title: string; items: { term: string; text: string }[] }
  | { kind: 'note'; tone: 'tip' | 'warn'; text: string }
  /** Les trois rôles, avec celui de la personne mis en évidence. */
  | { kind: 'roles' }
);

export interface GuideTopic {
  /** Ancre de la rubrique (`/admin/aide#<id>`). */
  id: string;
  title: string;
  /** Une phrase : à quoi sert la rubrique (carte du sommaire). */
  summary: string;
  icon: LucideIcon;
  tone: NavTone;
  roles: readonly Role[];
  /** Écran concerné, proposé en bouton « Ouvrir ». */
  screen?: { label: string; href: string };
  blocks: GuideBlock[];
  /** Mots que la personne pourrait taper sans qu'ils figurent dans le texte. */
  keywords?: string[];
}

export interface GuideQuestion {
  id: string;
  question: string;
  answer: string;
  roles: readonly Role[];
}

export const GUIDE_TOPICS: GuideTopic[] = [
  {
    id: 'premiers-pas',
    title: 'Premiers pas',
    summary: 'Se connecter, se repérer dans le portail, trouver un écran vite.',
    icon: Compass,
    tone: 'brand',
    roles: ALL_ROLES,
    keywords: ['connexion', 'identifiant', 'menu', 'recherche', 'téléphone'],
    blocks: [
      {
        kind: 'steps',
        title: 'Se connecter',
        steps: [
          'Ouvrez l’adresse du portail que vous a communiquée EWES (elle se termine par **/admin**).',
          'Saisissez votre adresse e-mail et votre mot de passe, puis validez.',
          'Après une longue inactivité, le portail vous redemande de vous connecter.',
        ],
      },
      {
        kind: 'list',
        title: 'Se repérer',
        items: [
          '**Le menu à gauche** liste les écrans auxquels votre rôle donne accès. Sur téléphone, il s’ouvre avec le bouton ☰ en haut à gauche.',
          '**Le fil d’Ariane** en haut indique où vous êtes (rubrique › écran) et permet de remonter d’un niveau.',
          '**La recherche** « Rechercher ou aller à… » (raccourci **Ctrl K**, ou **⌘ K** sur Mac) ouvre n’importe quel écran en tapant quelques lettres : « actualité », « droits », « mot de passe »…',
          '**La cloche** signale ce qui demande votre attention.',
          '**Le menu du compte** (votre photo ou vos initiales) donne accès à Mon profil, à ce guide et à la déconnexion. Le portail existe en thème clair et sombre.',
        ],
      },
      {
        kind: 'note',
        tone: 'warn',
        text: 'Après plusieurs échecs de connexion consécutifs, le compte est **verrouillé quelques minutes**, même avec le bon mot de passe. Attendez la fin du verrouillage, ou demandez à un administrateur de le lever.',
      },
      {
        kind: 'note',
        tone: 'tip',
        text: 'Une confirmation « enregistré » ou « publié » est toujours la réponse réelle du serveur : tant qu’elle n’apparaît pas, rien n’est fait. Dans les Paramètres et dans l’espace documentaire, le navigateur vous prévient si vous quittez l’écran avec des modifications non enregistrées.',
      },
    ],
  },
  {
    id: 'roles',
    title: 'Rôles et droits',
    summary:
      'Ce que votre compte peut faire, et pourquoi certains écrans manquent.',
    icon: ShieldCheck,
    tone: 'ing',
    roles: ALL_ROLES,
    keywords: [
      'administrateur',
      'gestionnaire',
      'utilisateur',
      'permissions',
      'accès',
    ],
    blocks: [
      { kind: 'roles' },
      {
        kind: 'note',
        tone: 'tip',
        text: 'Si un écran n’apparaît pas dans votre menu, c’est que votre rôle n’y donne pas accès. Masquer une entrée n’est qu’un confort : le serveur vérifie vos droits à chaque action. Pour changer de rôle, demandez à un administrateur.',
      },
    ],
  },
  {
    id: 'statuts',
    title: 'Brouillon, publié, archivé',
    summary: 'Le cycle de vie d’un contenu et ce que voient les visiteurs.',
    icon: FileText,
    tone: 'brand',
    roles: STAFF,
    keywords: [
      'publier',
      'dépublier',
      'publication',
      'programmer',
      'supprimer',
      'traduction',
      'anglais',
      'slug',
      'adresse',
    ],
    blocks: [
      {
        kind: 'terms',
        title: 'Les quatre états d’un contenu',
        items: [
          {
            term: 'Brouillon',
            text: 'Enregistré mais invisible des visiteurs. Tout nouveau contenu commence ici.',
          },
          {
            term: 'Programmé',
            text: 'Publié avec une date de parution à venir (actualités) : il apparaît sur le site à partir de cette date.',
          },
          {
            term: 'Publié',
            text: 'En ligne, visible de tous les visiteurs du site.',
          },
          {
            term: 'Archivé',
            text: 'Retiré du site mais conservé pour l’historique. Il peut être republié.',
          },
        ],
      },
      {
        kind: 'list',
        title: 'Les règles à connaître',
        items: [
          '**Publier est toujours une action volontaire** : enregistrer ne met jamais en ligne. Le panneau **Publication** de chaque fiche affiche la liste « Avant de publier » ; le bouton reste inactif tant qu’un élément obligatoire manque.',
          '**Dépublier retire le contenu du site immédiatement.** Le contenu repasse en brouillon, sans rien perdre.',
          '**Le français est obligatoire pour publier**, l’anglais non. Sans version anglaise, le site en anglais affiche le texte français ; le portail vous signale ce qui manque dans l’onglet **EN**.',
          '**L’adresse d’un contenu publié ne change plus** : ainsi, un lien déjà partagé ou référencé ne se casse jamais. Choisissez-la avec soin avant la première publication.',
          'Les **pages institutionnelles** et les **pôles** ne s’archivent ni ne se suppriment : on les dépublie, et le site retrouve alors son texte d’origine.',
          '**Supprimer** exige de recopier l’adresse du contenu pour confirmer. C’est définitif pour le portail et tracé dans le journal d’audit : en cas de doute, **archivez** plutôt.',
        ],
      },
    ],
  },
  {
    id: 'actualites',
    title: 'Publier une actualité',
    summary: 'Rédiger un article, l’illustrer, le publier ou le programmer.',
    icon: Newspaper,
    tone: 'brand',
    roles: STAFF,
    screen: { label: 'Nouvel article', href: '/admin/actualites/nouveau' },
    keywords: [
      'article',
      'news',
      'événement',
      'formation',
      'communiqué',
      'enquête',
      'publication',
      'éditeur',
      'couverture',
    ],
    blocks: [
      {
        kind: 'steps',
        title: 'Pas à pas',
        steps: [
          'Ouvrez **Actualités & publications**, puis **Nouvel article**.',
          'Saisissez le **titre** en français (obligatoire). L’onglet **EN** reçoit la version anglaise, que vous pouvez ajouter plus tard.',
          'Rédigez un **résumé** de deux ou trois phrases (il s’affiche dans les listes) et/ou le **contenu**. Au moins l’un des deux est nécessaire pour publier.',
          'Choisissez la **rubrique** (Actualité, Événement, Formation, Communiqué, Enquête ou Publication) et la **précision de la date** : au jour, au mois ou à l’année (une enquête de 2025 peut s’afficher simplement « 2025 »).',
          'Cliquez sur **Créer le brouillon** : l’article est enregistré, invisible des visiteurs, et sa fiche s’ouvre.',
          'Sur la fiche de l’article, ajoutez l’**image de couverture** (recommandée : elle illustre l’article dans les listes).',
          'Dans le panneau **Publication**, vérifiez « Avant de publier », puis **Publier sur le site**. Pour une parution à une date précise, choisissez cette date avant : le bouton devient **Programmer la parution**.',
        ],
      },
      {
        kind: 'list',
        title: 'L’éditeur de texte',
        items: [
          'Il propose volontairement peu d’options : **titre de section**, **sous-titre**, gras, italique, liste à puces, liste numérotée, citation, lien, image de la médiathèque, annuler/rétablir.',
          'Pas de couleurs, de polices ni de tailles : la mise en forme est celle du site. **Ce que vous voyez dans l’éditeur est ce que le visiteur lira.**',
          'Pour un **lien**, sélectionnez d’abord le texte. Vous pouvez viser une adresse web, une adresse e-mail ou une page du site (par exemple /contact).',
          'Pour une **image**, choisissez-la dans la médiathèque puis **décrivez-la** (texte alternatif), ou cochez « Image décorative ». C’est ce qui la rend lisible par les personnes malvoyantes.',
        ],
      },
    ],
  },
  {
    id: 'realisations',
    title: 'Publier une réalisation',
    summary: 'Présenter une mission : texte, classement, images, partenaires.',
    icon: BriefcaseBusiness,
    tone: 'ing',
    roles: STAFF,
    screen: {
      label: 'Nouvelle réalisation',
      href: '/admin/realisations/nouvelle',
    },
    keywords: [
      'projet',
      'mission',
      'portfolio',
      'vitrine',
      'galerie',
      'partenaire',
      'bailleur',
      'client',
      'références',
    ],
    blocks: [
      {
        kind: 'steps',
        title: 'Pas à pas',
        steps: [
          'Ouvrez **Réalisations**, puis **Nouvelle réalisation**.',
          'Renseignez l’**intitulé** en français, puis la **description**, les **objectifs** et les **résultats** (chaque champ existe aussi en anglais).',
          'Dans **Classement**, indiquez le pôle, l’**année de la mission** et le **type de mission**. L’année et le type sont obligatoires pour publier : ce sont les filtres du portfolio sur le site.',
          'Cliquez sur **Créer le brouillon** : la réalisation est enregistrée, invisible des visiteurs, et sa fiche s’ouvre.',
          'Sur la fiche, ajoutez la **galerie d’images** (12 au plus), les **documents associés** (20 au plus) et les **partenaires et bailleurs** (20 au plus).',
          'Dans le panneau **Publication**, vérifiez « Avant de publier », puis **Publier sur le site**.',
        ],
      },
      {
        kind: 'list',
        title: 'À savoir',
        items: [
          'La **vitrine** (réalisations mises en avant sur le site) est limitée à **6** réalisations publiées en même temps : retirez-en une pour en ajouter une autre.',
          'La fiche indique l’**avancement de la version anglaise**, pour savoir ce qu’il reste à traduire.',
          '**Ne nommez un client que si EWES a validé qu’il peut être cité.** Dans le doute, ne mentionnez pas son nom.',
          'Les filtres de la liste (statut, recherche, tri) et ses effectifs par statut vous aident à retrouver les brouillons à terminer.',
        ],
      },
    ],
  },
  {
    id: 'documents-publics',
    title: 'Publier un document public',
    summary: 'Mettre un PDF à la disposition de tous les visiteurs du site.',
    icon: Library,
    tone: 'env',
    roles: STAFF,
    screen: {
      label: 'Publier un document',
      href: '/admin/documents-publics/nouveau',
    },
    keywords: [
      'pdf',
      'rapport',
      'brochure',
      'certificat',
      'télécharger',
      'téléverser',
      'fiche technique',
    ],
    blocks: [
      {
        kind: 'note',
        tone: 'warn',
        text: 'Un document publié ici est **téléchargeable par n’importe qui**. Un document interne ou confidentiel ne se publie jamais ici : il se classe dans l’**espace documentaire privé**.',
      },
      {
        kind: 'steps',
        title: 'Pas à pas',
        steps: [
          'Ouvrez **Documents publics**, puis **Publier un document**.',
          'Déposez le fichier **PDF** (20 Mo au plus) : le portail contrôle son contenu réel, pas seulement son extension.',
          'Renseignez le **titre** et la **description** en français (et en anglais si possible), la **catégorie** et le pôle concerné.',
          'Cliquez sur **Créer le brouillon**, puis, sur la fiche, **Publier sur le site** depuis le panneau Publication.',
        ],
      },
      {
        kind: 'list',
        title: 'Ensuite',
        items: [
          '**Remplacer le PDF** par une version à jour se fait depuis la fiche, sans recréer le document.',
          'Vous pouvez **relire** le PDF depuis la fiche avant ou après publication.',
          '**Dépublier** le retire de la page Documents du site immédiatement.',
        ],
      },
    ],
  },
  {
    id: 'mediatheque',
    title: 'La médiathèque',
    summary: 'Les images utilisées par les pages, réalisations et articles.',
    icon: Images,
    tone: 'neutral',
    roles: STAFF,
    screen: { label: 'Médiathèque', href: '/admin/medias' },
    keywords: [
      'image',
      'photo',
      'visuel',
      'logo',
      'alt',
      'texte alternatif',
      'téléverser',
    ],
    blocks: [
      {
        kind: 'list',
        title: 'Ajouter et choisir des images',
        items: [
          'Formats acceptés : **JPEG, PNG et WebP**, **5 Mo au plus** par image. Le portail vérifie le contenu réel du fichier.',
          'Une image téléversée ici se réutilise partout : couverture d’article, galerie de réalisation, éditeur de texte, portrait d’expert, visuel de pôle.',
          'Donnez à chaque image un **texte alternatif** (300 caractères au plus) : une courte description de ce qu’elle montre. Il sert aux personnes malvoyantes et au référencement.',
          'Avant de supprimer une image, regardez **où elle est utilisée** : ne supprimez que les images devenues inutiles.',
        ],
      },
    ],
  },
  {
    id: 'textes-du-site',
    title: 'Textes, pôles et experts',
    summary:
      'Pages institutionnelles, chiffres clés, pôles d’expertise, équipe.',
    icon: Layers,
    tone: 'env',
    roles: STAFF,
    screen: { label: 'Pages institutionnelles', href: '/admin/pages' },
    keywords: [
      'à propos',
      'chiffres',
      'statistiques',
      'pôle',
      'prestations',
      'expert',
      'équipe',
      'portrait',
      'référencement',
      'seo',
    ],
    blocks: [
      {
        kind: 'terms',
        title: 'Ce que vous pilotez',
        items: [
          {
            term: 'Pages institutionnelles',
            text: 'Titre, introduction et description pour les moteurs de recherche des pages À propos, Nos services, Nos réalisations, Actualités, Documents et Contact. Tant qu’une page n’est pas publiée, le site affiche son texte d’origine. L’Accueil n’en fait pas partie ; les autres sections riches (valeurs, références clients…) ne se modifient pas depuis le portail.',
          },
          {
            term: 'Chiffres clés',
            text: 'La bande de chiffres de la page À propos. Un chiffre peut être une valeur fixe, ou un nombre d’années calculé depuis une année donnée (il augmente alors tout seul).',
          },
          {
            term: 'Pôles et prestations',
            text: 'Présentation et visuel de chacun des trois pôles (Environnement, Eau, Travaux d’ingénierie), et ordre de leurs prestations.',
          },
          {
            term: 'Experts',
            text: 'La galerie « Équipe & experts » : fiche FR/EN, portrait, spécialités, pôle. Un expert reste en brouillon jusqu’à sa publication.',
          },
        ],
      },
      {
        kind: 'list',
        title: 'Portrait d’un expert',
        items: [
          'Après avoir choisi la photo, **placez le repère sur le visage** (clic, toucher ou flèches du clavier) : le site cadre ensuite le portrait autour de ce point.',
          '« Rétablir le cadrage par défaut » efface le repère.',
          'Les profils d’experts présents au lancement sont **provisoires** : remplacez-les par les vrais experts avant la mise en ligne.',
        ],
      },
    ],
  },
  {
    id: 'messages',
    title: 'Messages de contact',
    summary: 'Lire et traiter les demandes envoyées par le formulaire du site.',
    icon: Inbox,
    tone: 'brand',
    roles: STAFF,
    screen: { label: 'Messages de contact', href: '/admin/contacts' },
    keywords: [
      'formulaire',
      'demande',
      'répondre',
      'e-mail',
      'boîte de réception',
      'traité',
    ],
    blocks: [
      {
        kind: 'steps',
        title: 'Traiter un message',
        steps: [
          'Ouvrez **Messages de contact** : la liste **À traiter** réunit les nouveaux messages (un nombre dans le menu indique combien attendent).',
          'Cliquez sur un message pour le lire : expéditeur, organisation, téléphone, pôle concerné.',
          'Cliquez sur **Répondre par e-mail** : votre messagerie s’ouvre avec l’adresse et un objet déjà remplis.',
          'Une fois la demande prise en charge, cliquez sur **Marquer comme traité**. Le message passe dans la liste **Traités**.',
        ],
      },
      {
        kind: 'list',
        title: 'À savoir',
        items: [
          '**Remettre à traiter** est possible depuis un message traité.',
          'Un message ne peut pas être modifié après son envoi : seul son suivi change.',
          'Chaque message reçu déclenche une notification par e-mail à l’équipe, et un accusé de réception à l’expéditeur. L’adresse de réception se règle dans **Paramètres › Messagerie** (administrateur).',
        ],
      },
    ],
  },
  {
    id: 'espace-documentaire',
    title: 'L’espace documentaire privé',
    summary: 'Retrouver, consulter, déposer et classer les documents internes.',
    icon: FolderTree,
    tone: 'brand',
    roles: ALL_ROLES,
    screen: { label: 'Dossiers & fichiers', href: '/admin/documents' },
    keywords: [
      'dossier',
      'fichier',
      'téléverser',
      'télécharger',
      'confidentialité',
      'recherche',
      'archives',
      'aperçu',
      'privé',
      'glisser',
    ],
    blocks: [
      {
        kind: 'steps',
        title: 'Retrouver et consulter un document',
        steps: [
          'Ouvrez **Dossiers & fichiers** : vous ne voyez que les dossiers auxquels un administrateur vous a donné accès. Ce n’est pas un défaut : ce qui ne vous est pas accordé n’apparaît pas.',
          'Les documents partagés avec vous un par un, hors de leur dossier, sont regroupés sous **Partagés avec vous**.',
          'Pour chercher, utilisez **Recherche** : le nom, la description, la catégorie, le projet ou le département. Affinez par état, type de fichier, catégorie ou année.',
          'Cliquez sur un document pour ouvrir sa fiche : **Télécharger**, ou **Aperçu** pour les images et les PDF (si votre navigateur sait afficher les PDF).',
          'Les documents archivés se trouvent dans **Archives**. Ils restent consultables selon vos droits.',
        ],
      },
      {
        kind: 'steps',
        roles: STAFF,
        title: 'Déposer et classer un document',
        steps: [
          'Ouvrez le dossier voulu. Vous ne pouvez déposer que dans un dossier auquel un administrateur vous a donné accès.',
          'Glissez-déposez vos fichiers dans la zone, ou utilisez le bouton de téléversement (plusieurs fichiers à la fois, avancement affiché pour chacun).',
          'Formats acceptés : **PDF, JPEG, PNG, WebP, Word, Excel et PowerPoint**, **25 Mo au plus** par fichier.',
          'Depuis la fiche du document, vous pouvez modifier son nom et sa description, ou le classer **plus strictement** que son dossier. Vous ne pouvez pas abaisser sa confidentialité en dessous de celle du dossier.',
          'Pour corriger un fichier déposé par erreur, utilisez **Remplacer le fichier** : le document garde son nom, son dossier et tous ses droits. Pour retirer un document de la vue courante, **archivez-le** (il se restaure depuis Archives).',
        ],
      },
      {
        kind: 'terms',
        title: 'Les niveaux de confidentialité',
        items: [
          {
            term: 'Interne',
            text: 'Usage courant, pour toute personne ayant accès au dossier.',
          },
          {
            term: 'Restreint',
            text: 'Diffusion limitée aux personnes concernées.',
          },
          {
            term: 'Confidentiel',
            text: 'Sensible : juridique, fiscal, ressources humaines…',
          },
        ],
      },
      {
        kind: 'list',
        title: 'Règles à connaître',
        items: [
          'Un document **hérite de la confidentialité de son dossier**. Un document marqué plus strict que son dossier n’est plus couvert par l’accès au dossier : il faut un accès accordé à ce document.',
          'Votre rôle seul ne donne **aucun accès** : chaque accès est nominatif et accordé par un administrateur.',
          '**Chaque téléchargement, chaque aperçu et chaque refus d’accès sont enregistrés** dans le journal d’audit, consultable par les administrateurs.',
          'Seuls les administrateurs créent un dossier de premier niveau, fixent la confidentialité d’un dossier, déplacent un dossier ou suppriment un document.',
        ],
      },
    ],
  },
  {
    id: 'droits-acces',
    title: 'Droits d’accès documentaires',
    summary: 'Décider qui peut ouvrir quel dossier ou quel document.',
    icon: KeyRound,
    tone: 'ing',
    roles: ADMIN_ONLY,
    screen: { label: 'Droits d’accès', href: '/admin/documents/droits' },
    keywords: [
      'permissions',
      'autoriser',
      'révoquer',
      'partager',
      'accès',
      'dossier',
      'document',
    ],
    blocks: [
      {
        kind: 'steps',
        title: 'Donner accès à un dossier',
        steps: [
          'Ouvrez **Droits d’accès › Par dossier** et choisissez le dossier dans l’arborescence (chaque dossier indique son nombre de droits directs).',
          'Cliquez sur **Donner l’accès** et choisissez les personnes concernées. Un droit est toujours **nominatif**.',
          'L’effet est **immédiat** et l’attribution est tracée dans le journal d’audit.',
        ],
      },
      {
        kind: 'steps',
        title: 'Partager un seul document',
        steps: [
          'Ouvrez **Droits d’accès › Par document**, puis **Partager un document**.',
          'Cherchez le document, puis choisissez les personnes (**Ajouter une personne** sur un document déjà partagé). Utile pour un document sorti de son contexte, ou plus confidentiel que le reste de son dossier.',
        ],
      },
      {
        kind: 'list',
        title: 'Comment les droits se combinent',
        items: [
          'Un droit sur un dossier couvre **ce dossier et tous ses sous-dossiers**.',
          'Un droit sur un sous-dossier ne donne **jamais** accès au dossier parent, qui reste invisible.',
          'Les accès hérités d’un dossier parent s’affichent mais se retirent sur ce parent.',
          'Retirer un droit demande une **confirmation** ; l’accès est coupé aussitôt.',
          '**Déplacer un dossier change qui peut le voir.** La fenêtre de confirmation annonce qui gagne et qui perd la visibilité, et avertit si la destination est moins confidentielle.',
          'Un Gestionnaire n’écrit dans un dossier que s’il a le rôle **et** un droit sur ce dossier.',
        ],
      },
    ],
  },
  {
    id: 'comptes',
    title: 'Utilisateurs et rôles',
    summary:
      'Inviter une personne, changer son rôle, désactiver ou déverrouiller un compte.',
    icon: Users,
    tone: 'brand',
    roles: ADMIN_ONLY,
    screen: { label: 'Utilisateurs & rôles', href: '/admin/utilisateurs' },
    keywords: [
      'invitation',
      'inviter',
      'compte',
      'mot de passe',
      'désactiver',
      'déverrouiller',
      'verrouillé',
      'rôle',
    ],
    blocks: [
      {
        kind: 'steps',
        title: 'Inviter une personne',
        steps: [
          'Ouvrez **Utilisateurs & rôles › Inviter**.',
          'Saisissez son nom et son adresse e-mail, puis choisissez son rôle. Le rôle proposé par défaut est le moins privilégié : élevez-le seulement si nécessaire.',
          'La personne reçoit un e-mail avec un lien valable **7 jours** ; elle y choisit elle-même son mot de passe (12 caractères au moins).',
          'Le portail affiche aussi le **lien d’activation, une seule fois** : copiez-le pour le transmettre par un autre moyen si l’e-mail n’arrive pas.',
          'Pour une invitation en attente ou expirée, utilisez **Renvoyer** (nouveau lien) ou **Retirer**.',
        ],
      },
      {
        kind: 'list',
        title: 'Gérer un compte existant',
        items: [
          '**Changer le rôle** : la fenêtre montre le rôle actuel et le nouveau, et avertit si vous rétrogradez un administrateur. Le changement s’applique aussitôt.',
          '**Désactiver** coupe l’accès à l’instant sans effacer l’historique du compte ; **Réactiver** le rétablit. Il n’existe pas de suppression définitive d’un compte.',
          '**Déverrouiller** lève un verrouillage après des échecs de connexion. Avant de le faire, jetez un œil au journal : la personne s’est-elle simplement trompée, ou quelqu’un tente-t-il de deviner son mot de passe ?',
          'Garde-fous : vous ne pouvez ni changer votre propre rôle ni vous désactiver vous-même, et le **dernier administrateur** est protégé.',
          'La fiche d’un compte rappelle ses droits documentaires et son historique.',
        ],
      },
    ],
  },
  {
    id: 'administration',
    title: 'Suivi, audit et paramètres',
    summary: 'Surveiller les e-mails, consulter le journal, régler le site.',
    icon: Settings2,
    tone: 'neutral',
    roles: ADMIN_ONLY,
    screen: { label: 'Paramètres', href: '/admin/parametres' },
    keywords: [
      'smtp',
      'e-mail',
      'journal',
      'audit',
      'coordonnées',
      'horaires',
      'réseaux sociaux',
      'mentions légales',
      'rccm',
      'nif',
      'hébergeur',
      'apd',
    ],
    blocks: [
      {
        kind: 'terms',
        title: 'Les écrans d’administration',
        items: [
          {
            term: 'Suivi des e-mails',
            text: 'Tous les e-mails envoyés par le portail (invitations, notifications, accusés de réception). Un nombre dans le menu signale les échecs ; **Rejouer** relance un envoi en échec.',
          },
          {
            term: 'Journal d’audit',
            text: 'La trace, en lecture seule et inaltérable, des actions sensibles : connexions et échecs, changements de rôle, droits, documents privés, publications. Chaque ligne indique qui, quoi, sur quoi, et le détail avant/après. Filtrez par catégorie, auteur, action ou période.',
          },
          {
            term: 'Paramètres › Général',
            text: 'Téléphone, e-mail public, adresse du siège, horaires et réseaux sociaux affichés dans le pied de page et la page Contact. Un aperçu en direct montre le résultat.',
          },
          {
            term: 'Paramètres › Messagerie',
            text: 'L’état de l’envoi des e-mails, un **e-mail de test**, le destinataire des messages de contact et l’accusé de réception. Les identifiants du serveur d’e-mail ne passent jamais par le portail.',
          },
          {
            term: 'Paramètres › Informations légales',
            text: 'Représentant légal, RCCM, Id. Nat., NIF, hébergeur et récépissé de l’APD, repris dans les pages légales du site. Une mention vide n’est pas affichée : **ne devinez jamais une information inconnue**, laissez le champ vide.',
          },
        ],
      },
      {
        kind: 'note',
        tone: 'warn',
        text: 'Les paramètres n’ont **pas de brouillon** : un enregistrement est visible sur le site aussitôt. La barre collée en bas de l’écran indique si des modifications ne sont pas encore enregistrées.',
      },
    ],
  },
  {
    id: 'profil',
    title: 'Mon profil et mon mot de passe',
    summary:
      'Votre photo, votre nom, votre mot de passe et vos appareils connectés.',
    icon: CircleUserRound,
    tone: 'brand',
    roles: ALL_ROLES,
    screen: { label: 'Mon profil', href: '/admin/profil' },
    keywords: [
      'photo',
      'avatar',
      'mot de passe',
      'sécurité',
      'appareils',
      'sessions',
      'déconnexion',
    ],
    blocks: [
      {
        kind: 'list',
        title: 'Ce que vous pouvez faire',
        items: [
          '**Photo de profil** : choisissez ou déposez une image, recadrez-la, enregistrez. Elle n’est visible que de vous et des administrateurs, jamais sur le site public.',
          '**Nom** : modifiable. L’**adresse e-mail** est votre identifiant de connexion : seul un administrateur peut la corriger.',
          '**Mot de passe** : l’ancien est redemandé, le nouveau doit compter **12 caractères au moins**. Préférez une phrase facile à retenir et difficile à deviner.',
          '**Appareils connectés** : voyez où votre compte est ouvert et fermez une session ou toutes les autres, par exemple après avoir utilisé un ordinateur partagé.',
        ],
      },
      {
        kind: 'note',
        tone: 'tip',
        text: 'Ne communiquez jamais votre mot de passe, même à un collègue ou au prestataire. Si une autre personne doit accéder au portail, demandez à un administrateur de lui créer son propre compte.',
      },
    ],
  },
];

export const GUIDE_FAQ: GuideQuestion[] = [
  {
    id: 'faq-menu',
    question:
      'Il manque un écran dans mon menu, ou je lis « Accès non autorisé ».',
    answer:
      'Votre rôle ne donne pas accès à cet écran. Les écrans d’administration sont réservés aux administrateurs ; la gestion du contenu du site, aux administrateurs et aux gestionnaires. Si vous pensez qu’un accès vous manque, demandez-le à un administrateur EWES.',
    roles: ALL_ROLES,
  },
  {
    id: 'faq-publie-invisible',
    question: 'J’ai publié, mais je ne vois rien de nouveau sur le site.',
    answer:
      'Une publication est visible tout de suite : rechargez la page du site (Ctrl F5). Si elle reste absente, vérifiez l’état affiché sur la fiche : un contenu **Programmé** n’apparaît qu’à sa date de parution, et un **Brouillon** n’est pas en ligne. Sur le site en anglais, un champ non traduit affiche le texte français.',
    roles: STAFF,
  },
  {
    id: 'faq-retirer',
    question: 'Comment retirer un contenu du site sans le perdre ?',
    answer:
      'Ouvrez sa fiche et cliquez sur **Dépublier** (il repasse en brouillon) ou sur **Archiver** (il est conservé pour l’historique). Dans les deux cas, vous pourrez le republier plus tard. Évitez **Supprimer**, qui est définitif.',
    roles: STAFF,
  },
  {
    id: 'faq-suppression',
    question: 'Puis-je annuler une suppression ?',
    answer:
      'Non, pas depuis le portail. La suppression est confirmée par une saisie, définitive et tracée dans le journal d’audit. En cas de doute, archivez : vous gardez le contenu ou le document, et vous pouvez le restaurer.',
    roles: STAFF,
  },
  {
    id: 'faq-anglais',
    question: 'Le site en anglais affiche du français.',
    answer:
      'La version anglaise de ce contenu n’est pas renseignée : le site retombe alors sur le français. Ouvrez la fiche, passez sur l’onglet **EN** des champs concernés et complétez-les.',
    roles: STAFF,
  },
  {
    id: 'faq-limites',
    question: 'Quels fichiers puis-je téléverser, et de quelle taille ?',
    answer:
      'Médiathèque et images : JPEG, PNG ou WebP, 5 Mo au plus. Documents publics : PDF, 20 Mo au plus. Espace documentaire privé : PDF, images, Word, Excel ou PowerPoint, 25 Mo au plus. Le portail contrôle le contenu réel du fichier : renommer l’extension ne suffit pas.',
    roles: STAFF,
  },
  {
    id: 'faq-doc-introuvable',
    question: 'Je ne trouve pas un document de l’espace privé.',
    answer:
      'L’espace documentaire n’affiche que ce qui vous a été accordé. Cherchez aussi dans **Partagés avec vous** et dans **Archives**. Si le document devrait être visible, demandez un accès à un administrateur en lui indiquant le dossier ou le nom du document.',
    roles: ALL_ROLES,
  },
  {
    id: 'faq-mot-de-passe',
    question: 'J’ai oublié mon mot de passe.',
    answer:
      'Le portail n’a pas encore de réinitialisation automatique du mot de passe. Prévenez un administrateur EWES. Si vous êtes connecté sur un autre appareil, vous pouvez changer votre mot de passe depuis **Mon profil**.',
    roles: ALL_ROLES,
  },
  {
    id: 'faq-verrouille',
    question: 'Mon compte est verrouillé.',
    answer:
      'Après plusieurs échecs de connexion d’affilée, le compte se verrouille quelques minutes par précaution, même avec le bon mot de passe. Le message de connexion indique la durée restante. Un administrateur peut aussi le déverrouiller immédiatement.',
    roles: ALL_ROLES,
  },
  {
    id: 'faq-droits-utilisateur',
    question: 'Une personne ne voit pas un dossier que je lui ai ouvert.',
    answer:
      'Dans **Droits d’accès › Par dossier**, vérifiez que le droit figure bien sur ce dossier (ou sur un dossier parent). Contrôlez ensuite que le document n’a pas été marqué **plus confidentiel** que son dossier : il demande alors un accès au document lui-même, depuis **Par document**.',
    roles: ADMIN_ONLY,
  },
  {
    id: 'faq-invitation',
    question: 'Une personne n’a pas reçu son e-mail d’invitation.',
    answer:
      'Regardez d’abord ses courriers indésirables, puis cliquez sur **Renvoyer** dans la liste des invitations (un nouveau lien est créé). Consultez **Suivi des e-mails** : un envoi en échec peut être rejoué, et **Paramètres › Messagerie** dit si l’envoi est bien configuré. Vous pouvez aussi transmettre le lien d’activation affiché à l’invitation.',
    roles: ADMIN_ONLY,
  },
];

// --- Sélection et recherche ---

export function topicsFor(role: Role): GuideTopic[] {
  return GUIDE_TOPICS.filter((topic) => topic.roles.includes(role)).map(
    (topic) => ({
      ...topic,
      blocks: topic.blocks.filter(
        (block) => !block.roles || block.roles.includes(role),
      ),
    }),
  );
}

export function questionsFor(role: Role): GuideQuestion[] {
  return GUIDE_FAQ.filter((question) => question.roles.includes(role));
}

/** Minuscules sans accents : « Édition » trouve « edition ». */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\*\*/g, '')
    .toLowerCase();
}

function blockText(block: GuideBlock): string {
  switch (block.kind) {
    case 'steps':
      return [block.title, ...block.steps].join(' ');
    case 'list':
      return [block.title, ...block.items].join(' ');
    case 'terms':
      return [
        block.title,
        ...block.items.map((item) => `${item.term} ${item.text}`),
      ].join(' ');
    case 'note':
      return block.text;
    case 'roles':
      return 'administrateur gestionnaire utilisateur rôles';
  }
}

function topicText(topic: GuideTopic): string {
  return fold(
    [
      topic.title,
      topic.summary,
      ...(topic.keywords ?? []),
      ...topic.blocks.map(blockText),
    ].join(' '),
  );
}

/** Tous les mots saisis doivent figurer quelque part dans la rubrique. */
export function searchTerms(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean);
}

export function topicMatches(topic: GuideTopic, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const text = topicText(topic);
  return terms.every((term) => text.includes(term));
}

export function questionMatches(
  question: GuideQuestion,
  terms: string[],
): boolean {
  if (terms.length === 0) return true;
  const text = fold(`${question.question} ${question.answer}`);
  return terms.every((term) => text.includes(term));
}
