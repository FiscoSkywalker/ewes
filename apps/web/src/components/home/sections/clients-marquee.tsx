'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { EWES_PARTNERS } from '@/data/clients';
import { useInView } from '@/hooks/useInView';

/**
 * Bandeau défilant des logos clients et partenaires — homepage uniquement. Liste
 * doublée pour une boucle continue ; la copie est masquée aux lecteurs
 * d'écran. Pause au survol et hors écran ; statique si l'utilisateur réduit
 * les animations.
 */
export function ClientsMarquee() {
  const t = useTranslations('Clients');
  const { ref, inView } = useInView<HTMLElement>();

  const list = (hidden: boolean) => (
    <ul className="flex flex-none" aria-hidden={hidden || undefined}>
      {EWES_PARTNERS.map(({ name, logo }) => (
        <li key={name} className="flex flex-none items-center pr-10 sm:pr-16">
          <Image
            src={logo}
            alt={hidden ? '' : name}
            title={name}
            width={150}
            height={150}
            sizes="80px"
            className="h-16 w-16 object-contain sm:h-20 sm:w-20"
          />
        </li>
      ))}
    </ul>
  );

  return (
    <section
      ref={ref}
      data-paused={!inView}
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
