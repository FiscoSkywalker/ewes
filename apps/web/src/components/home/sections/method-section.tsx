'use client';

import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SectionHeading } from '@/components/public/section-heading';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface Step {
  title: string;
  text: string;
}

/**
 * « Méthode » de l'Accueil — homepage uniquement. Quatre étapes reliées par
 * une canalisation qui se remplit au fil du défilement (bleu → malachite →
 * cuivre, les trois pôles) ; chaque étape s'allume quand l'eau l'atteint.
 * La progression est écrite directement dans le DOM (variable CSS + attribut
 * `data-reached`) : pas de re-rendu React à chaque image. Rendu serveur et
 * préférence « animations réduites » : tout est affiché rempli.
 */
export function MethodSection() {
  const t = useTranslations('Method');
  const steps = t.raw('steps') as Step[];
  const listRef = useRef<HTMLOListElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      list.style.setProperty('--progress', '1');
      return;
    }

    const items = Array.from(list.children) as HTMLElement[];
    const update = (progress: number) => {
      list.style.setProperty('--progress', progress.toFixed(3));
      items.forEach((item, index) => {
        item.dataset.reached = String(progress >= index / items.length - 0.02);
      });
    };
    const trigger = ScrollTrigger.create({
      trigger: list,
      start: 'top 70%',
      end: 'bottom 60%',
      scrub: true,
      onUpdate: (self) => update(self.progress),
    });
    update(trigger.progress);
    return () => {
      trigger.kill();
      list.style.setProperty('--progress', '1');
      items.forEach((item) => {
        item.dataset.reached = 'true';
      });
    };
  }, []);

  return (
    <section className="bg-white px-6 py-24 text-sand md:px-16 md:py-32">
      <div className="mx-auto grid w-full max-w-[1440px] gap-12 lg:grid-cols-[5fr_6fr] lg:items-start lg:gap-32">
        <div className="lg:sticky lg:top-32">
          <SectionHeading
            eyebrow={t('eyebrow')}
            title={t('title')}
            description={t('text')}
          />
        </div>

        <ol
          ref={listRef}
          className="method-pipe relative grid"
          style={{ '--progress': 1 } as CSSProperties}
        >
          {steps.map((step, index) => (
            <li
              key={step.title}
              data-reached="true"
              className="group relative grid grid-cols-[48px_1fr] gap-6 pb-12 last:pb-0 lg:pb-24"
            >
              <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-sand bg-sand font-mono text-xs text-paper transition-colors duration-500 group-data-[reached=false]:border-sand/25 group-data-[reached=false]:bg-white group-data-[reached=false]:text-muted">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="pt-2.5 font-heading text-2xl font-semibold leading-tight text-sand transition-colors duration-500 group-data-[reached=false]:text-muted">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-7 text-sand/72">
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
