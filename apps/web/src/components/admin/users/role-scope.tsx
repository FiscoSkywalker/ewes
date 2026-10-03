import { Check, Minus } from 'lucide-react';
import { cx } from '@/lib/admin/cx';
import type { Role } from '@/lib/admin/roles';
import { ROLE_PROFILES } from '@/lib/admin/users';

/**
 * Ce qu'un rôle permet et ne permet pas, en listes courtes. Les coches et
 * tirets sont doublés d'un libellé caché pour les lecteurs d'écran.
 */
export function RoleScope({
  role,
  className,
}: {
  role: Role;
  className?: string;
}) {
  const profile = ROLE_PROFILES[role];
  return (
    <div className={cx('space-y-4', className)}>
      <ul className="space-y-2" aria-label={`${profile.label} : peut`}>
        {profile.can.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 text-[13px] leading-snug text-ink"
          >
            <Check
              size={15}
              strokeWidth={2.5}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-ok"
            />
            <span>
              <span className="sr-only">Peut : </span>
              {item}
            </span>
          </li>
        ))}
      </ul>
      {profile.cannot.length > 0 && (
        <ul
          className="space-y-2 border-t border-line pt-4"
          aria-label={`${profile.label} : ne peut pas`}
        >
          {profile.cannot.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-[13px] leading-snug text-ink-muted"
            >
              <Minus
                size={15}
                strokeWidth={2.5}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-ink-subtle"
              />
              <span>
                <span className="sr-only">Ne peut pas : </span>
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
