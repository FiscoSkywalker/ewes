import { getTranslations } from 'next-intl/server';
import { Lock, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { EWES_CONTACT } from '@/data/contact';
import { BrandLogo } from './brand-logo';

/**
 * Pied de page institutionnel partagé (blueprint/05_UI_UX_System.md §6) —
 * présent sur toutes les pages publiques, pas seulement l'Accueil du
 * prototype d'origine (où il était intégré à la section CTA finale).
 */
export async function Footer() {
  const t = await getTranslations('Footer');
  const partners = t.raw('partners') as string[];

  return (
    <footer className="relative border-t border-border-subtle bg-background px-6 pb-8 pt-10 text-sand md:px-16">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 pb-8 text-xs font-sans md:grid-cols-4">
        <div className="space-y-3">
          <BrandLogo className="h-14" />
          <p className="text-xs leading-relaxed text-muted">{t('identity')}</p>
        </div>

        <div className="space-y-2">
          <div className="font-mono font-bold uppercase tracking-wider text-sand">
            {t('addressTitle')}
          </div>
          <div className="flex items-start gap-1.5 text-xs text-muted">
            <MapPin size={13} className="mt-0.5 shrink-0 text-primary" />
            <span>{t('address')}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-mono font-bold uppercase tracking-wider text-sand">
            {t('contactTitle')}
          </div>
          <ul className="space-y-1.5 font-mono text-xs text-muted">
            <li className="flex items-center gap-2">
              <Phone size={12} className="text-primary" />
              <a
                href={EWES_CONTACT.phoneHref}
                className="transition-colors hover:text-primary"
              >
                {EWES_CONTACT.phoneDisplay}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={12} className="text-primary" />
              <a
                href={`mailto:${EWES_CONTACT.email}`}
                className="break-all transition-colors hover:text-primary"
              >
                {EWES_CONTACT.email}
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <div className="font-mono font-bold uppercase tracking-wider text-sand">
            {t('partnersTitle')}
          </div>
          <ul className="space-y-1 text-xs text-muted">
            {partners.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-border-subtle pt-4 font-mono text-[11px] text-muted sm:flex-row">
        <div>
          © {new Date().getFullYear()} EWES S.A.R.L. {t('rights')}
        </div>
        <div className="flex items-center gap-5">
          <Link
            href="/documents"
            className="flex items-center gap-1.5 transition-colors hover:text-primary"
          >
            <Lock size={11} className="text-primary" />
            {t('privateSpaceLink')}
          </Link>
          <span>{t('tagline')}</span>
        </div>
      </div>
    </footer>
  );
}
