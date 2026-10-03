import { useTranslations } from 'next-intl';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { SectionHeading } from './section-heading';
import { ButtonAnchor } from '@/components/public/ui';

/**
 * Section « Localisation » de la page Contact : adresse du siège et carte
 * stylisée (SVG + ondes CSS, aucune tuile ni service cartographique tiers —
 * sobriété d'infrastructure, blueprint/19). L'itinéraire réel s'ouvre dans
 * Google Maps. Server Component.
 */
export function ContactLocation({
  address,
  mapsUrl,
}: {
  /** Adresse du siège dans la langue du visiteur (Paramètres > Général). */
  address: string;
  mapsUrl: string;
}) {
  const t = useTranslations('ContactPage.location');
  const tWorld = useTranslations('World');

  return (
    <section
      id="localisation"
      className="bg-paper-muted px-6 py-20 md:px-16 md:py-28"
    >
      <div className="mx-auto grid w-full max-w-[1440px] gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-20">
        <div>
          <SectionHeading eyebrow={t('eyebrow')} title={t('title')} />

          <div className="mt-10 grid gap-6" data-reveal>
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                {t('addressLabel')}
              </p>
              <p className="max-w-md text-lg leading-snug">{address}</p>
            </div>
            <p className="max-w-md border-t border-border pt-5 text-sm leading-6 text-sand/65">
              {tWorld('networkLine')}
            </p>
            <ButtonAnchor
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              icon={ArrowUpRight}
              className="w-fit"
            >
              {t('directions')}
            </ButtonAnchor>
          </div>
        </div>

        <figure
          className="relative aspect-square overflow-hidden rounded-sheet border border-border bg-surface-elevated sm:aspect-[5/4]"
          role="img"
          aria-label={t('mapLabel')}
          data-reveal
        >
          {/* Quadrillage cartographique */}
          <div className="absolute inset-0 bg-[linear-gradient(var(--color-border-subtle)_1px,transparent_1px),linear-gradient(90deg,var(--color-border-subtle)_1px,transparent_1px)] bg-[size:48px_48px]" />

          {/* Tracés décoratifs : voies et cours d'eau */}
          <svg
            viewBox="0 0 500 400"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            <path
              d="M-20 300 C 80 260, 140 330, 230 280 S 380 180, 520 210"
              fill="none"
              stroke="var(--color-water)"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.35"
            />
            <path
              d="M-20 300 C 80 260, 140 330, 230 280 S 380 180, 520 210"
              fill="none"
              stroke="var(--color-water)"
              strokeWidth="2"
              opacity="0.7"
            />
            <g
              fill="none"
              stroke="var(--color-sand)"
              strokeLinecap="round"
              opacity="0.16"
            >
              <path d="M40 -10 L 210 420" strokeWidth="5" />
              <path d="M-10 120 C 150 150, 300 170, 520 110" strokeWidth="5" />
              <path d="M330 -10 C 300 120, 320 260, 280 420" strokeWidth="3" />
              <path d="M120 -10 C 170 90, 330 90, 400 -10" strokeWidth="2" />
              <path d="M-10 380 L 520 320" strokeWidth="2" />
            </g>
            <g fill="none" stroke="var(--color-malachite)" opacity="0.22">
              <circle cx="250" cy="200" r="70" strokeDasharray="3 6" />
              <circle cx="250" cy="200" r="140" strokeDasharray="3 6" />
            </g>
          </svg>

          {/* Ondes autour du siège */}
          <div className="absolute left-1/2 top-1/2">
            <span className="ripple-ring" />
            <span className="ripple-ring [animation-delay:1.2s]" />
            <span className="ripple-ring [animation-delay:2.4s]" />
            <span className="absolute -translate-x-1/2 -translate-y-full pb-1 text-primary-deep">
              <MapPin
                size={44}
                strokeWidth={1.6}
                className="fill-surface-elevated drop-shadow-[0_10px_14px_rgba(21,52,66,0.35)]"
              />
            </span>
          </div>

          {/* Cartouche */}
          <figcaption className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3 rounded-card bg-surface-elevated/90 p-4 backdrop-blur-md sm:bottom-6 sm:left-6 sm:right-auto sm:min-w-72">
            <span>
              <span className="block font-heading text-2xl font-bold leading-none">
                {tWorld('hqCity')}
              </span>
              <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                {tWorld('hqRegion')}
              </span>
            </span>
            <span className="font-mono text-[10px] tracking-[0.08em] text-primary">
              {t('coordinates')}
            </span>
          </figcaption>

          <span className="absolute right-5 top-5 font-mono text-[10px] tracking-[0.2em] text-muted">
            N ↑
          </span>
        </figure>
      </div>
    </section>
  );
}
