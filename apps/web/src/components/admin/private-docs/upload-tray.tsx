'use client';

import { CircleAlert, CircleCheck, Loader2, RotateCcw, X } from 'lucide-react';
import { cx } from '@/lib/admin/cx';
import { plural } from '@/lib/admin/format';
import { formatBytes } from '@/lib/admin/private-docs';
import { Button, IconButton } from '../ui';
import type { PrivateUploadItem } from './use-private-upload';

/**
 * Suivi des téléversements : résumé annoncé aux lecteurs d'écran, avancement
 * réel de chaque fichier, raison de chaque refus et relance au cas par cas.
 * Les fichiers ajoutés sans encombre ne restent pas listés : ils apparaissent
 * dans leur dossier.
 */
export function UploadTray({
  items,
  onRetry,
  onDismiss,
  onClose,
}: {
  items: PrivateUploadItem[];
  onRetry: (key: number) => void;
  onDismiss: (key: number) => void;
  onClose: () => void;
}) {
  if (items.length === 0) return null;

  const done = items.filter((i) => i.status === 'done').length;
  const failed = items.filter((i) => i.status === 'error').length;
  const rows = items.filter((i) => i.status !== 'done');
  const finished = done + failed === items.length;
  const progress = Math.round(
    (items.reduce(
      (sum, item) => sum + (item.status === 'error' ? 1 : item.progress),
      0,
    ) /
      items.length) *
      100,
  );

  const summary = !finished
    ? `Envoi de ${plural(items.length, 'fichier')} — ${progress} %`
    : failed === 0
      ? `${plural(done, 'document ajouté', 'documents ajoutés')}`
      : `${plural(done, 'document ajouté', 'documents ajoutés')}, ${plural(failed, 'refusé', 'refusés')}`;

  return (
    <section
      aria-label="Téléversements"
      className="animate-rise-in overflow-hidden rounded-2xl border border-line bg-panel"
    >
      <header className="flex items-center gap-3 px-4 py-3">
        <span
          aria-hidden="true"
          className={cx(
            'grid size-8 shrink-0 place-items-center rounded-lg',
            !finished
              ? 'bg-brand-soft text-brand'
              : failed
                ? 'bg-warn-soft text-warn'
                : 'bg-ok-soft text-ok',
          )}
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
        aria-label="Avancement des téléversements"
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

      {rows.length > 0 && (
        <ul className="portal-scroll max-h-64 divide-y divide-line overflow-y-auto">
          {rows.map((item) => (
            <li key={item.key} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-ink">
                  {item.file.name}
                </p>
                <p
                  className={cx(
                    'text-xs',
                    item.status === 'error'
                      ? 'font-medium text-bad'
                      : 'truncate text-ink-subtle',
                  )}
                >
                  {item.status === 'queued' &&
                    `En attente · ${formatBytes(item.file.size)}`}
                  {item.status === 'uploading' &&
                    `${Math.round(item.progress * 100)} % de ${formatBytes(item.file.size)} · vers « ${item.folderName} »`}
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
                      size="lg"
                      onClick={() => onRetry(item.key)}
                    />
                  )}
                  <IconButton
                    icon={X}
                    label={`Retirer ${item.file.name} de la liste`}
                    size="lg"
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
