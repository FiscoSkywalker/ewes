'use client';

import { useState, type ComponentType } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EngineeringItemsList } from './engineering-items-list';
import { EnvironmentServicesList } from './environment-services-list';
import { WaterServicesList } from './water-services-list';

type Pole = 'env' | 'eau' | 'ing';

interface Stratum {
  pole: Pole;
  code: string;
  namespace: 'Environment' | 'Water' | 'Engineering';
  image: string;
  List: ComponentType;
}

const STRATA: Stratum[] = [
  {
    pole: 'env',
    code: 'ENV',
    namespace: 'Environment',
    image: '/assets/images/ewes-environment-field.png',
    List: EnvironmentServicesList,
  },
  {
    pole: 'eau',
    code: 'H₂O',
    namespace: 'Water',
    image: '/assets/images/ewes-water-standpipe.jpg',
    List: WaterServicesList,
  },
  {
    pole: 'ing',
    code: 'ING',
    namespace: 'Engineering',
    image: '/assets/images/ewes-laboratory-cinematic.png',
    List: EngineeringItemsList,
  },
];

/**
 * Colonne stratigraphique de la page /services : chaque pôle est une couche
 * (motif de légende, code, nombre de prestations) qui s'ouvre sur le détail
 * de ses prestations. Tout le contenu reste dans le DOM (référencement) ;
 * seul l'affichage est replié.
 */
export function ServicesStrata() {
  const t = useTranslations('ServicesOverview');
  const tEnvironment = useTranslations('Environment');
  const tWater = useTranslations('Water');
  const tEngineering = useTranslations('Engineering');
  const translators = {
    Environment: tEnvironment,
    Water: tWater,
    Engineering: tEngineering,
  };
  const counts: Record<Pole, string> = {
    env: t('services', {
      count: (tEnvironment.raw('services') as unknown[]).length,
    }),
    eau: t('services', { count: (tWater.raw('services') as unknown[]).length }),
    ing: t('fields', {
      count: (tEngineering.raw('items') as unknown[]).length,
    }),
  };

  const [open, setOpen] = useState<Set<Pole>>(() => new Set(['env']));

  const toggle = (pole: Pole) => {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(pole)) next.delete(pole);
      else next.add(pole);
      return next;
    });
    // La hauteur de la page change : recalcul des déclencheurs d'animation
    // une fois la transition d'ouverture terminée.
    window.setTimeout(() => ScrollTrigger.refresh(), 750);
  };

  return (
    <div className="border-t border-sand">
      {STRATA.map(({ pole, code, namespace, image, List }) => {
        const tPole = translators[namespace];
        const isOpen = open.has(pole);
        const bodyId = `stratum-${pole}`;
        return (
          <article
            key={pole}
            className={`pole-${pole} relative border-b border-sand pl-10 transition-colors duration-500 md:pl-24 ${
              isOpen ? 'bg-white' : ''
            }`}
          >
            <span className="pattern-swatch absolute inset-y-0 left-0 w-10 border-r border-sand md:w-24" />
            <h2>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={bodyId}
                onClick={() => toggle(pole)}
                className="group flex w-full items-center gap-4 py-6 pl-5 pr-2 text-left md:gap-8 md:py-8 md:pl-8"
              >
                <span className="hidden w-14 font-mono text-xs text-pole md:block">
                  {code}
                </span>
                <span className="section-title min-w-0 flex-1 text-3xl uppercase text-sand transition-transform duration-500 group-hover:translate-x-2 sm:text-5xl lg:text-6xl">
                  {t(`poles.${pole}`)}
                </span>
                <span className="hidden font-mono text-xs text-muted sm:block">
                  {counts[pole]}
                </span>
                <span
                  aria-hidden="true"
                  className={`relative h-11 w-11 flex-none rounded-full border transition-[background-color,transform] duration-500 before:absolute before:left-1/2 before:top-1/2 before:h-[1.5px] before:w-3.5 before:-translate-x-1/2 before:-translate-y-1/2 after:absolute after:left-1/2 after:top-1/2 after:h-3.5 after:w-[1.5px] after:-translate-x-1/2 after:-translate-y-1/2 after:transition-transform after:duration-500 ${
                    isOpen
                      ? 'rotate-180 border-sand bg-sand before:bg-paper after:scale-y-0 after:bg-paper'
                      : 'border-sand/25 before:bg-sand after:bg-sand'
                  }`}
                />
              </button>
            </h2>
            <div
              id={bodyId}
              className={`grid transition-[grid-template-rows] duration-700 ease-[cubic-bezier(.2,.7,.1,1)] ${
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div
                className={`overflow-hidden pl-5 pr-2 md:pl-8 ${isOpen ? '' : 'invisible'}`}
              >
                <div className="grid gap-10 pb-10 md:pl-[5.5rem] lg:grid-cols-[1.2fr_1fr] lg:gap-14 lg:pb-14">
                  <div>
                    <p className="max-w-2xl text-sm leading-7 text-sand/72 sm:text-base">
                      {tPole('description')}
                    </p>
                    <List />
                  </div>
                  <figure className="relative aspect-[16/10] self-start overflow-hidden">
                    <Image
                      src={image}
                      alt={tPole('imageAlt')}
                      fill
                      sizes="(min-width: 1024px) 38vw, 100vw"
                      className="object-cover"
                    />
                  </figure>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
