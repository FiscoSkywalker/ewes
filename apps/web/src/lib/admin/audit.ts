import { formatBytes } from './public-documents';
import { dayName } from '@/lib/office-hours';
import { ROLE_LABELS, isRole } from './roles';

/** Ligne du journal telle que renvoyée par `GET /admin/audit-logs`. */
export interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  /** `null` : action du système, ou compte supprimé depuis (acteur anonymisé). */
  actor: { id: string; fullName: string } | null;
  /** Nom actuel de l'élément ; `null` si le type n'est pas résolu ou sans élément. */
  entity: { label: string | null; slug: string | null; exists: boolean } | null;
  /** Bénéficiaire d'un droit d'accès. */
  subject: { id: string; fullName: string } | null;
}

/** `GET /admin/audit-logs/facets`. */
export interface AuditFacets {
  actions: { action: string; count: number }[];
  entityTypes: { entityType: string; count: number }[];
  actors: { id: string; fullName: string }[];
}

export const ACTION_LABELS: Record<string, string> = {
  ACCESS_GRANTED: 'Droit d’accès attribué',
  ACCESS_REVOKED: 'Droit d’accès révoqué',
  CONTACT_STATUS_CHANGED: 'Statut d’un message modifié',
  DOCUMENT_UPLOADED: 'Document privé téléversé',
  DOCUMENT_UPDATED: 'Document privé modifié',
  DOCUMENT_REPLACED: 'Fichier d’un document privé remplacé',
  DOCUMENT_DELETED: 'Document privé supprimé',
  DOCUMENT_DOWNLOADED: 'Document privé téléchargé',
  DOCUMENT_ARCHIVED: 'Document privé archivé',
  DOCUMENT_RESTORED: 'Document privé restauré',
  DOCUMENT_ACCESS_DENIED: 'Accès refusé à un document',
  FOLDER_ACCESS_DENIED: 'Accès refusé à un dossier',
  FOLDER_CREATED: 'Dossier créé',
  FOLDER_UPDATED: 'Dossier modifié',
  FOLDER_MOVED: 'Dossier déplacé',
  FOLDER_DELETED: 'Dossier supprimé',
  PUBLIC_DOCUMENT_PUBLISHED: 'Document public publié',
  PUBLIC_DOCUMENT_UNPUBLISHED: 'Document public dépublié',
  PUBLIC_DOCUMENT_ARCHIVED: 'Document public archivé',
  PUBLIC_DOCUMENT_DELETED: 'Document public supprimé',
  REALISATION_PUBLISHED: 'Réalisation publiée',
  REALISATION_UNPUBLISHED: 'Réalisation dépubliée',
  REALISATION_ARCHIVED: 'Réalisation archivée',
  REALISATION_DELETED: 'Réalisation supprimée',
  REALISATION_PARTNER_RENAMED: 'Partenaire renommé',
  REALISATION_PARTNER_REMOVED: 'Partenaire retiré des réalisations',
  ARTICLE_PUBLISHED: 'Article publié',
  ARTICLE_UNPUBLISHED: 'Article dépublié',
  ARTICLE_ARCHIVED: 'Article archivé',
  ARTICLE_DELETED: 'Article supprimé',
  MEDIA_UPDATED: 'Texte alternatif d’une image modifié',
  MEDIA_DELETED: 'Image supprimée de la médiathèque',
  PAGE_PUBLISHED: 'Page du site publiée',
  PAGE_UNPUBLISHED: 'Page du site dépubliée',
  SERVICE_PUBLISHED: 'Pôle publié',
  SERVICE_UNPUBLISHED: 'Pôle dépublié',
  SERVICE_OFFERING_REMOVED: 'Prestation retirée',
  EXPERT_PUBLISHED: 'Expert publié',
  EXPERT_UNPUBLISHED: 'Expert dépublié',
  EXPERT_DELETED: 'Expert supprimé',
  KEY_FIGURE_CREATED: 'Chiffre clé ajouté',
  KEY_FIGURE_UPDATED: 'Chiffre clé modifié',
  KEY_FIGURE_DELETED: 'Chiffre clé retiré',
  SETTINGS_GENERAL_UPDATED: 'Réglages du site modifiés',
  SETTINGS_MAIL_UPDATED: 'Réglages de messagerie modifiés',
  MAIL_TEST_REQUESTED: 'Test d’envoi d’e-mail',
  USER_INVITED: 'Utilisateur invité',
  USER_INVITATION_RESENT: 'Invitation renvoyée',
  USER_INVITATION_REVOKED: 'Invitation retirée',
  USER_INVITATION_ACCEPTED: 'Compte activé',
  USER_ROLE_CHANGED: 'Rôle d’un compte modifié',
  USER_DEACTIVATED: 'Compte désactivé',
  USER_REACTIVATED: 'Compte réactivé',
  AUTH_LOGIN_SUCCEEDED: 'Connexion réussie',
  AUTH_LOGIN_FAILED: 'Échec de connexion',
  AUTH_ACCOUNT_LOCKED: 'Compte verrouillé (échecs répétés)',
  USER_UNLOCKED: 'Compte déverrouillé',
  USER_PROFILE_UPDATED: 'Nom du compte modifié',
  USER_PASSWORD_CHANGED: 'Mot de passe modifié',
  AUTH_PASSWORD_CHANGE_FAILED: 'Échec de changement de mot de passe',
  USER_AVATAR_CHANGED: 'Photo de profil modifiée',
  USER_AVATAR_REMOVED: 'Photo de profil retirée',
  USER_SESSIONS_CLOSED: 'Appareils déconnectés',
  AUTH_TOKEN_REUSE_DETECTED: 'Jeton de session rejoué (session fermée)',
  RETENTION_AUDIT_ARCHIVED: 'Journal archivé (plus de 12 mois)',
  RETENTION_CONTACTS_PURGED: 'Messages de contact supprimés (24 mois)',
};

