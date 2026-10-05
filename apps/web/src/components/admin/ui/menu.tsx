'use client';

import { useId, useLayoutEffect, type KeyboardEvent } from 'react';
import { Ellipsis, type LucideIcon } from 'lucide-react';
import { cx, focusRing } from '@/lib/admin/cx';
import { usePopover } from '../use-popover';

export interface MenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  /** Action destructive (supprimer, révoquer) : toujours suivie d'une confirmation. */
  danger?: boolean;
  disabled?: boolean;
  /** Trait de séparation au-dessus de l'entrée. */
  separated?: boolean;
}

export interface MenuProps {
  /** Nom accessible du bouton (« Actions sur Rapport 2024 »). */
  label: string;
  items: MenuItem[];
  icon?: LucideIcon;
  /** Libellé visible à côté de l'icône ; sinon bouton icône seule. */
  text?: string;
  align?: 'start' | 'end';
  className?: string;
}

/** Distance minimale conservée entre le panneau et le bord de la zone visible. */
const EDGE = 8;
/** Écart entre le bouton et le panneau (`mt-1.5` / `mb-1.5`). */
const GAP = 6;
/** Hauteur en deçà de laquelle on préfère ne pas réduire le panneau. */
const MIN_HEIGHT = 120;

/** Zone réellement visible autour du bouton : celle de son parent défilant, bornée par la fenêtre. */
function visibleBounds(element: HTMLElement) {
  let top = 0;
  let bottom = window.innerHeight;
  for (
    let parent = element.parentElement;
    parent;
    parent = parent.parentElement
  ) {
    const { overflowY } = getComputedStyle(parent);
    if (/(auto|scroll|hidden|clip)/.test(overflowY)) {
      const rect = parent.getBoundingClientRect();
      top = Math.max(top, rect.top);
      bottom = Math.min(bottom, rect.bottom);
    }
  }
  return { top, bottom };
}

/**
 * Place le panneau là où il y a de la place : sous le bouton par défaut, au-dessus
 * si l'espace en dessous manque et qu'il y en a plus en haut, et, si aucun des
 * deux ne suffit, du côté le plus large avec une hauteur limitée (défilement).
 * Écrit en direct sur le panneau (attributs `data-*`) : pas de rendu de plus.
 */
function placePanel(trigger: HTMLElement, panel: HTMLElement) {
  panel.style.maxHeight = '';
  delete panel.dataset.placement;
  delete panel.dataset.shift;

  const anchor = trigger.getBoundingClientRect();
  const bounds = visibleBounds(trigger);
  const below = bounds.bottom - anchor.bottom - GAP - EDGE;
  const above = anchor.top - bounds.top - GAP - EDGE;
  const height = panel.offsetHeight;

  const openAbove = height > below && above > below;
  if (openAbove) panel.dataset.placement = 'above';
  const room = openAbove ? above : below;
  if (height > room) panel.style.maxHeight = `${Math.max(room, MIN_HEIGHT)}px`;

  // Horizontalement : bascule de côté si le panneau sortirait de la fenêtre.
  const box = panel.getBoundingClientRect();
  if (box.left < EDGE || box.right > window.innerWidth - EDGE) {
    panel.dataset.shift = 'true';
  }
}

/**
 * Menu d'actions secondaires (« ⋯ »). Bouton `aria-haspopup`, liste
 * `role="menu"` parcourue aux flèches, Échap pour fermer et rendre le focus.
 * Entrées de 40 px : utilisables au doigt.
 */
export function Menu({
  label,
  items,
  icon: Icon = Ellipsis,
  text,
  align = 'end',
  className,
}: MenuProps) {
  const { open, toggle, close, triggerRef, panelRef } = usePopover();
  const menuId = useId();

  // Placement mesuré avant la peinture (aucun saut visible), puis suivi du défilement et du redimensionnement.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      if (triggerRef.current && panelRef.current)
        placePanel(triggerRef.current, panelRef.current);
    };
    place();
    // Le focus se pose après le placement : sinon il ferait défiler la page vers un panneau mal placé.
    panelRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')
      ?.focus({ preventScroll: true });
    window.addEventListener('resize', place);
    // `capture` : le défilement d'un parent (la zone principale du portail) ne remonte pas.
    document.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', place, true);
    };
  }, [open, triggerRef, panelRef]);

  if (items.length === 0) return null;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const entries = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ),
    );
    if (entries.length === 0) return;
    const current = entries.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    const moves: Record<string, number> = {
      ArrowDown: (current + 1) % entries.length,
      ArrowUp: (current - 1 + entries.length) % entries.length,
      Home: 0,
      End: entries.length - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      entries[moves[event.key]].focus();
    } else if (event.key === 'Tab') {
      close(false);
    }
  }

  return (
    <div className={cx('relative inline-flex', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={text ? undefined : label}
        title={text ? undefined : label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
        className={cx(
          'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition-colors',
          focusRing,
          text
            ? 'h-10 border border-line-strong bg-panel px-3.5 text-ink hover:border-brand/40 hover:bg-sunken'
            : 'size-9 text-ink-muted hover:bg-ink/5 hover:text-ink',
          open && !text && 'bg-ink/5 text-ink',
        )}
      >
        <Icon size={17} aria-hidden="true" />
        {text}
      </button>
      {open && (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onKeyDown}
          className={cx(
            'animate-pop-in portal-scroll absolute top-full z-30 mt-1.5 min-w-52 overflow-y-auto overscroll-contain rounded-xl border border-line bg-raised p-1.5 shadow-pop',
            // Au-dessus du bouton quand l'espace manque en dessous (voir `placePanel`).
            'data-[placement=above]:bottom-full data-[placement=above]:top-auto data-[placement=above]:mb-1.5 data-[placement=above]:mt-0 data-[placement=above]:origin-bottom-right',
            align === 'end'
              ? 'right-0 data-[shift=true]:left-0 data-[shift=true]:right-auto'
              : 'left-0 origin-top-left data-[shift=true]:left-auto data-[shift=true]:right-0',
          )}
        >
          {items.map((item) => (
            <div key={item.id} role="none">
              {item.separated && (
                <div role="separator" className="mx-1 my-1.5 h-px bg-line" />
              )}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  close();
                  item.onSelect();
                }}
                className={cx(
                  'flex h-10 w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 text-left text-[13px] font-medium transition-colors disabled:opacity-50',
                  focusRing,
                  item.danger
                    ? 'text-bad hover:bg-bad-soft focus-visible:bg-bad-soft'
                    : 'text-ink hover:bg-ink/5 focus-visible:bg-ink/5',
                )}
              >
                {item.icon && (
                  <item.icon
                    size={16}
                    aria-hidden="true"
                    className={item.danger ? undefined : 'text-ink-subtle'}
                  />
                )}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
