import type { ComponentProps } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

/** Pages affichées : 1 … 4 5 6 … 12 (première, dernière et voisines). */
export function pageWindow(current: number, total: number): (number | null)[] {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const list = [...pages]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  return list.flatMap((page, index) =>
    index > 0 && page - list[index - 1] > 1 ? [null, page] : [page],
  );
}

interface PaginationBase {
  page: number;
  pageCount: number;
  /** Nom de la navigation pour les lecteurs d'écran (« Pagination des actualités »). */
  label: string;
  className?: string;
}

type PaginationProps = PaginationBase &
  (
    | {
        /** Pages servies par URL (page serveur, liens indexables `rel=prev/next`). */
        hrefFor: (page: number) => ComponentProps<typeof Link>['href'];
        onPageChange?: never;
      }
    | {
        /** Pagination côté client (îlot interactif). */
        onPageChange: (page: number) => void;
        hrefFor?: never;
      }
  );

const ROUND =
  'flex h-11 w-11 items-center justify-center rounded-full border border-border text-sand transition-colors hover:border-sand outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary';
const ROUND_OFF =
  'flex h-11 w-11 items-center justify-center rounded-full border border-border text-sand opacity-30';
const NUMBER =
  'flex h-11 min-w-11 items-center justify-center rounded-full px-3 font-mono text-xs font-bold transition-colors outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary';

/**
 * Pagination des listes publiques. Sans marge extérieure (à poser par
 * l'appelant via `className`), comme tous les composants du kit. Masquée s'il n'y a qu'une page. Cibles
 * de 44 px (usage mobile, blueprint/03_User_Personas.md §2).
 */
export function Pagination({
  page,
  pageCount,
  label,
  className,
  hrefFor,
  onPageChange,
}: PaginationProps) {
  const t = useTranslations('Ui.pagination');
  if (pageCount <= 1) return null;

  function control(
    target: number,
    content: React.ReactNode,
    props: {
      className: string;
      'aria-label': string;
      'aria-current'?: 'page';
      rel?: string;
    },
  ) {
    if (hrefFor) {
      return (
        <Link href={hrefFor(target)} {...props}>
          {content}
        </Link>
      );
    }
    return (
      <button type="button" onClick={() => onPageChange?.(target)} {...props}>
        {content}
      </button>
    );
  }

  return (
    <nav
      aria-label={label}
      className={['flex items-center justify-center gap-2', className]
        .filter(Boolean)
        .join(' ')}
    >
      {page > 1 ? (
        control(page - 1, <ArrowLeft size={16} aria-hidden="true" />, {
          className: ROUND,
          'aria-label': t('previous'),
          rel: hrefFor ? 'prev' : undefined,
        })
      ) : (
        <span className={ROUND_OFF} aria-hidden="true">
          <ArrowLeft size={16} />
        </span>
      )}
      <ol className="flex items-center gap-1.5">
        {pageWindow(page, pageCount).map((number, index) =>
          number === null ? (
            <li
              key={`gap-${index}`}
              className="px-1 font-mono text-xs text-muted"
              aria-hidden="true"
            >
              …
            </li>
          ) : (
            <li key={number}>
              {control(number, String(number).padStart(2, '0'), {
                className: `${NUMBER} ${number === page ? 'bg-sand text-paper' : 'text-sand hover:bg-paper-muted'}`,
                'aria-label': t('page', { page: number }),
                'aria-current': number === page ? 'page' : undefined,
              })}
            </li>
          ),
        )}
      </ol>
      {page < pageCount ? (
        control(page + 1, <ArrowRight size={16} aria-hidden="true" />, {
          className: ROUND,
          'aria-label': t('next'),
          rel: hrefFor ? 'next' : undefined,
        })
      ) : (
        <span className={ROUND_OFF} aria-hidden="true">
          <ArrowRight size={16} />
        </span>
      )}
    </nav>
  );
}