/** Libellé d'une action ; un code inconnu (action future) reste lisible. */
export function actionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const text = action.toLowerCase().replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export type AuditCategory =
  | 'security'
  | 'auth'
  | 'accounts'
  | 'rights'
  | 'private'
  | 'content'
  | 'contact'
  | 'settings';

interface CategoryDef {
  id: AuditCategory;
  label: string;
  matches: (action: string) => boolean;
}

/** Ordre de test : un refus d'accès est de la sécurité avant d'être un document. */
export const CATEGORIES: CategoryDef[] = [
  {
    id: 'security',
    label: 'Accès refusés',
    matches: (a) => a.endsWith('_DENIED'),
  },
  {
    id: 'auth',
    label: 'Connexions',
    matches: (a) => a.startsWith('AUTH_'),
  },
  { id: 'accounts', label: 'Comptes', matches: (a) => a.startsWith('USER_') },
  {
    id: 'rights',
    label: 'Droits d’accès',
    matches: (a) => a.startsWith('ACCESS_'),
  },
  {
    id: 'private',
    label: 'Documents privés',
    matches: (a) => a.startsWith('DOCUMENT_') || a.startsWith('FOLDER_'),
  },
  {
    id: 'contact',
    label: 'Messages',
    matches: (a) => a.startsWith('CONTACT_'),
  },
  {
    id: 'settings',
    label: 'Paramètres',
    matches: (a) =>
      a.startsWith('SETTINGS_') ||
      a.startsWith('MAIL_') ||
      a.startsWith('RETENTION_'),
  },
  { id: 'content', label: 'Contenus du site', matches: () => true },
];

export function categoryOf(action: string): AuditCategory {
  return CATEGORIES.find((category) => category.matches(action))!.id;
}

export type ActionTone = 'neutral' | 'ok' | 'warn' | 'bad' | 'brand';

