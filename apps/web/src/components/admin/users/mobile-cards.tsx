'use client';

import Link from 'next/link';
import { ChevronRight, Clock, Lock, RefreshCw, Trash2 } from 'lucide-react';
import { cx, focusRing } from '@/lib/admin/cx';
import { relativeTime } from '@/lib/admin/format';
import { isLocked, type Invitation, type UserSummary } from '@/lib/admin/users';
import { Badge, Button, StatusChip } from '../ui';
import { UserAvatar } from './user-avatar';

const shortDate = new Intl.DateTimeFormat('fr', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Compte : toute la carte mène à la fiche. */
export function AccountCard({
  user,
  isSelf,
}: {
  user: UserSummary;
  isSelf: boolean;
}) {
  return (
    <Link
      href={`/admin/utilisateurs/${user.id}`}
      className={cx(
        'flex items-center gap-3.5 rounded-2xl border border-line bg-panel p-4 transition-colors active:bg-sunken',
        focusRing,
      )}
    >
      <UserAvatar
        name={user.fullName}
        role={user.role}
        inactive={!user.isActive}
        size="md"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink">
            {user.fullName}
          </span>
          {isSelf && <Badge tone="brand">Vous</Badge>}
        </span>
        <span className="mt-0.5 block truncate text-xs text-ink-subtle">
          {user.email}
        </span>
        <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <StatusChip kind="role" value={user.role} />
          {user.isActive ? (
            <Badge tone="ok" dot>
              Actif
            </Badge>
          ) : (
            <Badge>Désactivé</Badge>
          )}
          {isLocked(user) && (
            <Badge tone="warn" icon={Lock}>
              Verrouillé
            </Badge>
          )}
        </span>
        <span className="mt-2 block text-xs text-ink-subtle">
          {user.lastActiveAt
            ? `Active ${relativeTime(user.lastActiveAt)}`
            : 'Jamais connecté'}
        </span>
      </span>
      <ChevronRight
        size={18}
        aria-hidden="true"
        className="shrink-0 text-ink-subtle"
      />
    </Link>
  );
}

/** Invitation : identité, état, puis deux actions pleine largeur (cibles tactiles de 40 px). */
export function InvitationCard({
  invitation,
  busy,
  onResend,
  onRevoke,
}: {
  invitation: Invitation;
  busy: boolean;
  onResend: () => void;
  onRevoke: () => void;
}) {
  const expired = invitation.status === 'EXPIRED';
  const expiry = shortDate.format(new Date(invitation.expiresAt));
  return (
    <article className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-center gap-3.5">
        <UserAvatar
          name={invitation.fullName}
          role={invitation.role}
          inactive={expired}
          size="md"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {invitation.fullName}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-subtle">
            {invitation.email}
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        <StatusChip kind="role" value={invitation.role} />
        {expired ? (
          <Badge tone="warn" icon={Clock}>
            Expirée
          </Badge>
        ) : (
          <Badge tone="brand" dot>
            En attente
          </Badge>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
        {expired ? `Expirée depuis le ${expiry}` : `Expire le ${expiry}`}
        {' · '}envoyée {relativeTime(invitation.lastSentAt)}
        {invitation.invitedBy && ` par ${invitation.invitedBy.fullName}`}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-line pt-4">
        <Button
          variant="secondary"
          icon={RefreshCw}
          block
          loading={busy}
          onClick={onResend}
          aria-label={`Renvoyer l’invitation à ${invitation.fullName}`}
        >
          Renvoyer
        </Button>
        <Button
          variant="secondary"
          icon={Trash2}
          block
          onClick={onRevoke}
          aria-label={`Retirer l’invitation de ${invitation.fullName}`}
        >
          Retirer
        </Button>
      </div>
    </article>
  );
}
