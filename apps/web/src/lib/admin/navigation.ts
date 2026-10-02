import {
  Archive,
  BriefcaseBusiness,
  FileSearch,
  FileText,
  FolderTree,
  Images,
  Inbox,
  KeyRound,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Library,
  MailCheck,
  Newspaper,
  ScrollText,
  Settings2,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { ADMIN_ONLY, ALL_ROLES, STAFF, type Role } from './roles';

/**
 * Architecture de l'information du portail (blueprint/14_Admin_Backoffice.md §2,
 * blueprint/05_UI_UX_System.md §7).
 *
 * Le filtrage par rôle ci-dessous est un confort d'affichage uniquement : il
 * évite de proposer une entrée inutilisable, mais n'accorde rien. Chaque
 * écran s'appuie sur une route NestJS protégée par ses propres guards RBAC
 * et droits documentaires (blueprint/10_Security.md) — masquer ou afficher un
 * lien ici ne change jamais ce que le serveur accepte.
 */

/** Couleur d'accent d'un module, alignée sur les pôles EWES. */
export type NavTone = 'brand' | 'env' | 'ing' | 'neutral';

/** Compteurs dynamiques affichés en pastille dans la navigation. */
export type NavBadge = 'contacts-new' | 'emails-failed';

export interface NavLeaf {
  id: string;
  label: string;
  href: string;
  /** Hérite du parent (élément, puis groupe) si absent. */
  roles?: readonly Role[];
  description?: string;
  /** Termes supplémentaires pour la palette de commandes. */
  keywords?: string[];
  /** Ce que l'écran permettra de faire (affiché tant qu'il est en préparation). */
  features?: string[];
  /** Action de création : proposée dans les accès rapides et la palette. */
  quickAction?: boolean;
}

export interface NavItem extends NavLeaf {
  icon: LucideIcon;
  tone?: NavTone;
  badge?: NavBadge;
  children?: NavLeaf[];
}

export interface NavGroup {
  id: string;
  label: string;
  roles: readonly Role[];
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'pilotage',
    label: 'Pilotage',
    roles: STAFF,
    items: [
      {
        id: 'dashboard',
        label: 'Tableau de bord',
        href: '/admin',
        icon: LayoutDashboard,
        description:
          'Vue d’ensemble et éléments qui demandent votre attention.',
        keywords: ['accueil', 'synthèse', 'home'],
      },
    ],
  },
  {
    id: 'site',
    label: 'Contenus du site',
    roles: STAFF,
    items: [
      {
        id: 'pages',
        label: 'Pages institutionnelles',
        href: '/admin/pages',
        icon: FileText,
        tone: 'brand',
        description:
          'Titre, introduction et description pour les moteurs de recherche de chaque page du site, en français et en anglais.',
        keywords: [
          'à propos',
          'contact',
          'textes',
          'contenu',
          'référencement',
          'seo',
        ],
        features: [
          'Modifier le titre et l’introduction FR/EN de chaque page',
          'Description pour les moteurs de recherche, avec aperçu',
          'Publier ou dépublier (le site retrouve le texte d’origine)',
        ],
      },
      {
        id: 'services',
        label: 'Pôles & services',
        href: '/admin/services',
        icon: Layers,
        tone: 'env',
        description:
          'Les trois pôles d’expertise EWES, leurs prestations et les experts associés.',
        keywords: ['prestations', 'offre', 'offering'],
        children: [
          {
            id: 'services-poles',
            label: 'Pôles et prestations',
            href: '/admin/services',
            description:
              'Environnement, Eau, Travaux d’ingénierie : présentation, visuel, prestations et publication.',
            keywords: [
              'environnement',
              'eau',
              'ingénierie',
              'pôle',
              'prestations',
            ],
            features: [
              'Présentation et visuel de chaque pôle, FR/EN',
              'Ajouter, modifier, réordonner les prestations',
              'Publier ou dépublier un pôle',
            ],
          },
          {
            id: 'services-experts',
            label: 'Experts',
            href: '/admin/services/experts',
            description: 'L’équipe d’experts présentée sur le site, par pôle.',
            keywords: ['équipe', 'consultants', 'personnel'],
            features: [
              'Fiche expert (fonction, biographie FR/EN, photo)',
              'Rattachement à un pôle',
            ],
          },
        ],
      },
      {
        id: 'realisations',
        label: 'Réalisations',
        href: '/admin/realisations',
        icon: BriefcaseBusiness,
        tone: 'ing',
        description: 'Le portfolio des missions et projets réalisés par EWES.',
        children: [
          {
            id: 'realisations-list',
            label: 'Toutes les réalisations',
            href: '/admin/realisations',
            description: 'Brouillons, publiées et archivées.',
            keywords: ['projets', 'missions', 'portfolio', 'références'],
            features: [
              'Filtrer par statut, pôle, année',
              'Publier, dépublier, archiver',
              'Historique de publication',
            ],
          },
          {
            id: 'realisations-new',
            label: 'Nouvelle réalisation',
            href: '/admin/realisations/nouvelle',
            description:
              'Créer une fiche réalisation (enregistrée en brouillon).',
            keywords: ['ajouter', 'créer', 'projet'],
            quickAction: true,
            features: [
              'Fiche FR/EN : contexte, mission, résultats',
              'Pôle, client, lieu, période',
              'Images et documents associés',
            ],
          },
          {
            id: 'realisations-partners',
            label: 'Partenaires & bailleurs',
            href: '/admin/realisations/partenaires',
            description:
              'Clients, bailleurs et partenaires cités dans les réalisations.',
            keywords: ['client', 'bailleur', 'financement'],
            features: [
              'Liste des partenaires',
              'Rattachement aux réalisations',
            ],
          },
        ],
      },
      {
        id: 'actualites',
        label: 'Actualités & publications',
        href: '/admin/actualites',
        icon: Newspaper,
        tone: 'brand',
        description:
          'Actualités, événements, formations, communiqués, enquêtes et publications.',
        children: [
          {
            id: 'actualites-list',
            label: 'Tous les articles',
            href: '/admin/actualites',
            description:
              'Brouillons, publiés et archivés, tous types confondus.',
            keywords: ['news', 'blog', 'événement', 'formation', 'communiqué'],
            features: [
              'Filtrer par type et par statut',
              'Publier, dépublier, archiver',
            ],
          },
          {
            id: 'actualites-new',
            label: 'Nouvel article',
            href: '/admin/actualites/nouveau',
            description: 'Rédiger un article (enregistré en brouillon).',
            keywords: ['ajouter', 'créer', 'rédiger'],
            quickAction: true,
            features: [
              'Texte FR/EN, type et date (année, mois ou jour)',
              'Image de couverture',
              'Prévisualisation avant publication',
            ],
          },
        ],
      },
      {
        id: 'documents-publics',
        label: 'Documents publics',
        href: '/admin/documents-publics',
        icon: Library,
        tone: 'env',
        description:
          'Rapports, guides, fiches techniques, brochures et certificats téléchargeables sur le site.',
        children: [
          {
            id: 'documents-publics-list',
            label: 'Bibliothèque',
            href: '/admin/documents-publics',
            description: 'Tous les documents publics et leur statut.',
            keywords: ['pdf', 'rapport', 'brochure', 'certificat'],
            features: [
              'Filtrer par catégorie et statut',
              'Remplacer le fichier PDF',
              'Publier, dépublier, archiver',
            ],
          },
          {
            id: 'documents-publics-new',
            label: 'Publier un document',
            href: '/admin/documents-publics/nouveau',
            description: 'Téléverser un PDF destiné au site public.',
            keywords: ['ajouter', 'téléverser', 'upload', 'pdf'],
            quickAction: true,
            features: [
              'Téléversement PDF contrôlé',
              'Titre et description FR/EN, catégorie, pôle',
            ],
          },
        ],
      },
      {
        id: 'medias',
        label: 'Médiathèque',
        href: '/admin/medias',
        icon: Images,
        tone: 'neutral',
        description:
          'Images utilisées par les pages, réalisations et articles.',
        keywords: ['images', 'photos', 'visuels', 'upload'],
        features: [
          'Téléverser et parcourir les images',
          'Voir où une image est utilisée',
          'Supprimer une image inutilisée',
        ],
      },
    ],
  },
  {
    id: 'documentaire',
    label: 'Espace documentaire',
    roles: ALL_ROLES,
    items: [
      {
        id: 'documents',
        label: 'Dossiers & fichiers',
        href: '/admin/documents',
        icon: FolderTree,
        tone: 'brand',
        description:
          'Les dossiers et documents privés auxquels vous avez accès.',
        keywords: ['privé', 'explorateur', 'arborescence', 'fichiers'],
        features: [
          'Arborescence limitée à vos droits',
          'Télécharger un document',
          'Téléverser et classer (Gestionnaire disposant du droit sur le dossier)',
        ],
      },
      {
        id: 'documents-search',
        label: 'Recherche',
        href: '/admin/documents/recherche',
        icon: FileSearch,
        tone: 'brand',
        description: 'Rechercher dans les documents de votre périmètre.',
        keywords: ['chercher', 'trouver', 'plein texte'],
        features: [
          'Recherche par nom, catégorie, projet, description',
          'Résultats limités aux documents auxquels vous avez droit',
        ],
      },
      {
        id: 'documents-archives',
        label: 'Archives',
        href: '/admin/documents/archives',
        icon: Archive,
        tone: 'neutral',
        description:
          'Documents archivés, toujours consultables selon vos droits.',
        keywords: ['historique', 'anciens'],
        features: [
          'Consulter les documents archivés',
          'Restaurer (Gestionnaire)',
        ],
      },
      {
        id: 'documents-rights',
        label: 'Droits d’accès',
        href: '/admin/documents/droits',
        icon: KeyRound,
        tone: 'ing',
        roles: ADMIN_ONLY,
        description:
          'Qui accède à quoi : droits nominatifs par dossier ou par document.',
        children: [
          {
            id: 'documents-rights-folders',
            label: 'Par dossier',
            href: '/admin/documents/droits',
            description: 'Droits sur un dossier et ses sous-dossiers.',
            keywords: ['permissions', 'accès', 'grant'],
            features: [
              'Attribuer ou révoquer un droit (avec confirmation)',
              'Effet immédiat, tracé dans le journal d’audit',
            ],
          },
          {
            id: 'documents-rights-documents',
            label: 'Par document',
            href: '/admin/documents/droits/documents',
            description: 'Droits exceptionnels sur un document isolé.',
            keywords: ['permissions', 'confidentiel'],
            features: [
              'Accès à un document plus confidentiel que son dossier',
              'Attribution et révocation tracées',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'relations',
    label: 'Relation client',
    roles: STAFF,
    items: [
      {
        id: 'contacts',
        label: 'Messages de contact',
        href: '/admin/contacts',
        icon: Inbox,
        tone: 'brand',
        badge: 'contacts-new',
        description: 'Demandes reçues par le formulaire de contact du site.',
        children: [
          {
            id: 'contacts-inbox',
            label: 'À traiter',
            href: '/admin/contacts',
            description: 'Messages reçus, non encore traités.',
            keywords: ['messages', 'demandes', 'boîte de réception', 'inbox'],
            features: [
              'Lire un message et répondre par e-mail',
              'Marquer comme traité',
            ],
          },
          {
            id: 'contacts-done',
            label: 'Traités',
            href: '/admin/contacts/traites',
            description: 'Messages déjà traités.',
            keywords: ['historique', 'archivés'],
            features: [
              'Historique des demandes traitées',
              'Rouvrir un message',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    roles: ADMIN_ONLY,
    items: [
      {
        id: 'users',
        label: 'Utilisateurs & rôles',
        href: '/admin/utilisateurs',
        icon: Users,
        tone: 'brand',
        description: 'Comptes, rôles et activation.',
        children: [
          {
            id: 'users-list',
            label: 'Tous les comptes',
            href: '/admin/utilisateurs',
            description: 'Administrateurs, gestionnaires et utilisateurs.',
            keywords: ['comptes', 'équipe', 'rôles', 'permissions'],
            features: [
              'Changer le rôle d’un compte (avec confirmation, audité)',
              'Désactiver ou supprimer un compte',
              'Voir les droits documentaires d’un utilisateur',
            ],
          },
          {
            id: 'users-new',
            label: 'Inviter un utilisateur',
            href: '/admin/utilisateurs/nouveau',
            description:
              'Créer un compte ; l’utilisateur définit son mot de passe par e-mail.',
            keywords: ['ajouter', 'créer', 'compte', 'invitation'],
            quickAction: true,
            features: [
              'Nom, e-mail, rôle',
              'E-mail de définition du mot de passe',
            ],
          },
        ],
      },
      {
        id: 'audit',
        label: 'Journal d’audit',
        href: '/admin/audit',
        icon: ScrollText,
        tone: 'ing',
        description:
          'Trace inaltérable des actions sensibles : qui, quoi, quand, avant/après.',
        keywords: ['historique', 'traçabilité', 'logs', 'sécurité'],
        features: [
          'Filtrer par utilisateur, action, élément',
          'Valeurs avant/après de chaque modification',
          'Refus d’accès aux documents privés',
        ],
      },
      {
        id: 'emails',
        label: 'Suivi des e-mails',
        href: '/admin/emails',
        icon: MailCheck,
        tone: 'neutral',
        badge: 'emails-failed',
        description:
          'État des e-mails envoyés par la plateforme ; rejouer un échec.',
        keywords: ['notifications', 'smtp', 'envois', 'échecs'],
        features: [
          'Envoyés, en attente, en échec',
          'Rejouer un envoi en échec',
        ],
      },
      {
        id: 'settings',
        label: 'Paramètres',
        href: '/admin/parametres',
        icon: Settings2,
        tone: 'neutral',
        description: 'Configuration générale de la plateforme.',
        children: [
          {
            id: 'settings-general',
            label: 'Général',
            href: '/admin/parametres',
            description:
              'Coordonnées publiques, réseaux sociaux, identité du site.',
            keywords: ['coordonnées', 'adresse', 'téléphone', 'configuration'],
            features: [
              'Adresse, téléphone, e-mail public',
              'Liens vers les réseaux sociaux',
            ],
          },
          {
            id: 'settings-mail',
            label: 'Messagerie',
            href: '/admin/parametres/messagerie',
            description:
              'État de l’envoi des e-mails et destinataires des notifications.',
            keywords: ['smtp', 'e-mail', 'notifications'],
            features: [
              'Vérifier que l’envoi d’e-mails est configuré',
              'Adresse de réception des messages de contact',
            ],
          },
        ],
      },
    ],
  },
];

/** Entrées hors barre latérale (menu utilisateur, pied de barre, palette). */
export const SECONDARY_ITEMS: NavItem[] = [
  {
    id: 'profile',
    label: 'Mon profil',
    href: '/admin/profil',
    icon: UserRound,
    roles: ALL_ROLES,
    description: 'Vos informations et la sécurité de votre compte.',
    keywords: ['compte', 'mot de passe', 'sécurité'],
    features: ['Nom et e-mail', 'Changer le mot de passe', 'Sessions actives'],
  },
  {
    id: 'help',
    label: 'Guide d’utilisation',
    href: '/admin/aide',
    icon: LifeBuoy,
    roles: ALL_ROLES,
    description: 'Le mode d’emploi du portail, écran par écran.',
    keywords: ['aide', 'documentation', 'formation', 'tutoriel'],
    features: [
      'Publier un contenu pas à pas',
      'Gérer l’espace documentaire',
      'Questions fréquentes',
    ],
  },
];

// --- Résolution d'une route ---

export interface ResolvedRoute {
  group: NavGroup | null;
  item: NavItem;
  /** Sous-entrée active, si l'élément en a. */
  leaf: NavLeaf | null;
  /** Rôles autorisés sur cette route (hérités si non précisés). */
  roles: readonly Role[];
  /** Le chemin va au-delà de l'entrée (ex. fiche détaillée `/admin/contacts/<id>`). */
  isDetail: boolean;
}

interface Candidate extends Omit<ResolvedRoute, 'isDetail'> {
  href: string;
}

function candidates(): Candidate[] {
  const list: Candidate[] = [];
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      const itemRoles = item.roles ?? group.roles;
      list.push({ group, item, leaf: null, roles: itemRoles, href: item.href });
      for (const leaf of item.children ?? []) {
        list.push({
          group,
          item,
          leaf,
          roles: leaf.roles ?? itemRoles,
          href: leaf.href,
        });
      }
    }
  }
  for (const item of SECONDARY_ITEMS) {
    list.push({
      group: null,
      item,
      leaf: null,
      roles: item.roles ?? ALL_ROLES,
      href: item.href,
    });
  }
  return list;
}

const CANDIDATES = candidates();

function matches(pathname: string, href: string): boolean {
  // `/admin` (tableau de bord) ne couvre que lui-même, sinon il couvrirait tout.
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Entrée de navigation correspondant à un chemin : la plus spécifique
 * l'emporte (`/admin/realisations/nouvelle` avant `/admin/realisations`).
 * À longueur égale, la sous-entrée prime sur son parent (même `href`).
 */
export function resolveRoute(pathname: string): ResolvedRoute | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  let best: Candidate | null = null;
  for (const candidate of CANDIDATES) {
    if (!matches(path, candidate.href)) continue;
    if (
      !best ||
      candidate.href.length > best.href.length ||
      (candidate.href.length === best.href.length &&
        candidate.leaf &&
        !best.leaf)
    ) {
      best = candidate;
    }
  }
  if (!best) return null;
  const { href, ...route } = best;
  return { ...route, isDetail: path !== href };
}

/**
 * Le rôle peut-il ouvrir cette page ? Confort d'affichage seulement (état
 * « accès non autorisé » plutôt qu'un écran vide) — le serveur reste juge.
 * Un chemin inconnu est laissé passer : il aboutira à « page introuvable ».
 */
export function canAccess(pathname: string, role: Role): boolean {
  const route = resolveRoute(pathname);
  return !route || route.roles.includes(role);
}

/** Navigation visible pour un rôle : groupes, éléments et sous-entrées filtrés. */
export function navigationFor(role: Role): NavGroup[] {
  return NAV_GROUPS.filter((group) => group.roles.includes(role))
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => (item.roles ?? group.roles).includes(role))
        .map((item) => ({
          ...item,
          children: item.children?.filter((leaf) =>
            (leaf.roles ?? item.roles ?? group.roles).includes(role),
          ),
        })),
    }))
    .filter((group) => group.items.length > 0);
}

export interface SearchEntry {
  id: string;
  label: string;
  href: string;
  section: string;
  icon: LucideIcon;
  description?: string;
  keywords: string[];
  quickAction: boolean;
}

/** Entrées de la palette de commandes (Ctrl K), déjà filtrées par rôle. */
export function searchEntriesFor(role: Role): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const group of navigationFor(role)) {
    for (const item of group.items) {
      const leaves = item.children?.length ? item.children : [item];
      for (const leaf of leaves) {
        entries.push({
          id: leaf.id,
          label: leaf.label,
          href: leaf.href,
          section: leaf === item ? group.label : item.label,
          icon: item.icon,
          description: leaf.description ?? item.description,
          keywords: [...(item.keywords ?? []), ...(leaf.keywords ?? [])],
          quickAction: Boolean(leaf.quickAction),
        });
      }
    }
  }
  for (const item of SECONDARY_ITEMS) {
    if (!(item.roles ?? ALL_ROLES).includes(role)) continue;
    entries.push({
      id: item.id,
      label: item.label,
      href: item.href,
      section: 'Compte',
      icon: item.icon,
      description: item.description,
      keywords: item.keywords ?? [],
      quickAction: false,
    });
  }
  return entries;
}