/** Teinte d'une action : jamais seule (le libellé est toujours écrit). */
export function actionTone(action: string): ActionTone {
  if (action.endsWith('_DENIED')) return 'bad';
  if (
    action === 'AUTH_LOGIN_FAILED' ||
    action === 'AUTH_TOKEN_REUSE_DETECTED' ||
    action === 'AUTH_ACCOUNT_LOCKED' ||
    action === 'AUTH_PASSWORD_CHANGE_FAILED'
  ) {
    return 'bad';
  }
  if (action === 'AUTH_LOGIN_SUCCEEDED') return 'ok';
  if (/(_DELETED|_REVOKED|_DEACTIVATED|_REMOVED)$/.test(action)) return 'warn';
  if (
    /(_PUBLISHED|_GRANTED|_REACTIVATED|_UNLOCKED|_ACCEPTED|_RESTORED|_CREATED|_UPLOADED|_INVITED)$/.test(
      action,
    )
  ) {
    return 'ok';
  }
  return 'neutral';
}

export const ENTITY_LABELS: Record<string, string> = {
  Article: 'Article',
  Realisation: 'Réalisation',
  RealisationPartner: 'Partenaire',
  PublicDocument: 'Document public',
  PrivateDocument: 'Document privé',
  Folder: 'Dossier',
  Page: 'Page',
  Service: 'Pôle',
  ServiceOffering: 'Prestation',
  Expert: 'Expert',
  KeyFigure: 'Chiffre clé',
  Media: 'Image',
  ContactMessage: 'Message de contact',
  User: 'Compte',
  UserInvitation: 'Invitation',
  SiteSettings: 'Paramètres',
  AuditLog: 'Journal d’audit',
};

export const entityTypeLabel = (type: string) => ENTITY_LABELS[type] ?? type;

/** Écran du portail qui présente l'élément, s'il existe encore ; `null` sinon. */
export function entityHref(row: AuditRow): string | null {
  if (!row.entityId || !row.entity?.exists) return null;
  const id = row.entityId;
  switch (row.entityType) {
    case 'Article':
      return `/admin/actualites/${id}`;
    case 'Realisation':
      return `/admin/realisations/${id}`;
    case 'PublicDocument':
      return `/admin/documents-publics/${id}`;
    case 'Expert':
      return `/admin/services/experts/${id}`;
    case 'Service':
      return `/admin/services/${id}`;
    case 'Page':
      return row.entity.slug ? `/admin/pages/${row.entity.slug}` : null;
    case 'User':
      return `/admin/utilisateurs/${id}`;
    case 'ContactMessage':
      return `/admin/contacts/${id}`;
    default:
      return null;
  }
}

/**
 * Nom à afficher pour l'élément d'une ligne : son nom actuel, sinon ce que
 * les valeurs consignées en disent (un expert supprimé garde son nom dans
 * « avant »), sinon rien.
 */
export function entityName(row: AuditRow): string | null {
  if (row.entity?.label) return row.entity.label;
  for (const data of [row.beforeData, row.afterData]) {
    const name = data?.fullName ?? data?.name ?? data?.title ?? data?.slug;
    if (typeof name === 'string' && name) return name;
  }
  return null;
}

const FIELD_LABELS: Record<string, string> = {
  status: 'Statut',
  slug: 'Adresse',
  role: 'Rôle',
  email: 'E-mail',
  isActive: 'Compte actif',
  userId: 'Utilisateur',
  folderId: 'Dossier',
  name: 'Nom',
  parentId: 'Dossier parent',
  parentName: 'Nom du dossier parent',
  previousFile: 'Ancien fichier conservé',
  scope: 'Portée',
  fileType: 'Type de fichier',
  fileSizeBytes: 'Taille',
  deleted: 'Supprimé',
  fullName: 'Nom',
  altFr: 'Texte alternatif (français)',
  altEn: 'Texte alternatif (anglais)',
  method: 'Méthode',
  reason: 'Motif',
  sessionId: 'Session',
  failures: 'Échecs consécutifs',
  until: 'Verrouillé jusqu’à',
  locked: 'Verrouillé',
  phone: 'Téléphone',
  addressFr: 'Adresse (français)',
  addressEn: 'Adresse (anglais)',
  officeDays: 'Jours d’ouverture',
  opensAt: 'Ouverture',
  closesAt: 'Fermeture',
  linkedinUrl: 'LinkedIn',
  facebookUrl: 'Facebook',
  xUrl: 'X',
  youtubeUrl: 'YouTube',
  contactRecipientEmail: 'Destinataire des messages',
  contactAutoReply: 'Accusé de réception',
  recipient: 'Destinataire',
  outcome: 'Résultat',
  count: 'Nombre d’entrées',
  olderThan: 'Antérieures au',
};

