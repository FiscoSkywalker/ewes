'use client';

import {
  createContext,
  useContext,
  useId,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { Check, ChevronDown, CircleAlert } from 'lucide-react';
import { cx, focusRing } from '@/lib/admin/cx';

/**
 * Champs de formulaire du portail. `Field` porte le libellé, l'aide et
 * l'erreur, et relie automatiquement le contrôle qu'il contient (`id`,
 * `aria-describedby`, `aria-invalid`, `required`). Les contrôles acceptent
 * `ref` et toutes les props natives : compatibles avec React Hook Form
 * (`{...register('titre')}`), prévu par blueprint/16_Rendering_State_Strategy.md §5.
 */

interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
  disabled: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

function useFieldControl(props: {
  id?: string;
  disabled?: boolean;
  required?: boolean;
  'aria-invalid'?: ComponentProps<'input'>['aria-invalid'];
  'aria-describedby'?: string;
}) {
  const field = useContext(FieldContext);
  return {
    id: props.id ?? field?.id,
    disabled: props.disabled ?? field?.disabled,
    required: props.required ?? (field?.required || undefined),
    'aria-invalid': props['aria-invalid'] ?? (field?.invalid || undefined),
    'aria-describedby':
      cx(props['aria-describedby'], field?.describedBy) || undefined,
  };
}

export interface FieldProps {
  label: ReactNode;
  /** Aide permanente sous le champ (format attendu, conséquence…). */
  hint?: ReactNode;
  /** Message d'erreur (remplace visuellement l'aide, qui reste lue). */
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  /** Élément aligné à droite du libellé (compteur, lien d'aide, onglets FR/EN). */
  aside?: ReactNode;
  /** Identifiant du contrôle ; généré si absent. */
  id?: string;
  className?: string;
  children: ReactNode;
}

export function Field({
  label,
  hint,
  error,
  required = false,
  disabled = false,
  aside,
  id,
  className,
  children,
}: FieldProps) {
  const generated = useId();
  const controlId = id ?? `field-${generated}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;

  return (
    <FieldContext.Provider
      value={{
        id: controlId,
        describedBy: cx(errorId, hintId) || undefined,
        invalid: Boolean(error),
        required,
        disabled,
      }}
    >
      <div className={cx('flex flex-col gap-1.5', className)}>
        <div className="flex min-h-5 items-end justify-between gap-3">
          <label
            htmlFor={controlId}
            className={cx(
              'text-[13px] font-medium',
              disabled ? 'text-ink-subtle' : 'text-ink',
            )}
          >
            {label}
            {required ? (
              <span className="ml-0.5 text-bad" aria-hidden="true">
                *
              </span>
            ) : (
              <span className="ml-1.5 text-xs font-normal text-ink-subtle">
                (facultatif)
              </span>
            )}
          </label>
          {aside}
        </div>
        {children}
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
        {hint && (
          <p id={hintId} className="text-xs leading-relaxed text-ink-subtle">
            {hint}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

/** Base visuelle commune : fond, bordure, focus, erreur, désactivé. */
export const controlClass = cx(
  'w-full rounded-lg border border-line-strong bg-panel text-[13.5px] text-ink transition-[border-color,box-shadow] placeholder:text-ink-subtle',
  'hover:border-ink-subtle/50',
  'focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15',
  'aria-invalid:border-bad aria-invalid:focus:ring-bad/15',
  'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-subtle',
);

export function Input({ className, ...props }: ComponentProps<'input'>) {
  const control = useFieldControl(props);
  return (
    <input
      {...props}
      {...control}
      className={cx(controlClass, 'h-10 px-3', className)}
    />
  );
}

export interface TextareaProps extends ComponentProps<'textarea'> {
  /** Affiche « n / maxLength » sous le champ (requiert `maxLength`). */
  showCount?: boolean;
}

export function Textarea({
  className,
  showCount = false,
  onChange,
  rows = 4,
  ...props
}: TextareaProps) {
  const control = useFieldControl(props);
  const initial = String(props.value ?? props.defaultValue ?? '').length;
  const [typed, setTyped] = useState(initial);
  // Contrôlé : la longueur suit `value` ; non contrôlé : elle suit la saisie.
  const count = props.value !== undefined ? String(props.value).length : typed;
  const max = props.maxLength;

  return (
    <div className="relative">
      <textarea
        rows={rows}
        {...props}
        {...control}
        onChange={(event) => {
          setTyped(event.target.value.length);
          onChange?.(event);
        }}
        className={cx(
          controlClass,
          'block min-h-20 resize-y px-3 py-2.5 leading-relaxed',
          showCount && max !== undefined && 'pb-7',
          className,
        )}
      />
      {showCount && max !== undefined && (
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute bottom-2 right-3 text-[11px] tabular-nums',
            count > max * 0.9 ? 'text-warn' : 'text-ink-subtle',
          )}
        >
          {count} / {max}
        </span>
      )}
    </div>
  );
}

/** Liste déroulante native (accessible et adaptée au mobile), habillée. */
export function Select({
  className,
  children,
  ...props
}: ComponentProps<'select'>) {
  const control = useFieldControl(props);
  return (
    <div className={cx('relative', className)}>
      <select
        {...props}
        {...control}
        className={cx(controlClass, 'h-10 appearance-none pl-3 pr-9')}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle"
      />
    </div>
  );
}

interface ChoiceProps extends Omit<ComponentProps<'input'>, 'type'> {
  label: ReactNode;
  description?: ReactNode;
}

/** Case à cocher avec libellé cliquable. */
export function Checkbox({
  label,
  description,
  className,
  id,
  ...props
}: ChoiceProps) {
  const generated = useId();
  const inputId = id ?? `check-${generated}`;
  const descId = description ? `${inputId}-desc` : undefined;
  return (
    <div className={cx('flex items-start gap-3', className)}>
      <span className="relative mt-0.5 grid size-[18px] shrink-0 place-items-center">
        <input
          id={inputId}
          type="checkbox"
          aria-describedby={descId}
          className={cx(
            'peer size-[18px] cursor-pointer appearance-none rounded-[5px] border border-line-strong bg-panel transition-colors checked:border-brand checked:bg-brand hover:border-brand/60 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-bad',
            focusRing,
          )}
          {...props}
        />
        <Check
          size={13}
          strokeWidth={3}
          aria-hidden="true"
          className="pointer-events-none absolute text-on-brand opacity-0 peer-checked:opacity-100"
        />
      </span>
      <label
        htmlFor={inputId}
        className="cursor-pointer text-[13px] leading-snug text-ink"
      >
        {label}
        {description && (
          <span id={descId} className="mt-0.5 block text-xs text-ink-subtle">
            {description}
          </span>
        )}
      </label>
    </div>
  );
}

/** Interrupteur (activation immédiate d'un réglage) — case à cocher native `role="switch"`. */
export function Switch({
  label,
  description,
  className,
  id,
  ...props
}: ChoiceProps) {
  const generated = useId();
  const inputId = id ?? `switch-${generated}`;
  const descId = description ? `${inputId}-desc` : undefined;
  return (
    <div className={cx('flex items-start justify-between gap-4', className)}>
      <label
        htmlFor={inputId}
        className="cursor-pointer text-[13px] leading-snug text-ink"
      >
        {label}
        {description && (
          <span id={descId} className="mt-0.5 block text-xs text-ink-subtle">
            {description}
          </span>
        )}
      </label>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          aria-describedby={descId}
          className={cx(
            'peer h-[22px] w-[38px] cursor-pointer appearance-none rounded-full bg-line-strong transition-colors checked:bg-brand disabled:cursor-not-allowed disabled:opacity-50',
            focusRing,
          )}
          {...props}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-[3px] top-[3px] size-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.25)] transition-transform duration-200 peer-checked:translate-x-4"
        />
      </span>
    </div>
  );
}

export { FieldContext };
