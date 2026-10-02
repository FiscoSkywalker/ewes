import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowDown, ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react';
import { EWES_CONTACT } from '@/data/contact';
import { ContactForm } from '@/components/public/contact-form';
import { ContactLocation } from '@/components/public/contact-location';
import { OfficeStatus } from '@/components/public/office-status';
import { ScrollLink } from '@/components/public/scroll-link';
import { SectionHeading } from '@/components/public/section-heading';
import { TopoContours } from '@/components/public/topo-contours';
import { buttonClass } from '@/components/public/ui';

/**
 * Page Contact (blueprint/15_Public_Site_Pages.md) — page statique, point
 * d'arrivée de la plupart des parcours : en-tête avec canaux directs et heure
 * locale du siège, formulaire sur fond nuit accompagné des étapes qui suivent
 * l'envoi, puis localisation. Îlots client : formulaire, heure locale,
 * relief topographique et liens d'ancre (blueprint/16 §2/§4).
 */
export async function generateMetadata({
  params,
}: PageProps<'/[locale]/contact'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ContactPage' });
  return { title: t('eyebrow'), description: t('description') };
}

interface ChannelProps {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}

function ChannelContent({ icon, label, value, hint }: ChannelProps) {
  return (
    <>
      <span className="flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
          {icon}
        </span>
        <ArrowUpRight
          size={18}
          className="text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </span>
      <span className="mt-8 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      <span className="mt-1.5 block break-all font-heading text-xl font-semibold leading-tight sm:text-2xl">
        {value}
      </span>
      <span className="mt-2 block text-xs leading-5 text-sand/60">{hint}</span>
    </>
  );
}

const channelClass =
  'group flex flex-col rounded-card border border-border bg-surface-elevated p-6 transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_48px_-28px_rgba(21,52,66,0.45)] sm:p-7';

export default async function ContactPage({
  params,
}: PageProps<'/[locale]/contact'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('ContactPage');
  const steps = t.raw('steps.items') as { title: string; text: string }[];

  return (
    <div className="text-sand">
      {/* En-tête : promesse, heure locale, canaux directs */}
      <section className="bg-paper px-6 pb-20 pt-28 md:px-16 md:pb-28 md:pt-36">
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:gap-20">
            <div>
              <SectionHeading
                as="h1"
                eyebrow={t('eyebrow')}
                title={t('title')}
                description={t('description')}
              />
              <div className="mt-10" data-reveal>
                <ScrollLink target="formulaire" className={buttonClass()}>
                  {t('heroCta')}
                  <ArrowDown size={15} />
                </ScrollLink>
              </div>
            </div>
            <div data-reveal>
              <OfficeStatus />
            </div>
          </div>

          <p className="mb-5 mt-16 font-mono text-[10px] uppercase tracking-[0.14em] text-muted md:mt-20">
            {t('channels.title')}
          </p>
          <div className="grid gap-4 md:grid-cols-3" data-stagger>
            <a href={EWES_CONTACT.phoneHref} className={channelClass}>
              <ChannelContent
                icon={<Phone size={18} />}
                label={t('channels.call.label')}
                value={EWES_CONTACT.phoneDisplay}
                hint={t('channels.call.hint')}
              />
            </a>
            <a href={`mailto:${EWES_CONTACT.email}`} className={channelClass}>
              <ChannelContent
                icon={<Mail size={18} />}
                label={t('channels.write.label')}
                value={EWES_CONTACT.email}
                hint={t('channels.write.hint')}
              />
            </a>
            <ScrollLink target="localisation" className={channelClass}>
              <ChannelContent
                icon={<MapPin size={18} />}
                label={t('channels.visit.label')}
                value={t('channels.visit.value')}
                hint={t('channels.visit.hint')}
              />
            </ScrollLink>
          </div>
        </div>
      </section>

      {/* Formulaire + étapes suivantes, sur la carte topographique */}
      <section
        id="formulaire"
        className="tone-night relative overflow-hidden bg-night-deep px-6 py-24 md:px-16 md:py-32"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_55%_at_0%_100%,rgba(140,195,214,.14),transparent_70%),radial-gradient(40%_50%_at_100%_0%,rgba(90,209,161,.10),transparent_70%)]" />
        <TopoContours interactive />

        <div className="relative z-10 mx-auto grid w-full max-w-[1440px] gap-14 lg:grid-cols-[5fr_6fr] lg:gap-24">
          <div>
            <SectionHeading
              eyebrow={t('steps.eyebrow')}
              title={t('steps.title')}
              tone="night"
            />
            <div className="relative mt-12">
              <span
                className="absolute bottom-3 left-[17px] top-3 w-px bg-gradient-to-b from-malachite-bright/60 via-on-night/15 to-transparent"
                aria-hidden
              />
              <ol className="relative grid gap-9" data-stagger>
                {steps.map((step, index) => (
                  <li key={step.title} className="relative flex gap-6">
                    <span className="relative grid h-9 w-9 flex-none place-items-center rounded-full border border-malachite-bright/50 bg-night-deep font-mono text-xs text-malachite-bright">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="pt-1.5">
                      <h3 className="font-heading text-lg font-semibold text-on-night">
                        {step.title}
                      </h3>
                      <p className="mt-2 max-w-md text-sm leading-6 text-on-night-muted">
                        {step.text}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <ContactForm />
        </div>
      </section>

      <ContactLocation />
    </div>
  );
}
