'use client';

import { useId } from 'react';
import { Check, CircleAlert } from 'lucide-react';
import { cx } from '@/lib/admin/cx';
import { WEEK_ORDER, dayName } from '@/lib/office-hours';

interface DayPickerProps {
  legend: string;
  hint?: string;
  value: number[];
  onChange: (days: number[]) => void;
  error?: string | null;
}

/**
 * Choix des jours d'ouverture : sept cases à cocher natives habillées en
 * pastilles (lundi → dimanche). Chaque case porte le nom complet du jour pour
 * les lecteurs d'écran ; l'état « ouvert » est marqué par une coche en plus
 * de la couleur ; tout se fait au clavier (Tab, Espace).
 */
export function DayPicker({
  legend,
  hint,
  value,
  onChange,
  error,
}: DayPickerProps) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  function toggle(day: number) {
    const next = value.includes(day)
      ? value.filter((d) => d !== day)
      : [...value, day];
    onChange(next.sort((a, b) => a - b));
  }

  return (
    <fieldset
      aria-describedby={
        [errorId, hintId].filter(Boolean).join(' ') || undefined
      }
      className="min-w-0"
    >
      <legend className="mb-1.5 text-[13px] font-medium text-ink">
        {legend}
        <span className="ml-0.5 text-bad" aria-hidden="true">
          *
        </span>
      </legend>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEK_ORDER.map((day) => {
          const checked = value.includes(day);
          const name = dayName(day, 'fr');
          return (
            <label key={day} className="relative cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(day)}
                aria-invalid={error ? true : undefined}
                className="peer sr-only"
              />
              <span
                className={cx(
                  'flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl border text-xs font-semibold transition-[background-color,border-color,color,transform] active:scale-[0.97]',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand',
                  checked
                    ? 'border-brand bg-brand-soft text-brand'
                    : 'border-line-strong bg-panel text-ink-muted hover:border-brand/40 hover:text-ink',
                  error && !checked && 'border-bad/50',
                )}
              >
                <span aria-hidden="true">{name.slice(0, 3)}</span>
                <span className="sr-only">{name}</span>
                <span
                  aria-hidden="true"
                  className={cx(
                    'grid size-4 place-items-center rounded-full transition-opacity',
                    checked ? 'bg-brand text-on-brand' : 'opacity-0',
                  )}
                >
                  <Check size={10} strokeWidth={3.5} />
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p
          id={errorId}
          className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-bad"
        >
          <CircleAlert
            size={14}
            aria-hidden="true"
            className="mt-px shrink-0"
          />
          {error}
        </p>
      )}
      {hint && (
        <p
          id={hintId}
          className="mt-1.5 text-xs leading-relaxed text-ink-subtle"
        >
          {hint}
        </p>
      )}
    </fieldset>
  );
}
