import Image from 'next/image';

export type PoleKey = 'env' | 'eau' | 'ing';

/** Bande d'illustration à gauche d'une ligne de pôle (remplace l'ancien motif de légende). */
export function PoleImage({ pole }: { pole: PoleKey }) {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-y-0 left-0 w-10 overflow-hidden border-r border-sand md:w-24"
    >
      <Image
        src={`/assets/images/ewes-pole-${pole}.webp`}
        alt=""
        fill
        sizes="96px"
        className="object-cover object-[50%_62%] transition-transform duration-700 group-hover:scale-110"
      />
    </span>
  );
}
