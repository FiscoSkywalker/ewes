'use client';

import { homePathFor } from '@/lib/admin/roles';
import { ComponentCatalog } from '@/components/admin/catalog/component-catalog';
import { useSession } from '@/components/admin/session';
import { PortalNotFound } from '@/components/admin/states';

/**
 * Catalogue vivant du kit de composants (blueprint/05_UI_UX_System.md §9 :
 * variantes documentées). Outil de développement : absent en production.
 */
export default function ComponentsPage() {
  const session = useSession();
  if (process.env.NODE_ENV === 'production') {
    return <PortalNotFound homeHref={homePathFor(session.role)} />;
  }
  return <ComponentCatalog />;
}
