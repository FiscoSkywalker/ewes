'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  EXPERT_PLACEHOLDER_PORTRAITS,
  type Expert,
  type ExpertPole,
} from '@/data/experts';

const POLE_CLASS: Record<ExpertPole, string> = {
  env: 'pole-env',
  eau: 'pole-eau',
  ing: 'pole-ing',
};

/** Accent d'un expert sans pôle de rattachement. */
const NO_POLE_CLASS = 'pole-neutral';

/** Dimensions des visuels provisoires (recadrage sur un visage). */
const SOURCE_SIZE: Record<string, [number, number]> = {
  '/assets/images/ewes-apropos-equipe.webp': [1536, 1024],
  '/assets/images/ewes-training-session.jpg': [1536, 1024],
  '/assets/images/ewes-laboratory-cinematic.png': [1280, 720],
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((part) => /^\p{Lu}/u.test(part))
    .slice(-2)
    .map((part) => part[0])
    .join('');
}

/**
 * Portrait d'un expert : photo fournie par l'API, sinon recadrage d'un
 * visuel provisoire centré sur le visage (le point focal est placé au
 * centre du cadre quelle que soit sa largeur), sinon monogramme.
 */
function Portrait({ expert, sizes }: { expert: Expert; sizes: string }) {
  if (expert.photo) {
    return (
      <Image
        src={expert.photo}
        alt=""
        fill
        sizes={sizes}
        className={
          expert.focal ? 'object-cover' : 'object-cover object-[50%_25%]'
        }
        style={
          expert.focal
            ? { objectPosition: `${expert.focal.x}% ${expert.focal.y}%` }
            : undefined
        }
      />
    );
  }

  const crop = EXPERT_PLACEHOLDER_PORTRAITS[expert.id];
  const size = crop && SOURCE_SIZE[crop.src];
  if (crop && size) {
    return (
      <Image
        src={crop.src}
        alt=""
        width={size[0]}
        height={size[1]}
        sizes="(min-width: 1024px) 60vw, 150vw"
        className="absolute left-1/2 top-[40%] max-w-none"
        style={{
          height: `${crop.zoom * 100}%`,
          width: 'auto',
          transform: `translate(-${crop.x}%, -${crop.y}%)`,
        }}
      />
    );
  }

  return (
    <span className="pattern-swatch absolute inset-0 flex items-center justify-center">
      <span className="font-heading text-6xl font-bold text-pole">
        {initials(expert.name)}
      </span>
    </span>
  );
}

/**
 * « Équipe & experts » : bandeau de portraits verticaux. Le portrait actif
 * s'élargit et dévoile la fiche de l'expert (fonction, spécialités,
 * expérience) ; les autres restent en lames étroites, nom en vertical.
 * Pattern d'onglets (flèches du clavier) ; sur mobile, les lames
 * s'empilent en accordéon.
 */
