'use client';

import { Suspense } from 'react';
import { FolderRights } from '@/components/admin/private-docs/rights/folder-rights';
import { Skeleton } from '@/components/admin/ui';

export default function FolderRightsPage() {
  // `useSearchParams` (dossier choisi porté par l'adresse) exige une frontière Suspense.
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <FolderRights />
    </Suspense>
  );
}
