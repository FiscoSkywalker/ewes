'use client';

import { Suspense } from 'react';
import { SearchScreen } from '@/components/admin/private-docs/search-screen';
import { Skeleton } from '@/components/admin/ui';

export default function PrivateSearchPage() {
  // `useSearchParams` (recherche portée par l'adresse) exige une frontière Suspense.
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <SearchScreen />
    </Suspense>
  );
}
