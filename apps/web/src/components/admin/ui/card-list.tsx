'use client';

import type { ReactNode } from 'react';
import { cx } from '@/lib/admin/cx';
import { Skeleton } from './skeleton';
import { ErrorState } from './state';

/**
 * Liste de cartes pour petit écran, en remplacement du tableau (qui n'y
 * tiendrait qu'en défilant de côté). Mêmes états que le tableau : chargement,
 * erreur, vide.
 */
export function CardList<T>({
  rows,
  getId,
  render,
  isLoading,
  error,
  onRetry,
  empty,
  label,
  className,
}: {
  rows: T[] | undefined;
  getId: (row: T) => string;
  render: (row: T) => ReactNode;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  empty: ReactNode;
  label: string;
  className?: string;
}) {
  if (isLoading && !rows?.length) {
    return (
      <div className={cx('space-y-3', className)} aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (error && !rows?.length) {
    return (
      <div className={cx('rounded-2xl border border-line bg-panel', className)}>
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }
  if (!rows?.length) {
    return (
      <div className={cx('rounded-2xl border border-line bg-panel', className)}>
        {empty}
      </div>
    );
  }
  return (
    <ul aria-label={label} className={cx('space-y-3', className)}>
      {rows.map((row) => (
        <li key={getId(row)}>{render(row)}</li>
      ))}
    </ul>
  );
}
