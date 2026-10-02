'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx, focusRing } from '@/lib/admin/cx';
import { IconButton } from './button';

/** Numéros affichés : 1 … 4 5 6 … 12 (au plus 7 positions). */
function pageWindow(page: number, pages: number): (number | 'gap')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const start = Math.max(2, Math.min(page - 1, pages - 4));
  const end = Math.min(pages - 1, Math.max(page + 1, 5));
  return [
    1,
    ...(start > 2 ? (['gap'] as const) : []),
    ...Array.from({ length: end - start + 1 }, (_, i) => start + i),
    ...(end < pages - 1 ? (['gap'] as const) : []),
    pages,
  ];
}

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Nom des éléments au pluriel, pour « 21–40 sur 134 messages ». */
  itemLabel?: string;
  className?: string;
}

/** Pagination des listes (`meta` des réponses paginées de l'API). */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  itemLabel = 'éléments',
  className,
}: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const format = (n: number) => n.toLocaleString('fr');

  return (
    <nav
      aria-label="Pagination"
      className={cx(
        'flex flex-wrap items-center justify-between gap-3',
        className,
      )}
    >
      <p className="text-xs text-ink-subtle" aria-live="polite">
        {total === 0
          ? 'Aucun résultat'
          : `${format(from)}–${format(to)} sur ${format(total)} ${itemLabel}`}
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <IconButton
            icon={ChevronLeft}
            label="Page précédente"
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          />
          <ul className="hidden items-center gap-1 sm:flex">
            {pageWindow(page, pages).map((item, index) =>
              item === 'gap' ? (
                <li
                  key={`gap-${index}`}
                  aria-hidden="true"
                  className="w-6 text-center text-xs text-ink-subtle"
                >
                  …
                </li>
              ) : (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => onPageChange(item)}
                    aria-current={item === page ? 'page' : undefined}
                    aria-label={`Page ${item}`}
                    className={cx(
                      'h-8 min-w-8 rounded-lg px-2 text-xs font-medium tabular-nums transition-colors',
                      focusRing,
                      item === page
                        ? 'bg-brand text-on-brand'
                        : 'text-ink-muted hover:bg-ink/5 hover:text-ink',
                    )}
                  >
                    {item}
                  </button>
                </li>
              ),
            )}
          </ul>
          <span className="px-2 text-xs text-ink-muted sm:hidden">
            Page {page} / {pages}
          </span>
          <IconButton
            icon={ChevronRight}
            label="Page suivante"
            variant="secondary"
            size="sm"
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
          />
        </div>
      )}
    </nav>
  );
}
