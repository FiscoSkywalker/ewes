'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Inbox } from 'lucide-react';
import { cx, focusRing } from '@/lib/admin/cx';
import { Skeleton } from './skeleton';
import { EmptyState, ErrorState } from './state';

export type SortDirection = 'asc' | 'desc';
export interface SortState {
  id: string;
  direction: SortDirection;
}

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  /** Sens appliqué au premier clic (`desc` pour une date : le plus récent d'abord). */
  firstDirection?: SortDirection;
  align?: 'start' | 'end';
  /** Colonne secondaire masquée sur petit écran. */
  hideBelow?: 'sm' | 'md' | 'lg';
  /** Largeur, alignement… de la colonne (`w-40`, `whitespace-nowrap`). */
  className?: string;
}

const HIDE_BELOW = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
} as const;

export interface DataTableProps<T> {
  /** Titre accessible du tableau (lu par les lecteurs d'écran). */
  caption: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** État vide (sans données, ou aucun résultat pour les filtres). */
  empty?: ReactNode;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  /**
   * Ligne entièrement cliquable vers sa fiche : la première colonne devient
   * un lien étiré sur la ligne. Les autres éléments interactifs d'une cellule
   * doivent porter `relative z-10` pour rester cliquables.
   */
  rowHref?: (row: T) => string;
  loadingRows?: number;
  className?: string;
}

/**
 * Liste tabulaire du portail : tri par en-tête, états chargement / erreur /
 * vide intégrés (blueprint/05_UI_UX_System.md §5), colonnes secondaires
 * masquées sur mobile, défilement horizontal si nécessaire.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  isLoading = false,
  error,
  onRetry,
  empty,
  sort,
  onSortChange,
  rowHref,
  loadingRows = 5,
  className,
}: DataTableProps<T>) {
  const showError = Boolean(error) && !rows?.length;
  const showEmpty =
    !isLoading && !showError && rows !== undefined && rows.length === 0;

  function toggleSort(column: Column<T>) {
    if (!onSortChange) return;
    const direction: SortDirection =
      sort?.id === column.id
        ? sort.direction === 'asc'
          ? 'desc'
          : 'asc'
        : (column.firstDirection ?? 'asc');
    onSortChange({ id: column.id, direction });
  }

  const cellPadding = 'px-4 py-3 first:pl-5 last:pr-5';

  return (
    <div
      className={cx(
        'overflow-hidden rounded-2xl border border-line bg-panel',
        className,
      )}
    >
      <div className="portal-scroll overflow-x-auto">
        <table
          className="w-full border-collapse text-left text-[13px]"
          aria-busy={isLoading || undefined}
        >
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line bg-sunken/60">
              {columns.map((column) => {
                const active = sort?.id === column.id;
                const ariaSort = active
                  ? sort.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : undefined;
                const SortIcon = active
                  ? sort.direction === 'asc'
                    ? ArrowUp
                    : ArrowDown
                  : ChevronsUpDown;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      column.sortable ? (ariaSort ?? 'none') : undefined
                    }
                    className={cx(
                      'h-10 whitespace-nowrap px-4 text-xs font-medium text-ink-subtle first:pl-5 last:pr-5',
                      column.align === 'end' && 'text-right',
                      column.hideBelow && HIDE_BELOW[column.hideBelow],
                      column.className,
                    )}
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className={cx(
                          '-mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-1 transition-colors hover:text-ink',
                          focusRing,
                          active && 'text-ink',
                        )}
                      >
                        {column.header}
                        <SortIcon
                          size={13}
                          aria-hidden="true"
                          className={active ? 'text-brand' : 'opacity-50'}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading && !rows?.length
              ? Array.from({ length: loadingRows }, (_, i) => (
                  <tr key={i}>
                    {columns.map((column, c) => (
                      <td
                        key={column.id}
                        className={cx(
                          cellPadding,
                          column.hideBelow && HIDE_BELOW[column.hideBelow],
                        )}
                      >
                        <Skeleton
                          className={cx('h-3.5', c === 0 ? 'w-3/4' : 'w-1/2')}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              : rows?.map((row) => {
                  const href = rowHref?.(row);
                  return (
                    <tr
                      key={getRowId(row)}
                      className={cx(
                        'relative transition-colors',
                        href &&
                          'hover:bg-ink/[0.025] focus-within:bg-ink/[0.025]',
                      )}
                    >
                      {columns.map((column, index) => (
                        <td
                          key={column.id}
                          className={cx(
                            cellPadding,
                            'align-middle text-ink',
                            column.align === 'end' && 'text-right',
                            column.hideBelow && HIDE_BELOW[column.hideBelow],
                            column.className,
                          )}
                        >
                          {href && index === 0 ? (
                            <Link
                              href={href}
                              className="rounded outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-brand"
                            >
                              {column.cell(row)}
                            </Link>
                          ) : (
                            column.cell(row)
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {showError && <ErrorState error={error} onRetry={onRetry} />}
      {showEmpty &&
        (empty ?? (
          <EmptyState
            icon={Inbox}
            title="Aucun élément"
            description="Rien à afficher pour le moment."
          />
        ))}
    </div>
  );
}
