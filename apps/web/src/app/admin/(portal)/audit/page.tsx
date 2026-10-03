'use client';

import { Suspense } from 'react';
import { AuditJournal } from '@/components/admin/audit/audit-journal';
import { LoadingRegion, Skeleton } from '@/components/admin/ui';

/** `/admin/audit` : le journal d'audit (Administrateur). */
export default function AuditPage() {
  // `useSearchParams` (filtres de départ transmis par un lien) exige une frontière Suspense.
  return (
    <Suspense
      fallback={
        <LoadingRegion>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-6 h-96 rounded-2xl" />
        </LoadingRegion>
      }
    >
      <AuditJournal />
    </Suspense>
  );
}
