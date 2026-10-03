import { cx } from '@/lib/admin/cx';
import type { Role } from '@/lib/admin/roles';
import { ROLE_PROFILES } from '@/lib/admin/users';
import { initialsOf } from '../session';

const SIZES = {
  sm: 'size-9 text-xs',
  md: 'size-10 text-[13px]',
  lg: 'size-14 text-lg sm:size-16 sm:text-xl',
} as const;

/**
 * Monogramme d'un compte, teinté selon son rôle. Décoratif : le nom et le
 * rôle sont toujours écrits à côté (la teinte ne porte jamais seule le sens).
 * Un compte désactivé est grisé.
 */
export function UserAvatar({
  name,
  role,
  inactive = false,
  size = 'md',
  className,
}: {
  name: string;
  role: Role;
  inactive?: boolean;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid shrink-0 place-items-center rounded-full font-semibold tracking-tight',
        SIZES[size],
        inactive ? 'bg-sunken text-ink-subtle' : ROLE_PROFILES[role].tile,
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
