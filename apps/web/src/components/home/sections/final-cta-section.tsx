'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight, GraduationCap, Phone } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { EWES_CONTACT } from '@/data/contact';

/**
 * Bloc d'appel à l'action final de l'Accueil — homepage uniquement. Le pied
 * de page institutionnel n'est plus imbriqué ici : il vit dans
 * `components/public/footer.tsx`, partagé par toutes les pages publiques.
 */
export function FinalCTASection() {
  const t = useTranslations('Cta');

  return (
    <section className="relative flex min-h-screen flex-col justify-center bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,.78),transparent_42%),linear-gradient(180deg,#d5e4ea,#bdd5df)] px-6 pointer-events-auto md:px-16">
      <div
        className="mx-auto my-auto w-full max-w-4xl py-16 text-center"
        data-reveal
      >
        <div className="eyebrow mb-6 justify-center">
          <GraduationCap size={15} />
          <span>{t('badgeLabel')}</span>
        </div>

        <h2 className="section-title mb-6 text-5xl text-sand sm:text-7xl md:text-8xl">
          {t('title')}
        </h2>

        <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-sand/65 sm:text-lg">
          {t('description')}
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/contact"
            className="primary-button w-full px-8 sm:w-auto"
          >
            <span>{t('ctaPrimary')}</span>
            <ArrowRight size={16} />
          </Link>

          <a
            href={EWES_CONTACT.phoneHref}
            className="flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-surface px-8 py-3.5 text-sm tracking-wider text-sand transition-colors hover:border-primary/40 sm:w-auto"
          >
            <Phone size={15} className="text-primary" />
            <span>{EWES_CONTACT.phoneDisplay}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
