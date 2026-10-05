import { cx } from '@/lib/admin/cx';
import type { Role } from '@/lib/admin/roles';
import { ROLE_PROFILES } from '@/lib/admin/users';
import { useAvatarSrc } from '../avatar';
import { initialsOf } from '../session';

const SIZES = {
  sm: 'size-9 text-xs',
  md: 'size-10 text-[13px]',
  lg: 'size-14 text-lg sm:size-16 sm:text-xl',
} as const;

/**
 * Monogramme d'un compte, teinté selon son rôle. Décoratif : le nom et le
 * rôle sont toujours écrits à côté (la teinte ne porte jamais seule le sens).
 * Un compte désactivé est grisé. Avec `userId` et `avatarVersion`, la photo du
 * compte s'affiche à la place des initiales (lecture réservée à l'Administrateur).
 */
export function UserAvatar({
  name,
  role,
  inactive = false,
  size = 'md',
  className,
  userId,
  avatarVersion,
}: {
  name: string;
  role: Role;
  inactive?: boolean;
  size?: keyof typeof SIZES;
  className?: string;
  userId?: string;
  avatarVersion?: string | null;
}) {
  const src = useAvatarSrc(userId ? avatarVersion : null, userId);
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold tracking-tight',
        SIZES[size],
        inactive ? 'bg-sunken text-ink-subtle' : ROLE_PROFILES[role].tile,
        className,
      )}
    >
      {src ? (
        // Photo privée lue par l'API puis exposée en adresse d'objet : next/image n'y apporte rien.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className={cx('size-full object-cover', inactive && 'grayscale')}
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
