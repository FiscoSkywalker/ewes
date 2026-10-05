import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './admin.css';
import '@/styles/article-prose.css';
import { themeBootScript } from '@/lib/admin/theme';
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
  robots: { index: false, follow: false },
};

/**
 * Racine indépendante du portail admin (blueprint/06_Application_Architecture.md
 * §4) : branche distincte de `app/[locale]/...`, avec son propre <html>/<body>
 * — pattern Next.js "multiple root layouts". Le portail n'est pas localisé
 * par route (outil interne à l'équipe EWES, pas de contrainte SEO/i18n) et
 * traité entièrement en client-side (blueprint/16_Rendering_State_Strategy.md §3).
 *
 * `data-theme` est posé par le script du <head> avant le premier rendu
 * (thème clair/sombre du portail, voir admin.css) : d'où
 * `suppressHydrationWarning` sur <html>, dont l'attribut diffère du rendu
 * serveur par construction.
 */
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="portal-body min-h-full">
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}
