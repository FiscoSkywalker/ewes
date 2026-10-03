import { setRequestLocale } from 'next-intl/server';
import { ExperienceController } from '@/components/public/experience-controller';
import { Footer } from '@/components/public/footer';
import { Header } from '@/components/public/header';
import { ScrollAnimations } from '@/components/public/scroll-animations';
import { SiteSettingsProvider } from '@/components/public/site-settings-provider';
import { getSiteSettings } from '@/lib/api/public-site-settings';

/**
 * Coquille du site public (blueprint/05_UI_UX_System.md §6) : header,
 * navigation, sélecteur de langue, footer — partagée par toutes les pages
 * publiques. Server Component ; les éléments interactifs (Header, défilement
 * fluide, animations de révélation) sont isolés dans leurs propres
 * composants client (blueprint/06_Application_Architecture.md §4), montés
 * une seule fois ici plutôt que dupliqués par page.
 */
export default async function PublicLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Coordonnées pilotées par le portail (Paramètres > Général), lues une fois ici.
  const settings = await getSiteSettings();
  return (
    <SiteSettingsProvider value={settings}>
      <ExperienceController>
        <div className="flex min-h-full flex-col bg-background text-sand selection:bg-primary selection:text-white">
          <ScrollAnimations />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </ExperienceController>
    </SiteSettingsProvider>
  );
}
