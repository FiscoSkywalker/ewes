'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCheck,
  Inbox,
  MailWarning,
  RefreshCw,
} from 'lucide-react';
import { dayLabel, relativeTime } from '@/lib/admin/format';
import type { PortalSignal, SignalKind } from '../use-portal-signals';
import { usePopover } from '../use-popover';
import { Button } from '../ui';

const KIND_STYLE: Record<
  SignalKind,
  { icon: typeof Inbox; tile: string; label: string }
> = {
  contact: {
    icon: Inbox,
    tile: 'bg-brand-soft text-brand',
    label: 'Message de contact',
  },
  'email-failed': {
    icon: MailWarning,
    tile: 'bg-bad-soft text-bad',
    label: 'Envoi d’e-mail',
  },
};

type Tab = 'all' | 'unread';

interface NotificationsMenuProps {
  signals: PortalSignal[];
  seenAt: string;
  onMarkAllSeen: () => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** Le rôle n'a accès à aucune source de notification (Utilisateur). */
  hasSources: boolean;
}

export function NotificationsMenu({
  signals,
  seenAt,
  onMarkAllSeen,
  isLoading,
  isError,
  onRetry,
  hasSources,
}: NotificationsMenuProps) {
  const { open, toggle, close, triggerRef, panelRef } = usePopover();
  const [tab, setTab] = useState<Tab>('all');

  const unread = useMemo(
    () => signals.filter((signal) => signal.at > seenAt),
    [signals, seenAt],
  );
  const visible = tab === 'unread' ? unread : signals;

  const grouped = useMemo(() => {
    const groups: { label: string; items: PortalSignal[] }[] = [];
    for (const signal of visible) {
      const label = dayLabel(signal.at);
      const last = groups.at(-1);
      if (last?.label === label) last.items.push(signal);
      else groups.push({ label, items: [signal] });
    }
    return groups;
  }, [visible]);

  const unreadCount = unread.length;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          unreadCount
            ? `Notifications — ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
            : 'Notifications'
        }
        className="relative grid size-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink aria-expanded:bg-ink/5 aria-expanded:text-ink"
      >
        <Bell
          key={unreadCount}
          size={18}
          aria-hidden="true"
          className={unreadCount ? 'animate-ring' : ''}
        />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-panel tabular-nums dark:text-[#2a0b08]"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="animate-pop-in fixed inset-x-2 top-16 z-50 flex max-h-[min(560px,calc(100dvh-5rem))] flex-col overflow-hidden rounded-2xl border border-line bg-raised shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[400px]"
        >
          <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-3.5">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">
                Notifications
              </h2>
              <p className="text-xs text-ink-subtle">
                Éléments qui attendent une action
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllSeen}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-xs font-medium text-brand transition-colors hover:bg-brand-soft"
              >
                <CheckCheck size={15} aria-hidden="true" />
                Tout marquer lu
              </button>
            )}
          </header>

          {hasSources && (
            <div
              role="tablist"
              aria-label="Filtrer les notifications"
              className="mx-4 mb-2 flex gap-1 rounded-lg bg-sunken p-1"
            >
              {(
                [
                  ['all', 'Toutes', signals.length],
                  ['unread', 'Non lues', unreadCount],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium text-ink-muted transition-all aria-selected:bg-raised aria-selected:text-ink aria-selected:shadow-[0_1px_2px_rgba(16,42,52,.1)]"
                >
                  {label}
                  <span className="rounded-full bg-ink/8 px-1.5 text-[10px] tabular-nums">
                    {count}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="portal-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {isLoading ? (
              <ul aria-label="Chargement" className="space-y-1 p-2">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="flex gap-3 py-2">
                    <span className="portal-skeleton size-9 shrink-0 rounded-xl" />
                    <span className="flex-1 space-y-2">
                      <span className="portal-skeleton block h-3 w-3/4 rounded" />
                      <span className="portal-skeleton block h-3 w-1/2 rounded" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : isError ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <p className="text-sm font-medium text-ink">
                  Notifications indisponibles
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Le serveur n’a pas répondu. Vos données ne sont pas affectées.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RefreshCw}
                  onClick={onRetry}
                  className="mt-4"
                >
                  Réessayer
                </Button>
              </div>
            ) : visible.length === 0 ? (
              <EmptyNotifications
                unreadOnly={tab === 'unread'}
                hasSources={hasSources}
              />
            ) : (
              grouped.map((group) => (
                <section key={group.label} aria-label={group.label}>
                  <h3 className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                    {group.label}
                  </h3>
                  <ul>
                    {group.items.map((signal) => (
                      <NotificationRow
                        key={signal.id}
                        signal={signal}
                        unread={signal.at > seenAt}
                        onNavigate={() => close(false)}
                      />
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>

          {hasSources && (
            <footer className="border-t border-line p-2">
              <Link
                href="/admin/contacts"
                onClick={() => close(false)}
                className="flex h-9 items-center justify-center rounded-lg text-[13px] font-medium text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
              >
                Voir tous les messages
              </Link>
            </footer>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  signal,
  unread,
  onNavigate,
}: {
  signal: PortalSignal;
  unread: boolean;
  onNavigate: () => void;
}) {
  const kind = KIND_STYLE[signal.kind];
  const Icon = kind.icon;
  return (
    <li>
      <Link
        href={signal.href}
        onClick={onNavigate}
        className="group flex gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-ink/[0.04]"
      >
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-xl ${kind.tile}`}
        >
          <Icon size={17} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span
              className={`min-w-0 flex-1 text-[13px] leading-snug ${unread ? 'font-semibold text-ink' : 'text-ink-muted'}`}
            >
              {signal.title}
            </span>
            {unread && (
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand">
                <span className="sr-only">Non lue</span>
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-xs text-ink-subtle">
            {signal.body}
          </span>
          <span className="mt-1 block text-[11px] text-ink-subtle">
            {kind.label} · {relativeTime(signal.at)}
          </span>
        </span>
      </Link>
    </li>
  );
}

function EmptyNotifications({
  unreadOnly,
  hasSources,
}: {
  unreadOnly: boolean;
  hasSources: boolean;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="relative grid size-14 place-items-center rounded-2xl bg-sunken text-ink-subtle">
        <BellOff size={22} aria-hidden="true" />
        <span className="absolute -right-1 -top-1 size-3 rounded-full bg-env ring-4 ring-raised" />
      </span>
      <p className="mt-4 text-sm font-medium text-ink">
        {unreadOnly ? 'Tout est lu' : 'Rien à signaler'}
      </p>
      <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-ink-muted">
        {unreadOnly
          ? 'Vous avez pris connaissance de toutes les notifications.'
          : hasSources
            ? 'Les nouveaux messages de contact et les incidents d’envoi apparaîtront ici.'
            : 'Aucune notification pour le moment.'}
      </p>
    </div>
  );
}
