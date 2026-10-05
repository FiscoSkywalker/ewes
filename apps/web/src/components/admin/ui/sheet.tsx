'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from '@/lib/admin/cx';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Titre lu par les lecteurs d'écran ; affiché sauf si `header` le remplace. */
  title: string;
  /** En-tête sur mesure (pictogramme, nom, sous-titre) à la place du titre simple. */
  header?: ReactNode;
  /** Actions collées en bas du panneau (toujours atteignables au pouce). */
  footer?: ReactNode;
  children?: ReactNode;
}

/**
 * Panneau de détail : feuille qui monte du bas sur petit écran (à portée de
 * pouce, la liste reste devinée derrière), volet latéral droit au-delà. Même
 * socle que `Dialog` : `<dialog>` natif, focus piégé puis rendu à l'élément
 * d'origine, Échap et clic sur le voile pour fermer.
 */
export function Sheet({
  open,
  onClose,
  title,
  header,
  footer,
  children,
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cx(
        'mx-0 mb-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-visible rounded-t-3xl border border-line bg-raised p-0 text-ink shadow-pop',
        'sm:my-0 sm:ml-auto sm:mr-0 sm:h-dvh sm:max-h-none sm:w-[30rem] sm:rounded-none sm:rounded-l-2xl sm:border-y-0 sm:border-r-0',
        'backdrop:bg-[#041014]/50 backdrop:backdrop-blur-[3px]',
        'animate-sheet-in',
      )}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col sm:h-dvh sm:max-h-none">
          {/* Poignée : repère visuel de la feuille (la fermeture reste la croix, Échap ou le voile). */}
          <span
            aria-hidden="true"
            className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden"
          />
          <header className="flex items-start gap-3 px-5 pb-3 pt-3 sm:pt-5">
            <div className="min-w-0 flex-1">
              {header ? (
                <>
                  <h2 id={titleId} className="sr-only">
                    {title}
                  </h2>
                  {header}
                </>
              ) : (
                <h2
                  id={titleId}
                  className="text-base font-semibold tracking-tight text-ink"
                >
                  {title}
                </h2>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="-mr-1.5 grid size-10 shrink-0 place-items-center rounded-xl text-ink-subtle hover:bg-ink/5 hover:text-ink"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <div className="portal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
            {children}
          </div>
          {footer && (
            <footer className="flex flex-col gap-2 border-t border-line bg-sunken/50 px-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3.5">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