export function ExpertsGallery({
  experts,
  poleNames,
}: {
  experts: Expert[];
  /** Noms des pôles pilotés par le portail ; un pôle absent retombe sur les messages. */
  poleNames?: Partial<Record<ExpertPole, string>>;
}) {
  const t = useTranslations('AboutPage.team');
  const tMessages = useTranslations('ServicesOverview.poles');
  const tPoles = (pole: ExpertPole | null) =>
    pole ? (poleNames?.[pole] ?? tMessages(pole)) : '';
  const [active, setActive] = useState(0);

  const focusTab = (index: number) => {
    const next = (index + experts.length) % experts.length;
    setActive(next);
    document.getElementById(`expert-tab-${experts[next].id}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={t('listLabel')}
      aria-orientation="horizontal"
      className="flex flex-col gap-3 lg:h-[600px] lg:flex-row"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          focusTab(active + 1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          focusTab(active - 1);
        }
      }}
    >
      {experts.map((expert, index) => {
        const isActive = index === active;
        return (
          <div
            key={expert.id}
            className={`${expert.pole ? POLE_CLASS[expert.pole] : NO_POLE_CLASS} group relative overflow-hidden rounded-sheet bg-night transition-[flex-grow,height] duration-700 ease-[cubic-bezier(.2,.7,.1,1)] lg:h-full lg:min-w-0 ${
              isActive ? 'h-[560px] lg:flex-[6_1_0%]' : 'h-24 lg:flex-[1_1_0%]'
            }`}
            onMouseEnter={() => setActive(index)}
          >
            <button
              type="button"
              role="tab"
              id={`expert-tab-${expert.id}`}
              aria-selected={isActive}
              aria-controls={`expert-panel-${expert.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(index)}
              className="absolute inset-0 z-10 cursor-pointer rounded-sheet focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-on-night"
            >
              <span className="sr-only">
                {expert.name} — {expert.role}
              </span>
            </button>

            {/* Portrait */}
            <div
              className={`absolute inset-0 transition-[filter,transform] duration-700 ${
                isActive
                  ? 'grayscale-0'
                  : 'grayscale group-hover:grayscale-[40%]'
              }`}
            >
              <Portrait
                expert={expert}
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
            </div>
            <div
              className={`absolute inset-0 transition-opacity duration-700 ${
                isActive
                  ? 'bg-linear-to-t from-night via-night/35 to-transparent'
                  : 'bg-night/55'
              }`}
              aria-hidden="true"
            />

            {/* Lame repliée : nom vertical (grand écran), ligne (mobile). */}
            <div
              className={`pointer-events-none absolute inset-0 flex items-center gap-4 px-6 transition-opacity duration-300 lg:flex-col lg:justify-end lg:px-0 lg:pb-7 ${
                isActive ? 'opacity-0' : 'opacity-100 delay-300'
              }`}
              aria-hidden="true"
            >
              <span className="h-2.5 w-2.5 flex-none rounded-full bg-pole ring-4 ring-night/60" />
              <span className="font-heading text-lg font-bold text-on-night lg:[writing-mode:vertical-rl] lg:rotate-180 lg:whitespace-nowrap">
                {expert.name}
              </span>
              {expert.pole && (
                <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-on-night-muted lg:hidden">
                  {tPoles(expert.pole)}
                </span>
              )}
            </div>

            {/* Fiche */}
            <div
              id={`expert-panel-${expert.id}`}
              role="tabpanel"
              aria-labelledby={`expert-tab-${expert.id}`}
              hidden={!isActive}
              className="tone-night pointer-events-none absolute inset-x-0 bottom-0 z-20 p-6 sm:p-9"
            >
              <div className="expert-panel-in flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-lg">
                  {expert.pole && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-night/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-on-night backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-pole" />
                      {t('pole', { pole: tPoles(expert.pole) })}
                    </span>
                  )}
                  <h3 className="mt-4 font-heading text-3xl font-bold leading-tight text-on-night sm:text-4xl">
                    {expert.name}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-on-night">
                    {expert.role}
                  </p>
                  {expert.bio && (
                    <p className="mt-4 hidden text-sm leading-6 sm:block">
                      {expert.bio}
                    </p>
                  )}
                  <ul
                    className="mt-5 flex flex-wrap gap-1.5"
                    aria-label={t('specialties')}
                    hidden={expert.specialties.length === 0}
                  >
                    {expert.specialties.map((specialty) => (
                      <li
                        key={specialty}
                        className="rounded-full border border-on-night/25 bg-night/40 px-3 py-1 text-[11px] font-semibold text-on-night backdrop-blur-sm"
                      >
                        {specialty}
                      </li>
                    ))}
                  </ul>
                </div>
                {expert.years !== null && (
                  <p className="flex flex-none items-end gap-2 lg:flex-col lg:items-end">
                    <span className="font-heading text-6xl font-bold leading-none text-transparent [-webkit-text-stroke:1.5px_var(--color-on-night)]">
                      {expert.years}
                    </span>
                    <span className="pb-1 font-mono text-[10px] uppercase tracking-[0.14em] lg:pb-0">
                      {t('years')}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
