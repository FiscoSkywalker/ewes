'use client';

import { useId } from 'react';
import { Check } from 'lucide-react';
import { cx } from '@/lib/admin/cx';
import { ALL_ROLES, type Role } from '@/lib/admin/roles';
import { ROLE_PROFILES } from '@/lib/admin/users';

/**
 * Choix d'un rôle en cartes : un groupe de boutons radio natifs (flèches du
 * clavier, annonce « 1 sur 3 » par les lecteurs d'écran). La carte porte le
 * nom et la portée du rôle, pas seulement une couleur.
 */
export function RolePicker({
  value,
  onChange,
  legend,
  disabled = false,
  /** Rôle actuel d'un compte : repéré par « Rôle actuel » et non sélectionnable à nouveau. */
  current,
  error,
}: {
  value: Role;
  onChange: (role: Role) => void;
  legend: string;
  disabled?: boolean;
  current?: Role;
  error?: string;
}) {
  const name = useId();
  const errorId = `${name}-error`;
  return (
    <fieldset
      disabled={disabled}
      aria-describedby={error ? errorId : undefined}
      className="min-w-0"
    >
      <legend className="mb-2 text-[13px] font-medium text-ink">
        {legend}
      </legend>
      <div className="grid gap-2.5">
        {ALL_ROLES.map((role) => {
          const profile = ROLE_PROFILES[role];
          const Icon = profile.icon;
          const checked = value === role;
          return (
            <label
              key={role}
              className={cx(
                'group relative flex cursor-pointer items-start gap-3.5 rounded-xl border p-3.5 transition-[border-color,background-color,box-shadow]',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
                checked
                  ? 'border-brand bg-brand-soft/45 shadow-[0_0_0_1px_var(--ui-brand)]'
                  : 'border-line-strong bg-panel hover:border-brand/45 hover:bg-sunken/60',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                type="radio"
                name={name}
                value={role}
                checked={checked}
                onChange={() => onChange(role)}
                className="peer sr-only"
              />
              <span
                className={cx(
                  'grid size-10 shrink-0 place-items-center rounded-xl',
                  profile.tile,
                )}
              >
                <Icon size={19} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-ink">
                    {profile.label}
                  </span>
                  {current === role && (
                    <span className="rounded-full bg-ink/[0.07] px-2 py-px text-[11px] font-medium text-ink-muted">
                      Rôle actuel
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">
                  {profile.tagline}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cx(
                  'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors',
                  checked
                    ? 'border-brand bg-brand text-on-brand'
                    : 'border-line-strong bg-panel text-transparent',
                )}
              >
                <Check size={13} strokeWidth={3} />
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-2 text-xs font-medium text-bad">
          {error}
        </p>
      )}
    </fieldset>
  );
}
