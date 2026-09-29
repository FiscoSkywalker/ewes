import { getTranslations } from 'next-intl/server';
import { Building, Lock, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from '@/i18n/navigation';

const ACADEMIC_NETWORK = [
  'Université de Lubumbashi (UNILU — Faculté Polytechnique)',
  'Université de Liège (Belgique)',
  'Institut National Polytechnique de Lorraine (INPL — France)',
  'Polytechnique Montréal & UQAT (Canada)',
];

/**
 * Pied de page institutionnel partagé (blueprint/05_UI_UX_System.md §6) —
 * présent sur toutes les pages publiques, pas seulement l'Accueil du
 * prototype d'origine (où il était intégré à la section CTA finale).
 */
export async function Footer() {
  const t = await getTranslations('Footer');

  return (
    <footer className="relative border-t border-border-subtle bg-background px-6 pb-8 pt-10 text-sand md:px-16">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 pb-8 text-xs font-sans md:grid-cols-4">
        <div className="space-y-2">
          <div className="font-mono font-bold uppercase tracking-wider text-sand">
            EWES S.A.R.L.
          </div>
          <p className="text-xs leading-relaxed text-muted">{t('identity')}</p>
        </div>

        <div className="space-y-2">
          <div className="font-mono font-bold uppercase tracking-wider text-sand">
            {t('officesTitle')}
          </div>
          <ul className="space-y-2 text-xs text-muted">
            <li className="flex items-start gap-1.5">
              <MapPin size={13} className="mt-0.5 shrink-0 text-primary" />
              <span>
                <strong>{t('headquartersLabel')} :</strong> N°3095/86, Avenue
                Araucarias, Quartier Hewa-Bora, Commune Kampemba, Lubumbashi.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <Building size={13} className="mt-0.5 shrink-0 text-primary" />
              <span>
                <strong>{t('branchLabel')} :</strong> Kinshasa, RD Congo.
              </span>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <div className="font-mono font-bold uppercase tracking-wider text-sand">
            {t('contactTitle')}
          </div>
          <ul className="space-y-1.5 font-mono text-xs text-muted">
            <li className="flex items-center gap-2">
              <Phone size={12} className="text-primary" />
              <a
                href="tel:+243818153110"
                className="transition-colors hover:text-primary"
              >
                +243 81 81 53 110
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={12} className="text-primary" />
              <a
                href="mailto:ewessarlrdc@gmail.com"
                className="transition-colors hover:text-primary"
              >
                ewessarlrdc@gmail.com
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={12} className="text-primary" />
              <a
                href="mailto:contact@ewes.cd"
                className="transition-colors hover:text-primary"
              >
                contact@ewes.cd
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <div className="font-mono font-bold uppercase tracking-wider text-sand">
            {t('networkTitle')}
          </div>
          <ul className="space-y-1 text-xs text-muted">
            {ACADEMIC_NETWORK.map((item) => (
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
