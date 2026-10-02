import { POLE_CODES, type PoleKey } from '@/lib/poles';
import { cx } from '@/lib/admin/cx';
import { POLE_TEXT } from '@/lib/admin/services';

/**
 * Motif de légende cartographique du pôle (points, vagues, hachures), le même
 * que sur le site public : un pôle se reconnaît dans le portail comme sur le
 * site. Décoratif — le nom du pôle l'accompagne toujours.
 */
export function PoleSwatch({
  pole,
  className,
}: {
  pole: PoleKey;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(`pole-${pole} pattern-swatch block`, className)}
    />
  );
}

/** Pastille « code du pôle » : motif + code (ENV, H₂O, ING), couleur d'accent du pôle. */
export function PoleTag({
  pole,
  className,
}: {
  pole: PoleKey;
  className?: string;
}) {
  return (
    <span
      className={cx(
        `pole-${pole} ${POLE_TEXT[pole]} inline-flex items-center gap-1.5 rounded-full border border-line bg-panel py-0.5 pl-0.5 pr-2.5 font-mono text-[11px] font-bold tracking-[0.12em]`,
        className,
      )}
    >
      <PoleSwatch
        pole={pole}
        className="size-[18px] rounded-full border border-line"
      />
      {POLE_CODES[pole]}
    </span>
  );
}

/** Pastille d'icône teintée de l'accent du pôle (fond à 11 %, comme les cartes du site). */
export function PoleIconTile({
  pole,
  size = 'md',
  children,
}: {
  pole: PoleKey;
  size?: 'md' | 'lg';
  children: React.ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        `pole-${pole} ${POLE_TEXT[pole]} grid shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--pole)_11%,transparent)]`,
        size === 'lg' ? 'size-12' : 'size-10',
      )}
    >
      {children}
    </span>
  );
}
