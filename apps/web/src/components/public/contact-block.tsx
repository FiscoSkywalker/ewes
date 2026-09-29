import { useTranslations } from 'next-intl';
import { EWES_CONTACT } from '@/data/contact';
import { ContactForm } from './contact-form';
import { SectionHeading } from './section-heading';
import { TopoContours } from './topo-contours';

interface ContactBlockProps {
  /**
   * `false` sur /contact : la page porte déjà son titre dans un en-tête clair
   * (le header transparent reste lisible en haut de page).
   */
  showHeading?: boolean;
}

/**
 * Bloc Contact sur fond nuit : coordonnées + formulaire, sur une carte
 * topographique qui réagit au pointeur. Partagé entre l'Accueil (section
 * finale) et /contact ; compatible Server Component (seuls le formulaire et
 * le canvas sont des composants client).
 */
export function ContactBlock({ showHeading = true }: ContactBlockProps) {
  const t = useTranslations('ContactBlock');
  const tFooter = useTranslations('Footer');

  const coordinates = [
    { label: t('address'), value: tFooter('address') },
    {
      label: t('phone'),
      value: EWES_CONTACT.phoneDisplay,
      href: EWES_CONTACT.phoneHref,
    },
    {
      label: t('email'),
      value: EWES_CONTACT.email,
      href: `mailto:${EWES_CONTACT.email}`,
    },
  ];

  return (
    <section className="tone-night relative overflow-hidden bg-night-deep px-6 py-24 md:px-16 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_55%_at_0%_100%,rgba(140,195,214,.14),transparent_70%),radial-gradient(40%_50%_at_100%_0%,rgba(90,209,161,.10),transparent_70%)]" />
      <TopoContours interactive />

      <div className="relative z-10 mx-auto grid w-full max-w-[1440px] gap-14 lg:grid-cols-[5fr_6fr] lg:gap-24">
        <div>
          {showHeading && (
            <SectionHeading
              eyebrow={t('eyebrow')}
              title={t('title')}
              description={t('lead')}
              tone="night"
            />
          )}
          <dl className={`grid gap-6 ${showHeading ? 'mt-12' : ''}`}>
            {coordinates.map((item) => (
              <div key={item.label}>
                <dt className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-malachite-bright">
                  {item.label}
                </dt>
                <dd className="text-lg leading-snug text-on-night">
                  {item.href ? (
                    <a
                      href={item.href}
                      className="break-all border-b border-on-night/15 transition-colors hover:border-malachite-bright"
                    >
                      {item.value}
                    </a>
                  ) : (
                    item.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <ContactForm />
      </div>
    </section>
  );
}
