'use client';

import { Suspense } from 'react';
import { DocumentRights } from '@/components/admin/private-docs/rights/document-rights';
import { Skeleton } from '@/components/admin/ui';

export default function DocumentRightsPage() {
  // `useSearchParams` (document désigné par un lien) exige une frontière Suspense.
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <DocumentRights />
    </Suspense>
  );
}
