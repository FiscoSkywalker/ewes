'use client';

import { Suspense } from 'react';
import { Explorer } from '@/components/admin/private-docs/explorer';
import { Skeleton } from '@/components/admin/ui';

export default function PrivateDocumentsPage() {
  // `useSearchParams` (dossier ouvert porté par l'adresse) exige une frontière Suspense.
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <Explorer />
    </Suspense>
  );
}
