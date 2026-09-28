import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from '@/components/locale-switcher';

/**
 * Coquille du site public (blueprint/05_UI_UX_System.md §6) : header,
 * navigation, sélecteur de langue, footer. Server Component ; le seul
 * élément interactif (LocaleSwitcher) est isolé dans son propre composant
 * client, conformément à blueprint/06_Application_Architecture.md §4.
 */
export default async function PublicLayout({
  children,
}: LayoutProps<'/[locale]'>) {
  const t = await getTranslations('Nav');
  const tFooter = await getTranslations('Footer');

  const links = [
    { href: '/', label: t('home') },
    { href: '/a-propos', label: t('about') },
    { href: '/services', label: t('services') },
    { href: '/realisations', label: t('realisations') },
    { href: '/actualites', label: t('news') },
    { href: '/documents', label: t('documents') },
    { href: '/contact', label: t('contact') },
  ] as const;

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-(--color-border)">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="font-semibold text-(--color-primary)">
            EWES
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <LocaleSwitcher />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-(--color-border) text-(--color-text-muted)">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm">
          © {new Date().getFullYear()} EWES S.A.R.L. — {tFooter('rights')}
        </div>
      </footer>
    </div>
  );
}
