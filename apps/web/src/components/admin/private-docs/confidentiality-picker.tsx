'use client';

import { useId } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { cx } from '@/lib/admin/cx';
import {
  CONFIDENTIALITY,
  CONFIDENTIALITY_LEVELS,
  type Confidentiality,
} from '@/lib/admin/private-docs';

export interface ConfidentialityOption {
  /** `''` : pas de niveau propre (le document suit son dossier). */
  value: Confidentiality | '';
  label: string;
  hint: string;
  /** Choix indisponible, avec sa raison écrite. */
  disabledReason?: string;
}

/** Les trois niveaux, tels quels (confidentialité d'un dossier). */
export const LEVEL_OPTIONS: ConfidentialityOption[] =
  CONFIDENTIALITY_LEVELS.map((value) => ({
    value,
    label: CONFIDENTIALITY[value].label,
    hint: CONFIDENTIALITY[value].hint,
  }));

/**
 * Choix du niveau de confidentialité : boutons radio natifs présentés en
 * cartes (flèches du clavier, cible large au doigt). Le niveau est dit par un
 * libellé et une phrase, jamais par la seule couleur.
 */
export function ConfidentialityPicker({
  legend,
  options,
  value,
  onChange,
  disabled = false,
  help,
}: {
  legend: string;
  options: ConfidentialityOption[];
  value: Confidentiality | '';
  onChange: (value: Confidentiality | '') => void;
  disabled?: boolean;
  help?: React.ReactNode;
}) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="text-[13px] font-medium text-ink">{legend}</legend>
      <div className="mt-1.5 grid gap-2">
        {options.map((option) => {
          const checked = option.value === value;
          const unavailable = Boolean(option.disabledReason);
          const Icon =
            option.value === '' || option.value === 'PUBLIC_INTERNE'
              ? LockOpen
              : Lock;
          return (
            <label
              key={option.value || 'inherit'}
              className={cx(
                'flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand',
                checked
                  ? 'border-brand bg-brand-soft'
                  : 'border-line-strong bg-panel hover:border-brand/40',
                (unavailable || disabled) && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                disabled={unavailable}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cx(
                  'mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border transition-colors',
                  checked ? 'border-brand bg-brand' : 'border-line-strong',
                )}
              >
                {checked && (
                  <span className="size-1.5 rounded-full bg-on-brand" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                  <Icon
                    size={13}
                    aria-hidden="true"
                    className={
                      option.value === 'CONFIDENTIEL'
                        ? 'text-bad'
                        : option.value === 'RESTREINT'
                          ? 'text-warn'
                          : 'text-ink-subtle'
                    }
                  />
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                  {option.disabledReason ?? option.hint}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {help && (
        <p className="mt-2 text-xs leading-relaxed text-ink-subtle">{help}</p>
      )}
    </fieldset>
  );
}
