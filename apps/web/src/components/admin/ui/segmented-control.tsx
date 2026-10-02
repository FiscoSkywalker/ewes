'use client';

import { cx, focusRing } from '@/lib/admin/cx';

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
  /** Effectif affiché à côté du libellé (ex. nombre de brouillons). */
  count?: number;
}

export interface SegmentedControlProps<V extends string> {
  /** Libellé accessible du groupe (« Filtrer par statut »). */
  label: string;
  options: SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Choix exclusif compact : filtre de statut d'une liste, réglage à 2-4
 * valeurs. Boutons `aria-pressed` (le contenu filtré n'est pas un panneau
 * d'onglets).
 */
export function SegmentedControl<V extends string>({
  label,
  options,
  value,
  onChange,
  size = 'md',
  className,
}: SegmentedControlProps<V>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx(
        'inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-sunken p-1',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cx(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-[background-color,color,box-shadow]',
              focusRing,
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
              selected
                ? 'bg-raised text-ink shadow-[0_1px_2px_rgba(16,42,52,.12)]'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cx(
                  'min-w-5 rounded-full px-1.5 text-center text-[10.5px] leading-[18px] tabular-nums',
                  selected
                    ? 'bg-brand-soft text-brand'
                    : 'bg-ink/[0.07] text-ink-subtle',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
