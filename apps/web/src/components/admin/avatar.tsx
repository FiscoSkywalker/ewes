'use client';

import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/api/admin-fetch';
import { cx } from '@/lib/admin/cx';
import { initialsOf } from './session';

/**
 * Photo de la personne connectée, lue par l'API après authentification (c'est
 * un fichier privé : pas d'adresse publique, donc pas de `<img src>` direct).
 * Une adresse d'objet par version de photo, gardée pour la visite : quelques
 * dizaines de Ko, et la photo ne se relit que quand `version` change.
 * Sans photo, ou si la lecture échoue : `null`, et le monogramme s'affiche.
 */
export function useAvatarSrc(version: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ['profile', 'avatar', version],
    enabled: Boolean(version),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    queryFn: async () => {
      const response = await adminFetch('/api/backend/me/avatar');
      if (!response.ok) throw new Error('AVATAR_UNAVAILABLE');
      return URL.createObjectURL(await response.blob());
    },
  });
  return version ? (data ?? null) : null;
}

const SIZES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  hero: 'size-28 text-4xl sm:size-32 sm:text-5xl',
} as const;

/**
 * Pastille de la personne : sa photo, sinon ses initiales sur le dégradé du
 * portail. Décoratif : son nom est toujours écrit à côté.
 */
export function PersonAvatar({
  name,
  src,
  size = 'sm',
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand via-[#2f7f86] to-env font-semibold tracking-tight text-white ring-2 ring-panel dark:text-[#06161b]',
        SIZES[size],
        className,
      )}
    >
      {src ? (
        // Photo privée lue par l'API puis exposée en adresse d'objet : next/image n'y apporte rien.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
