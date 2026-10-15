import { useTranslations } from 'next-intl';
import { SectionHeading } from '@/components/public/section-heading';

interface Step {
  title: string;
  text: string;
}

/**
 * « 03 · Méthode » de l'Accueil — homepage uniquement. Quatre étapes en
 * format compact : en ligne sur grand écran, reliées par un filet aux
 * couleurs des trois pôles ; empilées sur mobile.
 */
export function MethodSection() {
  const t = useTranslations('Method');
  const tHome = useTranslations('HomeSections');
  const steps = t.raw('steps') as Step[];

  return (
    <section className="bg-white px-6 py-14 text-sand md:px-16 md:py-24">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <SectionHeading eyebrow={tHome('methodEyebrow')} title={t('title')} />
          <p
            className="max-w-md text-base leading-7 text-sand/85 lg:justify-self-end"
            data-reveal
          >
            {t('text')}
          </p>
        </div>

        <ol
          className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8"
          data-stagger
        >
          <span
            className="absolute left-6 right-6 top-6 hidden h-px bg-linear-to-r from-primary via-malachite to-copper opacity-60 lg:block"
            aria-hidden="true"
          />
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="relative grid grid-cols-[48px_1fr] gap-4 lg:block"
            >
              <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-sand font-mono text-sm font-bold text-paper">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="pt-2.5 font-heading text-xl font-bold leading-snug text-sand lg:mt-5 lg:pt-0">
                  {step.title}
                </h3>
                <p className="mt-2 text-[15px] leading-6 text-sand/80">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
