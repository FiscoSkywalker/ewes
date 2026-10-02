import type { ComponentProps, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

interface FilterChipBase {
  active: boolean;
  /** Effectif de la catégorie, affiché après le libellé. */
  count?: number;
  /** `pill` (défaut) ou `square` (registres, tableaux de références). */
  shape?: 'pill' | 'square';
  className?: string;
  children: ReactNode;
}

type FilterChipProps = FilterChipBase &
  (
    | {
        /** Filtre porté par l'URL (page serveur, lien partageable). */
        href: ComponentProps<typeof Link>['href'];
        onClick?: never;
      }
    | {
        /** Filtre appliqué côté client (îlot interactif). */
        onClick: () => void;
        href?: never;
      }
  );

/**
 * Puce de filtre des listes publiques (actualités, réalisations, documents —
 * « filtre de portfolio », blueprint/05_UI_UX_System.md §4). Lien
 * `aria-current` si le filtre est dans l'URL, bouton `aria-pressed` sinon :
 * l'état actif est annoncé, jamais porté par la seule couleur.
 */
export function FilterChip({
  active,
  count,
  shape = 'pill',
  className,
  children,
  href,
  onClick,
}: FilterChipProps) {
  const classes = [
    'inline-flex flex-none items-center gap-2 border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary',
    shape === 'pill' ? 'rounded-full' : 'px-3.5',
    active
      ? 'border-sand bg-sand text-paper'
      : 'border-sand/20 text-sand/75 hover:border-sand hover:text-sand',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {children}
      {count !== undefined && (
        <span className="font-mono text-[10px] font-normal opacity-70">
          {count}
        </span>
      )}
    </>
  );

  if (href !== undefined) {
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={classes}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={classes}
    >
      {content}
    </button>
  );
}
