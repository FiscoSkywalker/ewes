import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '../globals.css';
import { AdminProviders } from './providers';

/**
 * Le portail admin garde une police fonctionnelle (Geist) plutôt que
 * l'identité DM Sans/Rajdhani du site public (blueprint/05_UI_UX_System.md
 * §7 : densité d'information et efficacité opérationnelle, pas de
 * démonstration visuelle). Les variables `--font-body`/`--font-heading`
 * sont celles consommées par `@theme inline` dans globals.css.
 */
const geistSans = Geist({
  variable: '--font-body',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'EWES — Portail admin',
  description: "Portail d'administration EWES.",
};

/**
 * Racine indépendante du portail admin (blueprint/06_Application_Architecture.md
 * §4) : branche distincte de `app/[locale]/...`, avec son propre <html>/<body>
 * — pattern Next.js "multiple root layouts". Le portail n'est pas localisé
 * par route (outil interne à l'équipe EWES, pas de contrainte SEO/i18n) et
 * traité entièrement en client-side (blueprint/16_Rendering_State_Strategy.md §3).
 */
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-(--color-surface-muted)">
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}
