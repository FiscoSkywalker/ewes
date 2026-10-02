'use client';

import { Check, Link2 } from 'lucide-react';
import { cx, focusRing } from '@/lib/admin/cx';
import { formatBytes } from '@/lib/admin/public-documents';
import { formatLabel, mediaName, type MediaItem } from '@/lib/admin/media';

/**
 * Vignette d'une image : un bouton qui ouvre la fiche, et — à côté, jamais
 * dedans — une case pour la sélectionner. L'usage est dit en toutes lettres
 * (« Utilisée »), pas seulement par une couleur. La case apparaît au survol ou
 * au focus, reste visible sur écran tactile et dès qu'une sélection existe.
 */
export function MediaTile({
  media,
  selected,
  selecting,
  onOpen,
  onToggle,
}: {
  media: MediaItem;
  selected: boolean;
  /** Au moins une image est sélectionnée : toutes les cases sont montrées. */
  selecting: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const name = mediaName(media);
  const used = media.usages.length;

  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ouvrir ${name}`}
        className={cx('block w-full rounded-xl text-left', focusRing)}
      >
        <span
          className={cx(
            'relative block aspect-[4/3] overflow-hidden rounded-xl border bg-sunken transition-[border-color,box-shadow]',
            selected
              ? 'border-brand ring-2 ring-brand'
              : 'border-line group-hover:border-line-strong',
          )}
        >
          {/* Image publique servie par l'API via `/uploads/*` : pas d'optimisation Next nécessaire dans le portail. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
          />
          {used > 0 && (
            <span className="absolute bottom-2 left-2 inline-flex h-[22px] items-center gap-1 rounded-full bg-panel/95 px-2 text-[11px] font-medium text-ink shadow-sm backdrop-blur">
              <Link2 size={11} aria-hidden="true" className="text-brand" />
              Utilisée{used > 1 ? ` · ${used}` : ''}
            </span>
          )}
        </span>
        <span className="mt-2 block px-0.5">
          <span className="block truncate text-[13px] font-medium text-ink">
            {name}
          </span>
          <span className="block truncate text-xs text-ink-subtle">
            {formatLabel(media.mimeType)} · {formatBytes(media.sizeBytes)}
          </span>
        </span>
      </button>

      <label
        className={cx(
          'absolute left-2 top-2 grid size-7 cursor-pointer place-items-center rounded-full border shadow-sm backdrop-blur transition-opacity',
          'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
          selected
            ? 'border-brand bg-brand text-on-brand opacity-100'
            : 'border-white/70 bg-black/35 text-transparent hover:bg-black/50',
          !selected &&
            !selecting &&
            'opacity-0 focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100',
        )}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Sélectionner ${name}`}
          className="sr-only"
        />
        <Check size={15} strokeWidth={3} aria-hidden="true" />
      </label>
    </li>
  );
}
