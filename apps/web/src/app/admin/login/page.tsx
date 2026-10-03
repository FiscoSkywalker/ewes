import type { Metadata } from 'next';
import { AuthShell } from '@/components/admin/auth/auth-shell';
import { safeAdminRedirect } from '@/lib/auth/safe-redirect';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Connexion | Portail EWES',
  // Page privée : ne pas l'indexer.
  robots: { index: false, follow: false },
};

/**
 * Page de connexion du portail (blueprint/14_Admin_Backoffice.md). Composition
 * serveur ; seul le formulaire (`LoginForm`) est un composant client
 * (blueprint/16_Rendering_State_Strategy.md §4). Volontairement minimale :
 * le cadre commun des pages d'authentification et une seule carte au centre.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo = safeAdminRedirect(next);

  return (
    <AuthShell title="Connexion au portail EWES" fixedHeight>
      <LoginForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
