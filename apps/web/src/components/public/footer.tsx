import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowUp, Lock } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { getPoleServices } from '@/lib/api/public-services';
import { getSiteSettings } from '@/lib/api/public-site-settings';
import { LEGAL_SLUGS, legalLabels } from '@/lib/legal';
import { activeSocials, addressFor } from '@/lib/site-settings';

/**
 * Pied de page institutionnel partagé (blueprint/05_UI_UX_System.md §6) —
 * présent sur toutes les pages publiques. Fond nuit profonde (prolonge le
 * bloc Contact de l'Accueil), logo en version claire.
 */
export async function Footer() {
  const t = await getTranslations('Footer');
  const tNav = await getTranslations('Nav');
  const tPoles = await getTranslations('ServicesOverview');
  const tLegal = await getTranslations('Legal');
  // Noms des pôles pilotés par le portail ; repli sur les messages.
  const locale = await getLocale();
  const poles = await getPoleServices(locale);
  const partners = t.raw('partners') as string[];
  const legalNames = legalLabels(locale);
  // Coordonnées pilotées par le portail ; repli sur les valeurs d'origine.
  const settings = await getSiteSettings();
  const socials = activeSocials(settings);

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
            {poles.env?.name ?? tPoles('poles.env')}
          </Link>
          <Link href="/services" className={linkClass}>
            {poles.eau?.name ?? tPoles('poles.eau')}
          </Link>
          <Link href="/services" className={linkClass}>
            {poles.ing?.name ?? tPoles('poles.ing')}
          </Link>
          <Link href="/contact" className={linkClass}>
            {t('training')}
          </Link>
        </div>

        <div className="grid content-start gap-2.5">
          <h2 className={headingClass}>{t('reachTitle')}</h2>
          <a href={settings.phoneHref} className={linkClass}>
            {settings.phone}
          </a>
          <a
            href={`mailto:${settings.email}`}
            className={`${linkClass} break-all`}
          >
            {settings.email}
          </a>
          <span className="leading-6">{addressFor(settings, locale)}</span>
          {socials.length > 0 && (
            <ul
              aria-label={t('socialTitle')}
              className="mt-1 flex flex-wrap gap-2"
            >
              {socials.map((network) => (
                <li key={network.id}>
                  <a
                    href={network.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full border border-on-night/20 px-3 py-1 text-xs transition-colors hover:border-malachite-bright hover:text-malachite-bright"
                  >
                    {network.label}
                    <span className="sr-only"> ({t('newTab')})</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 pt-6 font-mono text-[11px] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          © {new Date().getFullYear()} EWES S.A.R.L. {t('rights')}
        </div>
        <nav
          aria-label={tLegal('nav')}
          className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:order-last sm:basis-full sm:border-t sm:border-on-night/12 sm:pt-4"
        >
          {LEGAL_SLUGS.map((slug) => (
            <Link
              key={slug}
              href={`/${slug}`}
              className="transition-colors hover:text-on-night"
            >
              {legalNames[slug]}
            </Link>
          ))}
        </nav>
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
