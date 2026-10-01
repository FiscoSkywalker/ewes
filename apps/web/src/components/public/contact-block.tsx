'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react';
import { EWES_CONTACT } from '@/data/contact';
import { useInView } from '@/hooks/useInView';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Link } from '@/i18n/navigation';
import { ContactForm } from './contact-form';
import { OfficeStatusInline } from './office-status';
import { TopoContours } from './topo-contours';

/** Ordre de défilement des besoins dans le titre (clés de `ContactPage.sectors`). */
const SECTOR_KEYS = [
  'ENVIRONNEMENT',
  'EAU',
  'ANALYSES',
  'GESTION',
  'INGENIERIE',
  'FORMATION',
] as const;

/** Couleur du mot selon le pôle du besoin. */
const SECTOR_TONE: Record<string, string> = {
  ENVIRONNEMENT: 'text-malachite-bright',
  GESTION: 'text-malachite-bright',
  FORMATION: 'text-malachite-bright',
  EAU: 'text-water-bright',
  ANALYSES: 'text-water-bright',
  INGENIERIE: 'text-copper-bright',
  AUTRE: 'text-on-night',
};

const ROTATION_MS = 2600;

/**
 * « 06 · Contact » de l'Accueil : dernière étape du parcours. Le titre
 * « Parlons de votre … » fait défiler les besoins (couleur du pôle) puis se
 * cale sur celui que le visiteur choisit dans le formulaire. État des
 * bureaux en heure de Lubumbashi, coordonnées directes, formulaire sur la
 * carte topographique (même décor que le formulaire de /contact).
 *
 * Accessibilité : le titre lu par les lecteurs d'écran reste fixe
 * (« Parlons de votre projet. »), seule sa version visuelle s'anime ; pas de
 * défilement si l'utilisateur réduit les animations.
 */
export function ContactBlock() {
  const t = useTranslations('ContactBlock');
  const tFooter = useTranslations('Footer');
  const reducedMotion = useReducedMotion();

  const [rotation, setRotation] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  // Le mot qui change modifie la largeur du titre (nouvelle mise en page) :
  // inutile, et coûteux pendant le défilement, quand le bloc est hors écran.
  const { ref: sectionRef, inView } = useInView<HTMLElement>();

  useEffect(() => {
    if (chosen || reducedMotion || !inView) return;
    const id = window.setInterval(
      () => setRotation((value) => (value + 1) % SECTOR_KEYS.length),
      ROTATION_MS,
    );
    return () => window.clearInterval(id);
  }, [chosen, reducedMotion, inView]);

  const sector = chosen ?? (reducedMotion ? 'AUTRE' : SECTOR_KEYS[rotation]);
  const word = t(`words.${sector}`);

  const coordinates = [
    {
      icon: <Phone size={16} />,
      label: t('phone'),
      value: EWES_CONTACT.phoneDisplay,
      href: EWES_CONTACT.phoneHref,
    },
    {
      icon: <Mail size={16} />,
      label: t('email'),
      value: EWES_CONTACT.email,
      href: `mailto:${EWES_CONTACT.email}`,
    },
    {
      icon: <MapPin size={16} />,
      label: t('address'),
      value: tFooter('address'),
    },
  ];

  return (
    <section
      ref={sectionRef}
      data-paused={!inView}
      aria-labelledby="home-contact-title"
      className="tone-night relative overflow-hidden bg-night-deep px-6 py-24 md:px-16 md:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_55%_at_0%_100%,rgba(140,195,214,.14),transparent_70%),radial-gradient(40%_50%_at_100%_0%,rgba(90,209,161,.10),transparent_70%)]" />
      <TopoContours interactive />

      <div className="relative z-10 mx-auto grid w-full max-w-[1440px] gap-14 lg:grid-cols-[5fr_6fr] lg:gap-24">
        <div>
          <p className="eyebrow mb-5" data-reveal>
            {t('eyebrow')}
          </p>
          <h2
            id="home-contact-title"
            className="section-title text-4xl text-on-night sm:text-5xl lg:text-7xl"
          >
            <span className="sr-only">
              {t('titleStart')} {t('words.AUTRE')}
              {t('titleEnd')}
            </span>
            <span aria-hidden="true">
              {t('titleStart')}{' '}
              <span className="inline-block overflow-hidden pb-[0.12em] align-bottom">
                <span
                  key={sector}
                  className={`word-swap inline-block transition-colors duration-500 ${SECTOR_TONE[sector]}`}
                >
                  {word}
                </span>
              </span>
              {t('titleEnd')}
            </span>
          </h2>
          <p
            className="mt-6 max-w-xl text-sm leading-7 text-on-night-muted sm:text-base"
            data-reveal
          >
            {t('lead')}
          </p>

          <div className="mt-8" data-reveal>
            <OfficeStatusInline />
          </div>

          <ul className="mt-10 grid gap-3" data-stagger>
            {coordinates.map((item) => {
              const content = (
                <>
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-on-night/15 text-malachite-bright transition-colors group-hover:border-malachite-bright group-hover:bg-malachite-bright group-hover:text-night">
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-on-night-muted">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block break-words text-base leading-snug text-on-night">
                      {item.value}
                    </span>
                  </span>
                </>
              );
              return item.href ? (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="group flex items-center gap-4 -mx-2 rounded-card p-2 transition-colors hover:bg-on-night/[0.04]"
                  >
                    {content}
                  </a>
                </li>
              ) : (
                <li
                  key={item.label}
                  className="-mx-2 flex items-center gap-4 p-2"
                >
                  {content}
                </li>
              );
            })}
          </ul>

          <Link
            href="/contact"
            className="mt-8 inline-flex items-center gap-2 border-b border-on-night/25 pb-1 text-xs font-bold uppercase tracking-[0.12em] text-on-night transition-colors hover:border-malachite-bright hover:text-malachite-bright"
          >
            {t('moreLink')} <ArrowUpRight size={14} />
          </Link>
        </div>

        <ContactForm onSectorChange={setChosen} />
      </div>
    </section>
  );
}
