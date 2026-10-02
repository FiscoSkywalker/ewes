import { cx } from '@/lib/admin/cx';

export interface CardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Actions alignées à droite de l'en-tête (lien « Tout voir », bouton…). */
  actions?: React.ReactNode;
  /** `none` : le contenu gère ses marges (liste, tableau pleine largeur). */
  padding?: 'none' | 'md';
  className?: string;
  children: React.ReactNode;
}

/** Panneau de contenu : en-tête facultatif, bordure, rayon « panneau » (16 px). */
export function Card({
  title,
  description,
  actions,
  padding = 'md',
  className,
  children,
}: CardProps) {
  const hasHeader = title || description || actions;
  return (
    <section
      className={cx('rounded-2xl border border-line bg-panel', className)}
    >
      {hasHeader && (
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm font-semibold text-ink">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-ink-subtle">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      <div className={padding === 'md' ? 'p-5' : undefined}>{children}</div>
    </section>
  );
}
