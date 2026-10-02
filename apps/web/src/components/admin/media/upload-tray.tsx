'use client';

import { CircleAlert, CircleCheck, Loader2, RotateCcw, X } from 'lucide-react';
import { plural } from '@/lib/admin/format';
import { Button, IconButton } from '../ui';
import type { UploadItem } from './use-media-upload';

/**
 * Suivi des envois en cours : une ligne par image (en attente, en cours,
 * ajoutée ou refusée avec sa raison), barre d'avancement globale et relance
 * fichier par fichier. Le résumé est annoncé aux lecteurs d'écran.
 */
export function UploadTray({
  items,
  onRetry,
  onDismiss,
  onClose,
}: {
  items: UploadItem[];
  onRetry: (key: number) => void;
  onDismiss: (key: number) => void;
  /** Ferme le suivi une fois tout traité (échecs compris). */
  onClose: () => void;
}) {
  if (items.length === 0) return null;

  const done = items.filter((i) => i.status === 'done').length;
  const failed = items.filter((i) => i.status === 'error').length;
  const rows = items.filter((i) => i.status !== 'done');
  const pending = items.length - done - failed;
  const finished = pending === 0;
  const progress = Math.round(((done + failed) / items.length) * 100);

  const summary = !finished
    ? `Envoi de ${plural(items.length, 'image')} — ${done + failed} sur ${items.length} traitée${done + failed > 1 ? 's' : ''}`
    : failed === 0
      ? `${plural(done, 'image ajoutée', 'images ajoutées')} à la médiathèque`
      : `${plural(done, 'image ajoutée', 'images ajoutées')}, ${plural(failed, 'refusée', 'refusées')}`;

  return (
    <section
      aria-label="Envois en cours"
      className="animate-rise-in overflow-hidden rounded-2xl border border-line bg-panel"
    >
      <header className="flex items-center gap-3 px-4 py-3">
        <span
          aria-hidden="true"
          className={`grid size-8 shrink-0 place-items-center rounded-lg ${
            !finished
              ? 'bg-brand-soft text-brand'
              : failed
                ? 'bg-warn-soft text-warn'
                : 'bg-ok-soft text-ok'
          }`}
        >
          {!finished ? (
            <Loader2 size={16} className="animate-spin" />
          ) : failed ? (
            <CircleAlert size={16} />
          ) : (
            <CircleCheck size={16} />
          )}
        </span>
        <p
          role="status"
          className="min-w-0 flex-1 text-[13px] font-medium text-ink"
        >
          {summary}
        </p>
        {finished && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fermer
          </Button>
        )}
      </header>

      <div
        role="progressbar"
        aria-label="Avancement des envois"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        className="h-1 bg-sunken"
      >
        <div
          className="h-full bg-brand transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Les envois réussis sont comptés dans l'en-tête : la liste ne garde que ce qui demande attention. */}
      {rows.length > 0 && (items.length > 1 || failed > 0) && (
        <ul className="portal-scroll max-h-56 divide-y divide-line overflow-y-auto">
          {rows.map((item) => (
            <li key={item.key} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-ink">
                  {item.file.name}
                </p>
                <p
                  className={`truncate text-xs ${
                    item.status === 'error'
                      ? 'font-medium text-bad'
                      : 'text-ink-subtle'
                  }`}
                >
                  {item.status === 'queued' && 'En attente'}
                  {item.status === 'uploading' && 'Envoi en cours…'}
                  {item.status === 'error' && item.error}
                </p>
              </div>
              {item.status === 'uploading' && (
                <Loader2
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 animate-spin text-brand"
                />
              )}
              {item.status === 'error' && (
                <>
                  {/* Un fichier refusé (type, poids) le serait encore : on ne relance que les échecs d'envoi. */}
                  {item.retryable && (
                    <IconButton
                      icon={RotateCcw}
                      label={`Réessayer ${item.file.name}`}
                      size="sm"
                      onClick={() => onRetry(item.key)}
                    />
                  )}
                  <IconButton
                    icon={X}
                    label={`Retirer ${item.file.name} de la liste`}
                    size="sm"
                    onClick={() => onDismiss(item.key)}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
