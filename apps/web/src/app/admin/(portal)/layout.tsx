'use client';

import { AdminShell } from '@/components/admin/admin-shell';

/**
 * Écrans authentifiés du portail (administration + espace documentaire),
 * tous montés dans la même coquille — la page de connexion reste hors de ce
 * groupe. Rendu entièrement client (blueprint/16_Rendering_State_Strategy.md §3).
 */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
