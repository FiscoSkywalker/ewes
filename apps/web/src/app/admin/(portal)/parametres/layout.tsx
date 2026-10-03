import { PageHeader } from '@/components/admin/page-header';
import { SettingsNav } from '@/components/admin/settings/settings-nav';

/**
 * Cadre commun des écrans Paramètres : titre, menu des sections (colonne à
 * gauche, rangée défilante sur petit écran) puis le contenu de la section.
 * Réservé aux administrateurs : la garde est celle de la navigation
 * (`lib/admin/navigation.ts`), le serveur vérifiant le rôle sur chaque route.
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Paramètres"
        description="Les réglages de la plateforme. Ils sont réservés aux administrateurs et chaque modification est tracée dans le journal d’audit."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[16.5rem_minmax(0,1fr)]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
