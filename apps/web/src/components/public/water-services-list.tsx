'use client';

import { useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';

interface WaterService {
  step: string;
  title: string;
  desc: string;
}

/** Liste des 6 prestations du pôle Eau — partagée entre l'Accueil et /services. */
export function WaterServicesList() {
  const t = useTranslations('Water');
  const services = t.raw('services') as WaterService[];

  return (
    <div
      className="pointer-events-auto mt-12 grid max-w-5xl grid-cols-1 border-b border-sand/20 sm:grid-cols-2"
      data-stagger
    >
      {services.map((s) => (
        <article
          key={s.title}
          className="group grid grid-cols-[58px_1fr] gap-4 border-t border-sand/20 py-6 sm:odd:pr-7 sm:even:border-l sm:even:pl-7"
        >
          <div className="font-heading text-3xl font-medium text-water">
            {s.step}
          </div>
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-heading text-xl font-semibold leading-tight text-sand">
                {s.title}
              </h3>
              <ArrowUpRight
                size={15}
                className="mt-1 shrink-0 text-sand/30 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-sand/58">{s.desc}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
