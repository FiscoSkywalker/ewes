'use client';

import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { usePathname } from '@/i18n/navigation';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  // Sur mobile, la barre d'adresse qui se replie déclenche des `resize` qui
  // recalculaient toutes les positions en plein défilement (sauts visibles).
  ScrollTrigger.config({ ignoreMobileResize: true });
}

/**
 * Un élément déjà visible au chargement n'est pas animé : le masquer puis le
 * ré-afficher après hydratation produisait un clignotement au premier rendu.
 */
function isInInitialView(element: Element) {
  return element.getBoundingClientRect().top < window.innerHeight * 0.85;
}

/**
 * Anime au défilement les éléments marqués `data-reveal` / `data-split` /
 * `data-stagger` / `data-image-reveal` / `data-counter` sur l'ensemble du
 * site public (`data-counter-plain` : sans séparateur de milliers, pour les
 * années). Monté
 * une seule fois dans la coquille publique ; ne rend rien lui-même.
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

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    const locale = document.documentElement.lang || 'fr';
    const counterRestorers: Array<() => void> = [];

    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
        if (isInInitialView(element)) return;
        gsap.fromTo(
          element,
          { autoAlpha: 0, y: 40 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 88%', once: true },
          },
        );
      });

      // Titres révélés ligne par ligne, chaque ligne sortant de son masque.
      // `autoSplit` re-découpe au redimensionnement (polices, largeur).
      gsap.utils.toArray<HTMLElement>('[data-split]').forEach((element) => {
        if (isInInitialView(element)) return;
        SplitText.create(element, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'split-line',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.1,
              stagger: 0.09,
              ease: 'expo.out',
              scrollTrigger: { trigger: element, start: 'top 88%', once: true },
            }),
        });
      });

      gsap.utils
        .toArray<HTMLElement>('[data-image-reveal]')
        .forEach((element, index) => {
          const image = element.querySelector('img');

          if (!isInInitialView(element)) {
            const initialClip =
              index % 2 === 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
            const timeline = gsap.timeline({
              scrollTrigger: { trigger: element, start: 'top 84%', once: true },
            });
            timeline.fromTo(
              element,
              { clipPath: initialClip },
              {
                clipPath: 'inset(0 0% 0 0)',
                duration: 1,
                ease: 'power3.inOut',
              },
            );
            if (image) {
              timeline.fromTo(
                image,
                { scale: 1.1 },
                { scale: 1, duration: 1.2, ease: 'power2.out' },
                0,
              );
            }
          }

          if (image && isDesktop) {
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
            );
          }
        });

      gsap.utils.toArray<HTMLElement>('[data-stagger]').forEach((container) => {
        if (isInInitialView(container)) return;
        gsap.fromTo(
          Array.from(container.children),
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.65,
            stagger: 0.07,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: container,
              start: 'top 88%',
              once: true,
            },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>('[data-counter]').forEach((element) => {
        const target = Number(element.dataset.counter ?? 0);
        const finalText = element.textContent ?? '';
        const plain = element.hasAttribute('data-counter-plain');
        // Une année compte depuis un point proche (2008 → pas depuis 0).
        const counter = { value: plain ? Math.floor(target * 0.985) : 0 };
        // Le texte serveur affiche déjà la valeur finale : on repart de 0
        // seulement au moment où le compteur entre à l'écran.
        const format = (value: number) =>
          plain
            ? String(Math.round(value))
            : Math.round(value).toLocaleString(locale);
        element.textContent = format(counter.value);
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

      if (isDesktop) {
        const heroMedia = document.querySelector<HTMLElement>(
          '[data-parallax-media]',
        );
        if (heroMedia) {
          gsap.to(heroMedia, {
            yPercent: 11,
            ease: 'none',
            scrollTrigger: {
              trigger: heroMedia.parentElement,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          });
        }

        gsap.utils
          .toArray<HTMLElement>('[data-section-parallax]')
          .forEach((media) => {
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
            );
          });
      }
    });

    const refreshFrame = window.requestAnimationFrame(() =>
      ScrollTrigger.refresh(),
    );
    return () => {
      window.cancelAnimationFrame(refreshFrame);
      context.revert();
      counterRestorers.forEach((restore) => restore());
    };
  }, [pathname]);

  return null;
}
