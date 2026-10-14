import Image from 'next/image';
import { POLE_DEFAULT_IMAGES } from '@/lib/poles';

export type PoleKey = 'env' | 'eau' | 'ing';

/** Bande photo à gauche d'une ligne de pôle (remplace l'ancien motif de légende). */
export function PoleImage({ pole }: { pole: PoleKey }) {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-y-0 left-0 w-10 overflow-hidden border-r border-sand md:w-24"
    >
      <Image
        src={POLE_DEFAULT_IMAGES[pole]}
        alt=""
        fill
        sizes="96px"
        className="object-cover object-[50%_62%] transition-transform duration-700 group-hover:scale-110"
      />
    </span>
  );
}
