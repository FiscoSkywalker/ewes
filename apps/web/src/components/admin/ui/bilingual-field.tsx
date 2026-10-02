'use client';

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { cx, focusRing } from '@/lib/admin/cx';
import { FieldContext } from './field';

export type ContentLocale = 'fr' | 'en';

const LOCALES: { value: ContentLocale; short: string; name: string }[] = [
  { value: 'fr', short: 'FR', name: 'Français' },
  { value: 'en', short: 'EN', name: 'English' },
];

export interface BilingualFieldProps {
  label: ReactNode;
  hint?: ReactNode;
  /** Langues obligatoires (le français par défaut, l'anglais complète). */
  requiredLocales?: ContentLocale[];
  errors?: Partial<Record<ContentLocale, string | null | undefined>>;
  /** Langues déjà renseignées : une version manquante est signalée sur son onglet. */
  filled?: Partial<Record<ContentLocale, boolean>>;
  /** Rend le contrôle d'une langue (`Input`, `Textarea`…), relié automatiquement. */
  children: (locale: ContentLocale) => ReactNode;
  className?: string;
}

/**
 * Champ de contenu bilingue (blueprint/19_AI_Coding_Rules.md §5 : le FR/EN
 * est porté par le modèle dès sa création). Les deux versions restent
 * montées (l'onglet masqué garde sa saisie) ; un onglet signale une erreur ou
 * une traduction manquante sans dépendre de la seule couleur.
 */
export function BilingualField({
  label,
  hint,
  requiredLocales = ['fr'],
  errors = {},
  filled,
  children,
  className,
}: BilingualFieldProps) {
  const base = `bilingual-${useId()}`;
  const [active, setActive] = useState<ContentLocale>('fr');

  // Après un envoi refusé, si seule la langue masquée est en erreur, on
  // l'affiche (ajustement pendant le rendu plutôt qu'un effet).
  const errorKey = `${Boolean(errors.fr)}:${Boolean(errors.en)}`;
  const [lastErrorKey, setLastErrorKey] = useState(errorKey);
  if (errorKey !== lastErrorKey) {
    setLastErrorKey(errorKey);
    const other = active === 'fr' ? 'en' : 'fr';
    if (!errors[active] && errors[other]) setActive(other);
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = active === 'fr' ? 'en' : 'fr';
    setActive(next);
    document.getElementById(`${base}-tab-${next}`)?.focus();
  }

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <div className="flex min-h-5 items-end justify-between gap-3">
        <label
          htmlFor={`${base}-${active}`}
          className="text-[13px] font-medium text-ink"
        >
          {label}
          {requiredLocales.length > 0 && (
            <span className="ml-0.5 text-bad" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <div
          role="tablist"
          aria-label="Langue du contenu"
          className="flex gap-0.5 rounded-md bg-sunken p-0.5"
        >
          {LOCALES.map(({ value, short, name }) => {
            const selected = value === active;
            const hasError = Boolean(errors[value]);
            const missing = filled && !filled[value] && !hasError;
            return (
              <button
                key={value}
                id={`${base}-tab-${value}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${base}-panel-${value}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(value)}
                onKeyDown={onTabKey}
                title={name}
                className={cx(
                  'relative flex h-6 items-center gap-1 rounded px-2 text-[11px] font-semibold tracking-wide transition-colors',
                  focusRing,
                  selected
                    ? 'bg-raised text-ink shadow-[0_1px_2px_rgba(16,42,52,.12)]'
                    : 'text-ink-subtle hover:text-ink',
                )}
              >
                {short}
                {hasError && (
                  <>
                    <CircleAlert
                      size={11}
                      aria-hidden="true"
                      className="text-bad"
                    />
                    <span className="sr-only"> — à corriger</span>
                  </>
                )}
                {missing && (
                  <>
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-warn"
                    />
                    <span className="sr-only"> — non renseigné</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {LOCALES.map(({ value }) => {
        const error = errors[value];
        const controlId = `${base}-${value}`;
        const errorId = error ? `${controlId}-error` : undefined;
        const hintId = hint ? `${base}-hint` : undefined;
        return (
          <div
            key={value}
            id={`${base}-panel-${value}`}
            role="tabpanel"
            aria-labelledby={`${base}-tab-${value}`}
            hidden={value !== active}
            className="flex flex-col gap-1.5"
          >
            <FieldContext.Provider
              value={{
                id: controlId,
                describedBy: cx(errorId, hintId) || undefined,
                invalid: Boolean(error),
                required: requiredLocales.includes(value),
                disabled: false,
              }}
            >
              {children(value)}
            </FieldContext.Provider>
            {error && (
              <p
                id={errorId}
                className="flex items-start gap-1.5 text-xs font-medium text-bad"
              >
                <CircleAlert
                  size={14}
                  aria-hidden="true"
                  className="mt-px shrink-0"
                />
                {error}
              </p>
            )}
            {value === 'en' && !requiredLocales.includes('en') && (
              <p className="text-xs text-ink-subtle">
                Facultatif : sans version anglaise, le site en anglais affiche
                le texte français.
              </p>
            )}
          </div>
        );
      })}

      {hint && (
        <p
          id={`${base}-hint`}
          className="text-xs leading-relaxed text-ink-subtle"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
