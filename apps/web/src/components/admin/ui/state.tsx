'use client';

import {
  CloudOff,
  Inbox,
  RefreshCw,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { ApiError, describeError } from '@/lib/api/backend';
import { cx } from '@/lib/admin/cx';
import { Button } from './button';

type StateTone = 'neutral' | 'brand' | 'bad';

const TILE: Record<StateTone, string> = {
  neutral: 'bg-sunken text-ink-subtle',
  brand: 'bg-brand-soft text-brand',
  bad: 'bg-bad-soft text-bad',
};

export interface EmptyStateProps {
  icon?: LucideIcon;
  tone?: StateTone;
  title: string;
  description?: React.ReactNode;
  /** Action pour sortir de l'état vide (créer, effacer les filtres…). */
  action?: React.ReactNode;
  /** `compact` : dans une carte ou un tableau ; `page` : écran entier. */
  size?: 'compact' | 'page';
  /** Titre de niveau 1 (état qui remplace tout l'écran). */
  asPageTitle?: boolean;
  className?: string;
}

/**
 * État sans contenu (blueprint/05_UI_UX_System.md §5) : toujours une
 * explication et, si possible, l'action qui permet d'en sortir.
 */
export function EmptyState({
  icon: Icon = Inbox,
  tone = 'neutral',
  title,
  description,
  action,
  size = 'compact',
  asPageTitle = false,
  className,
}: EmptyStateProps) {
  const Heading = asPageTitle ? 'h1' : 'h3';
  const page = size === 'page';
  return (
    <div
      className={cx(
        'mx-auto flex max-w-md flex-col items-center text-center',
        page ? 'animate-rise-in px-6 py-20' : 'px-6 py-12',
        className,
      )}
    >
      <span
        className={cx(
          'grid place-items-center',
          page ? 'size-16 rounded-2xl' : 'size-12 rounded-xl',
          TILE[tone],
        )}
      >
        <Icon size={page ? 28 : 22} aria-hidden="true" />
      </span>
      <Heading
        className={cx(
          'font-semibold tracking-tight text-ink',
          page ? 'mt-6 text-xl' : 'mt-4 text-sm',
        )}
      >
        {title}
      </Heading>
      {description && (
        <div
          className={cx(
            'leading-relaxed text-ink-muted',
            page ? 'mt-2 text-sm' : 'mt-1 text-xs',
          )}
        >
          {description}
        </div>
      )}
      {action && <div className={page ? 'mt-6' : 'mt-4'}>{action}</div>}
    </div>
  );
}

export interface ErrorStateProps {
  /** Erreur levée (de préférence une `ApiError`) : le message en est déduit. */
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  size?: 'compact' | 'page';
  className?: string;
}

/**
 * État d'erreur de chargement : message compréhensible, nouvelle tentative
 * si elle a un sens, et référence de la requête pour le support.
 */
export function ErrorState({
  error,
  onRetry,
  retrying = false,
  size = 'compact',
  className,
}: ErrorStateProps) {
  const info = describeError(error);
  const network = error instanceof ApiError && error.status === 0;
  return (
    <div role="alert" className={className}>
      <EmptyState
        icon={network ? CloudOff : TriangleAlert}
        tone="bad"
        size={size}
        title={info.title}
        description={
          <>
            {info.message}
            {info.requestId && (
              <span className="mt-2 block font-mono text-[11px] text-ink-subtle">
                Référence : {info.requestId}
              </span>
            )}
          </>
        }
        action={
          onRetry && info.retryable ? (
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              loading={retrying}
              onClick={onRetry}
            >
              Réessayer
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