const VALUE_LABELS: Record<string, Record<string, string>> = {
  status: {
    DRAFT: 'Brouillon',
    PUBLISHED: 'Publié',
    ARCHIVED: 'Archivé',
    NOUVEAU: 'Nouveau',
    TRAITE: 'Traité',
  },
  scope: { folder: 'Dossier', document: 'Document' },
  outcome: { sent: 'Envoyé', failed: 'Échec', pending: 'En attente' },
  method: {
    password: 'Mot de passe',
    invitation: 'Lien d’invitation',
  },
  reason: {
    unknown_account: 'Compte inconnu',
    inactive_account: 'Compte désactivé ou supprimé',
    wrong_password: 'Mot de passe incorrect',
  },
};

const shortId = (value: string) =>
  /^[0-9a-f]{8}-/i.test(value) ? `${value.slice(0, 8)}…` : value;

export function formatAuditValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (
    key === 'until' &&
    typeof value === 'string' &&
    !Number.isNaN(Date.parse(value))
  ) {
    return new Date(value).toLocaleString('fr');
  }
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (key === 'officeDays' && Array.isArray(value)) {
    return value.map((day) => dayName(Number(day), 'fr')).join(', ');
  }
  if (key === 'role' && isRole(value)) return ROLE_LABELS[value];
  if (key === 'fileSizeBytes' && typeof value === 'number') {
    return formatBytes(value);
  }
  if (typeof value === 'string') {
    return VALUE_LABELS[key]?.[value] ?? shortId(value);
  }
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

export interface DiffRow {
  key: string;
  label: string;
  before: string | null;
  after: string | null;
  /** Les deux côtés existent et diffèrent. */
  changed: boolean;
}

/** Valeurs avant/après alignées par champ, dans l'ordre où elles ont été consignées. */
export function diffRows(row: AuditRow): DiffRow[] {
  const before = row.beforeData ?? {};
  const after = row.afterData ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys.map((key) => {
    const b = key in before ? formatAuditValue(key, before[key]) : null;
    const a = key in after ? formatAuditValue(key, after[key]) : null;
    return {
      key,
      label: FIELD_LABELS[key] ?? key,
      before: b,
      after: a,
      changed: b !== null && a !== null && b !== a,
    };
  });
}

/** « Chrome · Windows » à partir du user-agent brut ; `null` si rien de reconnu. */
export function describeAgent(userAgent: string | null): string | null {
  if (!userAgent) return null;
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Chrome\//.test(userAgent)
          ? 'Chrome'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : null;
  const system = /Windows/.test(userAgent)
    ? 'Windows'
    : /Android/.test(userAgent)
      ? 'Android'
      : /iPhone|iPad/.test(userAgent)
        ? 'iOS'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : null;
  const parts = [browser, system].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** Jour (UTC) décalé de `days` jours, au format de l'API. */
export const dayOffset = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

/** Auteur à afficher : une tentative de connexion n'a pas d'auteur (personne n'est authentifié). */
export function actorName(row: AuditRow): string {
  if (row.actor) return row.actor.fullName;
  return row.action === 'AUTH_LOGIN_FAILED' ||
    row.action === 'AUTH_TOKEN_REUSE_DETECTED'
    ? 'Non authentifié'
    : 'Système';
}

/** Adresse saisie lors d'un échec de connexion sur un compte inconnu (sans élément à nommer). */
export function attemptedEmail(row: AuditRow): string | null {
  if (
    row.entityId ||
    (row.action !== 'AUTH_LOGIN_FAILED' && row.action !== 'AUTH_ACCOUNT_LOCKED')
  ) {
    return null;
  }
  const email = row.afterData?.email;
  return typeof email === 'string' ? email : null;
}
