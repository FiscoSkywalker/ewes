import type { Metadata } from 'next';
import { DM_Sans, Geist_Mono, Rajdhani } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import '../globals.css';

/**
 * Identité typographique du site public (blueprint/05_UI_UX_System.md §3) :
 * DM Sans pour le corps de texte, Rajdhani pour les titres — reprises du
 * prototype immersif validé pour la page d'Accueil, appliquées à l'ensemble
 * du site public pour une identité cohérente.
 */
const bodyFont = DM_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const headingFont = Rajdhani({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'EWES S.A.R.L. | Environnement, Eau et Services d’Ingénierie',
    template: '%s | EWES S.A.R.L.',
  },
  description:
    'Société spécialisée en environnement, eau et travaux d’ingénierie à Lubumbashi (RD Congo) : études d’impact, audits environnementaux, adduction d’eau potable, analyses et formation.',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Root layout de l'arbre public localisé. Server Component par défaut
 * (blueprint/06_Application_Architecture.md §2) : pas de "use client" ici,
 * l'interactivité (sélecteur de langue, etc.) vit dans des sous-composants
 * ciblés sous (public)/.
 */
export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${bodyFont.variable} ${headingFont.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
