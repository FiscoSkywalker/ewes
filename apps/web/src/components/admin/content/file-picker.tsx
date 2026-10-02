'use client';

import { useId, useRef } from 'react';
import { CircleAlert, FileText, ImageIcon, Upload } from 'lucide-react';
import { formatBytes } from '@/lib/admin/public-documents';

/**
 * Sélecteur de fichier : zone cliquable, nom et taille du fichier choisi,
 * erreur éventuelle. Par défaut un PDF ; `accept` et `kind` l'adaptent à une image.
 */
export function FilePicker({
  file,
  error,
  onChange,
  disabled = false,
  accept = 'application/pdf,.pdf',
  kind = 'document',
  idleLabel = 'Choisir un fichier PDF',
}: {
  file: File | null;
  error: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  accept?: string;
  kind?: 'document' | 'image';
  idleLabel?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const Chosen = kind === 'image' ? ImageIcon : FileText;
  return (
    <div className="space-y-2">
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="sr-only"
      />
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand ${
          error
            ? 'border-bad bg-bad-soft/40'
            : 'border-line-strong hover:border-brand/50 hover:bg-sunken'
        }`}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
          {file ? (
            <Chosen size={20} aria-hidden="true" />
          ) : (
            <Upload size={20} aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium text-ink">
            {file ? file.name : idleLabel}
          </span>
          <span className="block text-xs text-ink-subtle">
            {file
              ? formatBytes(file.size)
              : 'Cliquez pour parcourir vos fichiers'}
          </span>
        </span>
        {file && (
          <span className="shrink-0 text-xs font-medium text-brand">
            Changer
          </span>
        )}
      </label>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
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
    </div>
  );
}
