import { Lock, type LucideIcon } from 'lucide-react';
import { cx } from '@/lib/admin/cx';

export type BadgeTone =
  'neutral' | 'brand' | 'env' | 'ing' | 'ok' | 'warn' | 'bad';

const TONES: Record<BadgeTone, { chip: string; dot: string }> = {
  neutral: { chip: 'bg-ink/[0.06] text-ink-muted', dot: 'bg-ink-subtle' },
  brand: { chip: 'bg-brand-soft text-brand', dot: 'bg-brand' },
  env: { chip: 'bg-env-soft text-env', dot: 'bg-env' },
  ing: { chip: 'bg-ing-soft text-ing', dot: 'bg-ing' },
  ok: { chip: 'bg-ok-soft text-ok', dot: 'bg-ok' },
  warn: { chip: 'bg-warn-soft text-warn', dot: 'bg-warn' },
  bad: { chip: 'bg-bad-soft text-bad', dot: 'bg-bad' },
};

export interface BadgeProps {
  tone?: BadgeTone;
  /** Pastille de couleur devant le texte (état « vivant » : nouveau, en ligne). */
  dot?: boolean;
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
}

/** Étiquette courte. Toujours un texte : la couleur n'est jamais seule porteuse du sens. */
export function Badge({
  tone = 'neutral',
  dot = false,
  icon: Icon,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-medium',
        TONES[tone].chip,
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cx('size-1.5 rounded-full', TONES[tone].dot)}
        />
      )}
      {Icon && <Icon size={12} aria-hidden="true" />}
      {children}
    </span>
  );
}

// --- Statuts métier (valeurs de l'API) ---

interface StatusStyle {
  label: string;
  /** Accord au féminin (ex. « Publiée » pour une réalisation). */
  labelF?: string;
  tone: BadgeTone;
  dot?: boolean;
  icon?: LucideIcon;
}

const STATUSES = {
  /** `ContentStatus` : pages, services, réalisations, articles, documents publics. */
  content: {
    DRAFT: { label: 'Brouillon', tone: 'warn' },
    PUBLISHED: { label: 'Publié', labelF: 'Publiée', tone: 'ok', dot: true },
    ARCHIVED: { label: 'Archivé', labelF: 'Archivée', tone: 'neutral' },
  },
  /** `ContactMessageStatus`. */
  contact: {
    NOUVEAU: { label: 'Nouveau', tone: 'brand', dot: true },
    TRAITE: { label: 'Traité', tone: 'ok' },
  },
  /** État d'un e-mail (`GET /admin/notifications`). */
  email: {
    sent: { label: 'Envoyé', tone: 'ok' },
    pending: { label: 'En attente', tone: 'warn', dot: true },
    failed: { label: 'Échec', tone: 'bad' },
  },
  /** `ConfidentialityLevel` des dossiers et documents privés. */
  confidentiality: {
    PUBLIC_INTERNE: { label: 'Interne', tone: 'neutral' },
    RESTREINT: { label: 'Restreint', tone: 'warn', icon: Lock },
    CONFIDENTIEL: { label: 'Confidentiel', tone: 'bad', icon: Lock },
  },
  /** `DocumentLifecycleStatus` des documents privés. */
  lifecycle: {
    ACTIVE: { label: 'Actif', tone: 'ok' },
    ARCHIVED: { label: 'Archivé', tone: 'neutral' },
  },
  /** `Role` des comptes. */
  role: {
    ADMINISTRATEUR: { label: 'Administrateur', tone: 'ing' },
    GESTIONNAIRE: { label: 'Gestionnaire', tone: 'env' },
    UTILISATEUR: { label: 'Utilisateur', tone: 'brand' },
  },
} satisfies Record<string, Record<string, StatusStyle>>;

type StatusKinds = typeof STATUSES;
export type StatusKind = keyof StatusKinds;

export interface StatusChipProps<K extends StatusKind> {
  kind: K;
  value: keyof StatusKinds[K] & string;
  /** Accorde le libellé au féminin (réalisation, page, actualité…). */
  feminine?: boolean;
  className?: string;
}

/** Statut métier normalisé : même libellé et même couleur dans tout le portail. */
export function StatusChip<K extends StatusKind>({
  kind,
  value,
  feminine = false,
  className,
}: StatusChipProps<K>) {
  const style = (STATUSES[kind] as Record<string, StatusStyle>)[value];
  if (!style) return <Badge className={className}>{value}</Badge>;
  return (
    <Badge
      tone={style.tone}
      dot={style.dot}
      icon={style.icon}
      className={className}
    >
      {feminine && style.labelF ? style.labelF : style.label}
    </Badge>
  );
}
