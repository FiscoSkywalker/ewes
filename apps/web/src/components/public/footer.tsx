import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArrowUp, Lock } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { EWES_CONTACT } from '@/data/contact';

/**
 * Pied de page institutionnel partagé (blueprint/05_UI_UX_System.md §6) —
 * présent sur toutes les pages publiques. Fond nuit profonde (prolonge le
 * bloc Contact de l'Accueil), logo en version claire.
 */
export async function Footer() {
  const t = await getTranslations('Footer');
  const tNav = await getTranslations('Nav');
  const tPoles = await getTranslations('ServicesOverview');
  const partners = t.raw('partners') as string[];

  const sitemap = [
    { href: '/a-propos', label: tNav('about') },
    { href: '/services', label: tNav('services') },
    { href: '/realisations', label: tNav('realisations') },
    { href: '/actualites', label: tNav('news') },
    { href: '/documents', label: tNav('documents') },
    { href: '/contact', label: tNav('contact') },
  ] as const;

  const headingClass =
    'mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-on-night';
  const linkClass = 'w-fit transition-colors hover:text-malachite-bright';

  return (
    <footer className="bg-night-deep px-6 pb-7 pt-16 text-sm text-on-night-muted md:px-16 md:pt-20">
      <div className="mx-auto grid max-w-[1440px] gap-10 border-b border-on-night/12 pb-12 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1.3fr]">
        <div>
          <Image
            src="/assets/brand/ewes-logo-light.png"
            alt="EWES — Environment, Water and Engineering Services"
            width={461}
            height={180}
            sizes="160px"
            className="mb-5 h-14 w-auto"
          />
          <p className="max-w-sm leading-6">{t('identity')}</p>
          <p className="mt-4 max-w-sm text-xs leading-5 text-on-night-muted/75">
            {partners.join(' · ')}
          </p>
        </div>

        <nav
          className="grid content-start gap-2.5"
          aria-label={t('sitemapTitle')}
        >
          <h2 className={headingClass}>{t('sitemapTitle')}</h2>
          {sitemap.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="grid content-start gap-2.5">
          <h2 className={headingClass}>{t('polesTitle')}</h2>
          <Link href="/services" className={linkClass}>
            {tPoles('poles.env')}
          </Link>
          <Link href="/services" className={linkClass}>
            {tPoles('poles.eau')}
          </Link>
          <Link href="/services" className={linkClass}>
            {tPoles('poles.ing')}
          </Link>
          <Link href="/contact" className={linkClass}>
            {t('training')}
          </Link>
        </div>

        <div className="grid content-start gap-2.5">
          <h2 className={headingClass}>{t('reachTitle')}</h2>
          <a href={EWES_CONTACT.phoneHref} className={linkClass}>
            {EWES_CONTACT.phoneDisplay}
          </a>
          <a
            href={`mailto:${EWES_CONTACT.email}`}
            className={`${linkClass} break-all`}
          >
            {EWES_CONTACT.email}
          </a>
          <span className="leading-6">{t('address')}</span>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 pt-6 font-mono text-[11px] sm:flex-row sm:items-center sm:justify-between">
        <div>
          © {new Date().getFullYear()} EWES S.A.R.L. {t('rights')}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link
            href="/documents"
            className="flex items-center gap-1.5 transition-colors hover:text-malachite-bright"
          >
            <Lock size={11} className="text-malachite-bright" />
            {t('privateSpaceLink')}
          </Link>
          <span>{t('tagline')}</span>
          <a
            href="#"
            className="flex items-center gap-1.5 transition-colors hover:text-on-night"
          >
            {t('backToTop')} <ArrowUp size={11} />
          </a>
        </div>
      </div>
    </footer>
  );
}
