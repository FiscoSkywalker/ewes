'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { setScrollLocked } from '@/lib/smooth-scroll';

export interface GalleryImage {
  url: string;
  alt: string;
}

/** Distance horizontale (px) au-delà de laquelle un glissement change d'image. */
const SWIPE_DISTANCE = 50;

/**
 * Galerie d'images d'une réalisation : une grille de vignettes dont chacune
 * s'ouvre en grand dans une fenêtre modale (`<dialog>` natif : piège du focus,
 * touche Échap et retour du focus sur la vignette gérés par le navigateur),
 * avec images précédente / suivante (boutons, flèches du clavier, glissement
 * au doigt), compteur et fermeture (bouton, Échap, clic hors de l'image).
 *
 * Seul ce composant est « client » ; la page qui l'affiche reste rendue
 * côté serveur. Les vignettes restent de vrais boutons, atteignables au clavier.
 */
export function GalleryLightbox({
  images,
  firstNumber = 1,
  total = images.length,
}: {
  images: GalleryImage[];
  /** Numéro de la première image dans l'ensemble de la galerie (la couverture compte, hors de cette liste). */
  firstNumber?: number;
  /** Nombre d'images de l'ensemble de la galerie, couverture comprise. */
  total?: number;
}) {
  const t = useTranslations('RealisationsPage.detail');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const swipeStart = useRef<number | null>(null);
  const [current, setCurrent] = useState<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (current !== null && !dialog.open) {
      dialog.showModal();
      setScrollLocked(true);
    } else if (current === null && dialog.open) {
      dialog.close();
    }
  }, [current]);

  // Le défilement de la page ne doit jamais rester gelé après un changement de page.
  useEffect(() => () => setScrollLocked(false), []);

  const count = images.length;
  const go = (delta: number) =>
    setCurrent((index) =>
      index === null ? index : (index + delta + count) % count,
    );
  const image = current === null ? null : images[current];
  const numberOf = (index: number) => firstNumber + index;

  const onPointerUp = (event: PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start === null) return;
    const distance = event.clientX - start;
    if (Math.abs(distance) >= SWIPE_DISTANCE) go(distance < 0 ? 1 : -1);
  };

  return (
    <>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {images.map((item, index) => (
          <li
            key={item.url}
            className="relative aspect-[4/3] overflow-hidden rounded-card bg-night"
          >
            <button
              type="button"
              onClick={() => setCurrent(index)}
              aria-haspopup="dialog"
              aria-label={t('lightbox.open', {
                index: numberOf(index),
                count: total,
              })}
              className="group absolute inset-0 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <Image
                src={item.url}
                alt={item.alt}
                fill
                sizes="(min-width: 1024px) 440px, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={t('lightbox.label')}
        onClose={() => {
          setScrollLocked(false);
          setCurrent(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            go(1);
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            go(-1);
          }
        }}
        className="m-0 h-svh max-h-none w-screen max-w-none bg-night-deep/95 p-0 text-on-night backdrop:bg-night-deep"
      >
        {image && current !== null && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <p
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-on-night-muted"
                aria-live="polite"
              >
                {t('galleryImage', { index: numberOf(current), count: total })}
              </p>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label={t('lightbox.close')}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-night/60 text-on-night transition-colors hover:bg-on-night hover:text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-night"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div
              className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
              onClick={(event) => {
                // Clic dans le noir autour de l'image : fermeture.
                if (event.target === event.currentTarget) {
                  dialogRef.current?.close();
                }
              }}
              onPointerDown={(event) => {
                swipeStart.current = event.clientX;
              }}
              onPointerUp={onPointerUp}
              onPointerCancel={() => {
                swipeStart.current = null;
              }}
            >
              <Image
                // Une autre clé repart d'une image vierge : pas d'ancienne image qui reste affichée pendant le chargement.
                key={image.url}
                src={image.url}
                alt={image.alt}
                fill
                sizes="100vw"
                className="pointer-events-none select-none object-contain p-2 sm:p-16"
                draggable={false}
              />
              {count > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label={t('lightbox.previous')}
                    className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-night/60 text-on-night transition-colors hover:bg-on-night hover:text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-night sm:left-4"
                  >
                    <ChevronLeft size={22} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label={t('lightbox.next')}
                    className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-night/60 text-on-night transition-colors hover:bg-on-night hover:text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-night sm:right-4"
                  >
                    <ChevronRight size={22} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>

            {image.alt && (
              <p className="px-6 py-4 text-center text-sm leading-6 text-on-night-muted">
                {image.alt}
              </p>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
