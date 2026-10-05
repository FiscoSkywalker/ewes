'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, UserMinus } from 'lucide-react';
import { cx, focusRing } from '@/lib/admin/cx';
import { formatShortDate, type GrantUser } from '@/lib/admin/private-docs';
import { Button, StatusChip } from '../../ui';
import { UserAvatar } from '../../users/user-avatar';

const TABS = [
  { href: '/admin/documents/droits', label: 'Par dossier' },
  { href: '/admin/documents/droits/documents', label: 'Par document' },
];

/** Bascule entre les deux vues des droits (liens : chaque vue a son adresse). */
export function RightsTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Vues des droits d’accès"
      className="inline-flex max-w-full gap-0.5 rounded-xl bg-sunken p-1"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'flex h-10 items-center whitespace-nowrap rounded-lg px-4 text-[13px] font-medium transition-[background-color,color,box-shadow] sm:h-9',
              focusRing,
              active
                ? 'bg-raised text-ink shadow-[0_1px_2px_rgba(16,42,52,.12)]'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Rappel permanent : les administrateurs ne figurent pas dans les listes, ils ont accès à tout. */
export function AdminsNote() {
  return (
    <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-subtle">
      <ShieldCheck size={14} aria-hidden="true" className="mt-px shrink-0" />
      Les administrateurs accèdent à tout l’espace documentaire : ils ne
      figurent pas dans cette liste.
    </p>
  );
}

/**
 * Une personne et son droit. Sur petit écran, « Retirer » passe sous
 * l'identité en pleine largeur (cible de 40 px) ; au-delà il reste en bout de ligne.
 */
export function PersonRow({
  user,
  detail,
  since,
  onRevoke,
  aside,
}: {
  user: GrantUser;
  /** Ce que la personne peut faire, ou d'où vient son accès. */
  detail: React.ReactNode;
  since?: string;
  onRevoke?: () => void;
  aside?: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <UserAvatar name={user.fullName} role={user.role} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/admin/utilisateurs/${user.id}`}
              className={cx(
                'truncate rounded text-[13.5px] font-medium text-ink hover:underline',
                focusRing,
              )}
            >
              {user.fullName}
            </Link>
            <StatusChip kind="role" value={user.role} />
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-subtle">
            {user.email}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {detail}
            {since && (
              <span className="text-ink-subtle">
                {' '}
                · depuis le {formatShortDate(since)}
              </span>
            )}
          </p>
        </div>
      </div>
      {aside}
      {onRevoke && (
        <Button
          variant="secondary"
          icon={UserMinus}
          onClick={onRevoke}
          aria-label={`Retirer l’accès de ${user.fullName}`}
          className="w-full sm:h-8 sm:w-auto sm:px-3 sm:text-xs"
        >
          Retirer
        </Button>
      )}
    </li>
  );
}

/** Ce qu'un droit de dossier permet, selon le rôle (blueprint/11 §3, règle 2). */
export const folderEffect = (role: GrantUser['role']) =>
  role === 'GESTIONNAIRE'
    ? 'Consulte, téléverse, classe et archive'
    : 'Consulte et télécharge';
