import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  /** Explication : pourquoi rien ne s'affiche, et quoi faire. */
  message: ReactNode;
  icon?: LucideIcon;
  /** Action pour en sortir (réinitialiser les filtres, voir ailleurs…). */
  action?: ReactNode;
  /**
   * `framed` : encadré pointillé (liste vide, aucun résultat) ;
   * `plain` : simple texte dans le flux (bloc secondaire d'une page).
   */
  variant?: 'framed' | 'plain';
  align?: 'start' | 'center';
  tone?: 'paper' | 'night';
  className?: string;
}

/**
 * État vide du site public (blueprint/05_UI_UX_System.md §4-5) : un seul
 * rendu pour « aucune actualité », « aucun résultat pour ces filtres »,
 * « aucun document disponible ». Annoncé poliment aux lecteurs d'écran
 * quand il remplace une liste filtrée.
 */
export function EmptyState({
  message,
  icon: Icon,
  action,
  variant = 'framed',
  align = 'start',
  tone = 'paper',
  className,
}: EmptyStateProps) {
  const night = tone === 'night';
  const center = align === 'center';
  return (
    <div
      role="status"
      className={[
        'flex flex-col gap-5',
        center ? 'items-center text-center' : 'items-start',
        variant === 'framed' &&
          `rounded-sheet border border-dashed p-10 sm:p-12 ${night ? 'border-on-night/25' : 'border-sand/25'}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {Icon && (
        <Icon
          size={20}
          aria-hidden="true"
          className={night ? 'text-on-night-muted' : 'text-muted'}
        />
      )}
      <p
        className={`max-w-md text-sm leading-7 ${night ? 'text-on-night-muted' : 'text-sand/72'}`}
      >
        {message}
      </p>
      {action}
    </div>
  );
}
