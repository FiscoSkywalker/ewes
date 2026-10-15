'use client';

import { useEffect } from 'react';
import { usePathname } from '@/i18n/navigation';
import { loadMotion, whenIdle, type Motion } from '@/lib/motion';

/**
 * Un élément déjà visible au chargement n'est pas animé : le masquer puis le
 * ré-afficher après hydratation produisait un clignotement au premier rendu.
 */
function isInInitialView(element: Element) {
  return element.getBoundingClientRect().top < window.innerHeight * 0.85;
}

/**
 * Anime au défilement les éléments marqués `data-reveal` / `data-split` /
 * `data-stagger` / `data-image-reveal` / `data-counter` (quantités) sur
 * l'ensemble du site public. Monté une seule fois dans la coquille publique ;
 * ne rend rien lui-même.
 *
 * Les animations sont recréées à chaque changement de page : la coquille
 * publique persiste entre les routes, donc sans cela les éléments des pages
 * suivantes n'étaient jamais animés et les déclencheurs de la page précédente
 * restaient actifs.
 *
 * Lenis lisse déjà le défilement : les animations liées au défilement (`scrub`)
 * suivent donc la position 1:1 (`scrub: true`) au lieu d'ajouter un second
 * lissage, qui donnait une impression de retard. Les effets de parallaxe sont
 * réservés aux écrans larges.
 */
export function ScrollAnimations() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // GSAP est chargé après le premier affichage (hors du chemin critique) :
    // les éléments sous la ligne de flottaison restent visibles tant qu'il
    // n'est pas prêt, puis sont animés à leur entrée à l'écran.
    let disposed = false;
    let dispose = () => {};
    const cancelIdle = whenIdle(async () => {
      const { gsap, ScrollTrigger } = await loadMotion();
      if (disposed) return;
      dispose = animate(gsap, ScrollTrigger);
    });
    return () => {
      disposed = true;
      cancelIdle();
      dispose();
    };
  }, [pathname]);

  return null;
}

/**
 * Installe les animations par petites tâches (une par élément, regroupées
 * dans un budget de ~8 ms) plutôt qu'en un seul bloc : chaque déclencheur lit
 * la mise en page, et tout créer d'un coup produisait une tâche de près d'une
 * seconde sur mobile, qui bloquait les interactions.
 */
function animate(gsap: Motion['gsap'], ScrollTrigger: Motion['ScrollTrigger']) {
  const isDesktop = window.matchMedia('(min-width: 768px)').matches;
  const locale = document.documentElement.lang || 'fr';
  const counterRestorers: Array<() => void> = [];
  const context = gsap.context(() => {});
  const work: Array<() => void> = [];

  // Les titres (`data-split`) apparaissent comme les autres blocs : leur
  // découpage ligne par ligne (SplitText) coûtait ~1 s de calcul sur mobile.
  // Opacité seule (pas `visibility`) : le contenu à venir reste lisible par
  // les lecteurs d'écran avant son apparition.
  gsap.utils
    .toArray<HTMLElement>('[data-reveal], [data-split]')
    .forEach((element) => {
      if (isInInitialView(element)) return;
      work.push(() =>
        gsap.fromTo(
          element,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 88%', once: true },
          },
        ),
      );
    });

  gsap.utils
    .toArray<HTMLElement>('[data-image-reveal]')
    .forEach((element, index) => {
      const image = element.querySelector('img');
      if (!isInInitialView(element)) {
        work.push(() => {
          const initialClip =
            index % 2 === 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
          const timeline = gsap.timeline({
            scrollTrigger: { trigger: element, start: 'top 84%', once: true },
          });
          timeline.fromTo(
            element,
            { clipPath: initialClip },
            { clipPath: 'inset(0 0% 0 0)', duration: 1, ease: 'power3.inOut' },
          );
          if (image) {
            timeline.fromTo(
              image,
              { scale: 1.1 },
              { scale: 1, duration: 1.2, ease: 'power2.out' },
              0,
            );
          }
        });
      }
      if (image && isDesktop) {
        work.push(() =>
          gsap.fromTo(
            image,
            { yPercent: -4 },
            {
              yPercent: 4,
              ease: 'none',
              scrollTrigger: {
                trigger: element,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
              },
            },
          ),
        );
      }
    });

  gsap.utils.toArray<HTMLElement>('[data-stagger]').forEach((container) => {
    if (isInInitialView(container)) return;
    work.push(() =>
      gsap.fromTo(
        Array.from(container.children),
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.07,
          ease: 'power2.out',
          scrollTrigger: { trigger: container, start: 'top 88%', once: true },
        },
      ),
    );
  });

  // Quantités seulement : une année n'est jamais un compteur. Un compteur
  // déjà visible garde sa valeur finale (pas de retour à 0 sous les yeux).
  gsap.utils.toArray<HTMLElement>('[data-counter]').forEach((element) => {
    if (isInInitialView(element)) return;
    work.push(() => {
      const target = Number(element.dataset.counter ?? 0);
      const finalText = element.textContent ?? '';
      const counter = { value: 0 };
      const format = (value: number) =>
        Math.round(value).toLocaleString(locale);
      element.textContent = format(0);
      counterRestorers.push(() => {
        element.textContent = finalText;
      });
      gsap.to(counter, {
        value: target,
        duration: 1.5,
        ease: 'power2.out',
        onUpdate: () => {
          element.textContent = format(counter.value);
        },
        scrollTrigger: { trigger: element, start: 'top 90%', once: true },
      });
    });
  });

  if (isDesktop) {
    const heroMedia = document.querySelector<HTMLElement>(
      '[data-parallax-media]',
    );
    if (heroMedia) {
      work.push(() =>
        gsap.to(heroMedia, {
          yPercent: 11,
          ease: 'none',
          scrollTrigger: {
            trigger: heroMedia.parentElement,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        }),
      );
    }
    gsap.utils
      .toArray<HTMLElement>('[data-section-parallax]')
      .forEach((media) => {
        work.push(() =>
          gsap.fromTo(
            media,
            { yPercent: -7 },
            {
              yPercent: 7,
              ease: 'none',
              scrollTrigger: {
                trigger: media.parentElement,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
              },
            },
          ),
        );
      });
  }

  let timer = 0;
  let frame = 0;
  const runBatch = () => {
    const deadline = performance.now() + 8;
    while (work.length > 0 && performance.now() < deadline) {
      context.add(work.shift()!);
    }
    if (work.length > 0) {
      timer = window.setTimeout(runBatch, 0);
    } else {
      frame = window.requestAnimationFrame(() => ScrollTrigger.refresh());
    }
  };
  runBatch();

  return () => {
    window.clearTimeout(timer);
    window.cancelAnimationFrame(frame);
    context.revert();
    counterRestorers.forEach((restore) => restore());
  };
}
