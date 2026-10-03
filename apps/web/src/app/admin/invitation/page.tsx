import type { Metadata } from 'next';
import { AuthShell } from '@/components/admin/auth/auth-shell';
import { ActivationForm } from './activation-form';

export const metadata: Metadata = {
  title: 'Activer mon compte | Portail EWES',
  // Page privée : ne pas l'indexer. Pas de Referer : le lien d'invitation ne doit jamais fuiter.
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

/**
 * Activation d'un compte invité. Le jeton du lien d'invitation est dans le
 * fragment de l'adresse (`#…`), que le navigateur n'envoie jamais au serveur :
 * la page ne peut donc être qu'une coquille, et la lecture du jeton se fait
 * dans le composant client.
 */
export default function InvitationPage() {
  return (
    <AuthShell title="Activer mon compte EWES">
      <ActivationForm />
    </AuthShell>
  );
}
