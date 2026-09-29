'use client';

import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Anime au défilement les éléments marqués `data-reveal` / `data-stagger` /
 * `data-image-reveal` / `data-counter` sur l'ensemble du site public. Monté
 * une seule fois dans la coquille publique ; ne rend rien lui-même.
 */
export function ScrollAnimations() {
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const context = gsap.context(() => {
      // `[data-hero-content]` only exists on the Accueil hero — this
      // component is mounted site-wide, so guard against GSAP warning on
      // every other page.
      if (document.querySelector('[data-hero-content]')) {
        gsap.fromTo(
          '[data-hero-content] > *',
          { autoAlpha: 0, y: 42 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 1.05,
            stagger: 0.1,
            delay: 0.2,
            ease: 'power3.out',
          },
        );
      }

      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
        gsap.fromTo(
          element,
          { autoAlpha: 0, y: 58 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.95,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: element,
              start: 'top 84%',
              once: true,
            },
          },
        );
      });

      gsap.utils
        .toArray<HTMLElement>('[data-image-reveal]')
        .forEach((element, index) => {
          const image = element.querySelector('img');
          const initialClip =
            index % 2 === 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: element,
              start: 'top 82%',
              once: true,
            },
          });

          timeline.fromTo(
            element,
            { clipPath: initialClip },
            {
              clipPath: 'inset(0 0% 0 0)',
              duration: 1.15,
              ease: 'power3.inOut',
            },
          );
          if (image) {
            timeline.fromTo(
              image,
              { scale: 1.14 },
              { scale: 1, duration: 1.45, ease: 'power2.out' },
              0,
            );
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
                  scrub: 0.8,
                },
              },
            );
          }
        });

      gsap.utils.toArray<HTMLElement>('[data-stagger]').forEach((container) => {
        gsap.fromTo(
          Array.from(container.children),
          { autoAlpha: 0, y: 34 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.72,
            stagger: 0.08,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: container,
              start: 'top 84%',
              once: true,
            },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>('[data-counter]').forEach((element) => {
        const target = Number(element.dataset.counter ?? 0);
        const counter = { value: 0 };
        gsap.to(counter, {
          value: target,
          duration: 1.7,
          ease: 'power2.out',
          onUpdate: () => {
            element.textContent = Math.round(counter.value).toLocaleString(
              'fr-FR',
            );
          },
          scrollTrigger: {
            trigger: element,
            start: 'top 88%',
            once: true,
          },
        });
      });

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
            scrub: 0.8,
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
                scrub: 0.9,
              },
            },
          );
        });
    });

    const refreshFrame = window.requestAnimationFrame(() =>
      ScrollTrigger.refresh(),
    );
    return () => {
      window.cancelAnimationFrame(refreshFrame);
      context.revert();
    };
  }, []);

  return null;
}
