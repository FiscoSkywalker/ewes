import { cx } from '@/lib/admin/cx';

/** Bloc de chargement animé (désactivé si « réduire les animations »). Dimensions via `className`. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx('portal-skeleton block rounded-md', className)}
    />
  );
}

/** Paragraphe en chargement : la dernière ligne est plus courte. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={cx('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cx('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </span>
  );
}

/** Zone en chargement annoncée aux lecteurs d'écran. */
export function LoadingRegion({
  label = 'Chargement…',
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
