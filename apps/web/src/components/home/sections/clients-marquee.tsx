'use client';

import { useTranslations } from 'next-intl';
import { EWES_CLIENTS } from '@/data/clients';

/** Losange séparateur, aux couleurs des trois pôles en alternance. */
const SEPARATOR_TONES = ['bg-malachite', 'bg-primary', 'bg-copper'];

/**
 * Bandeau défilant des clients et partenaires — homepage uniquement. Liste
 * doublée pour une boucle continue ; la copie est masquée aux lecteurs
 * d'écran. Pause au survol ; statique si l'utilisateur réduit les animations.
 */
export function ClientsMarquee() {
  const t = useTranslations('Clients');

  const list = (hidden: boolean) => (
    <ul className="flex flex-none" aria-hidden={hidden || undefined}>
      {EWES_CLIENTS.map((name, index) => (
        <li
          key={name}
          className="flex items-center whitespace-nowrap pr-8 font-heading text-2xl font-semibold uppercase tracking-wide text-sand/80 sm:pr-14 sm:text-4xl"
        >
          {name}
          <span
            className={`ml-8 h-2 w-2 rotate-45 sm:ml-14 ${SEPARATOR_TONES[index % 3]}`}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <section
      className="marquee border-y border-sand/10 bg-white py-8"
      aria-label={t('label')}
    >
      <p className="mb-5 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        {t('label')}
      </p>
      <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="marquee-track flex w-max">
          {list(false)}
          {list(true)}
        </div>
      </div>
    </section>
  );
}
