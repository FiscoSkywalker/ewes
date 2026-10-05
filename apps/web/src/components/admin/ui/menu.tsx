'use client';

import { useId, type KeyboardEvent } from 'react';
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
            'animate-pop-in absolute top-full z-30 mt-1.5 min-w-52 rounded-xl border border-line bg-raised p-1.5 shadow-pop',
            align === 'end' ? 'right-0' : 'left-0 origin-top-left',
          )}
        >
          {items.map((item, index) => (
            <div key={item.id} role="none">
              {item.separated && (
                <div role="separator" className="mx-1 my-1.5 h-px bg-line" />
              )}
              <button
                type="button"
                role="menuitem"
                // Première entrée active au clavier dès l'ouverture.
                autoFocus={index === 0}
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
