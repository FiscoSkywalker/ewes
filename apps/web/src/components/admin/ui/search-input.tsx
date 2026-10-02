'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Search, X } from 'lucide-react';
import { cx } from '@/lib/admin/cx';
import { controlClass } from './field';

export interface SearchInputProps extends Omit<
  ComponentProps<'input'>,
  'value' | 'onChange' | 'type'
> {
  value: string;
  onValueChange: (value: string) => void;
  /** Libellé accessible (le champ n'a pas de libellé visible). */
  label: string;
}

/**
 * Champ de recherche : icône, bouton d'effacement, Échap pour vider. À
 * combiner avec `useDebouncedValue` pour ne pas interroger l'API à chaque
 * frappe.
 */
export function SearchInput({
  value,
  onValueChange,
  label,
  placeholder = 'Rechercher…',
  className,
  ...props
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div role="search" className={cx('relative', className)}>
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
      />
      <input
        ref={inputRef}
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.preventDefault();
            onValueChange('');
          }
        }}
        className={cx(
          controlClass,
          'h-10 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden',
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onValueChange('');
            inputRef.current?.focus();
          }}
          aria-label="Effacer la recherche"
          className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-ink-subtle hover:bg-ink/5 hover:text-ink"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** Valeur stabilisée après `delay` ms sans changement (recherche, filtres). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
