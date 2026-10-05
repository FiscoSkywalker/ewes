'use client';

import Link from 'next/link';
import {
  ExternalLink,
  LifeBuoy,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Sun,
  UserRound,
} from 'lucide-react';
import { ROLE_LABELS } from '@/lib/admin/roles';
import { StatusChip } from '../ui';
import type { ThemePreference } from '@/lib/admin/theme';
import { PersonAvatar, useAvatarSrc } from '../avatar';
import type { Session } from '../session';
import { useTheme } from '../theme-provider';
import { usePopover } from '../use-popover';

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'dark', label: 'Sombre', icon: Moon },
  { value: 'system', label: 'Système', icon: Monitor },
];

export function Avatar({
  session,
  size = 'md',
}: {
  session: Session;
  size?: 'md' | 'lg';
}) {
  const src = useAvatarSrc(session.avatarVersion);
  return (
    <PersonAvatar
      name={session.fullName}
      src={src}
      size={size === 'lg' ? 'md' : 'sm'}
    />
  );
}

export function UserMenu({
  session,
  onLogout,
  loggingOut,
}: {
  session: Session;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const { open, toggle, close, triggerRef, panelRef } = usePopover();
  const { preference, setPreference } = useTheme();

  const itemClass =
    'flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[13px] text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink';

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Compte de ${session.fullName}`}
        className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-ink/5 aria-expanded:bg-ink/5 sm:pr-2.5"
      >
        <Avatar session={session} />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-36 truncate text-[13px] font-medium text-ink">
            {session.fullName}
          </span>
          <span className="block text-[11px] text-ink-subtle">
            {ROLE_LABELS[session.role]}
          </span>
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Compte"
          className="animate-pop-in absolute right-0 top-full z-50 mt-2 w-[290px] rounded-2xl border border-line bg-raised p-1.5 shadow-pop"
        >
          <div className="flex items-center gap-3 rounded-xl bg-sunken px-3 py-3">
            <Avatar session={session} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {session.fullName}
              </p>
              <p className="truncate text-xs text-ink-subtle">
                {session.email}
              </p>
              <div className="mt-1.5">
                <StatusChip kind="role" value={session.role} />
              </div>
            </div>
          </div>

          <div className="mt-1.5 flex flex-col gap-px">
            <Link
              href="/admin/profil"
              onClick={() => close(false)}
              className={itemClass}
            >
              <UserRound size={16} aria-hidden="true" />
              Mon profil
            </Link>
            <Link
              href="/admin/aide"
              onClick={() => close(false)}
              className={itemClass}
            >
              <LifeBuoy size={16} aria-hidden="true" />
              Guide d’utilisation
            </Link>
            <a href="/" target="_blank" rel="noopener" className={itemClass}>
              <ExternalLink size={16} aria-hidden="true" />
              Voir le site public
            </a>
          </div>

          <div className="my-1.5 border-t border-line" />

          <div className="px-2.5 pb-1 pt-0.5">
            <p
              id="theme-label"
              className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-subtle"
            >
              Apparence
            </p>
            <div
              role="radiogroup"
              aria-labelledby="theme-label"
              className="grid grid-cols-3 gap-1 rounded-lg bg-sunken p-1"
            >
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={preference === value}
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setPreference(value, {
                      x: rect.left + rect.width / 2,
                      y: rect.top + rect.height / 2,
                    });
                  }}
                  className="flex h-8 items-center justify-center gap-1.5 rounded-md text-xs font-medium text-ink-muted transition-all hover:text-ink aria-checked:bg-raised aria-checked:text-ink aria-checked:shadow-[0_1px_2px_rgba(16,42,52,.12)]"
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="my-1.5 border-t border-line" />

          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium text-bad transition-colors hover:bg-bad-soft disabled:opacity-60"
          >
            {loggingOut ? (
              <Loader2 size={16} aria-hidden="true" className="animate-spin" />
            ) : (
              <LogOut size={16} aria-hidden="true" />
            )}
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

/** Bascule rapide clair ↔ sombre (la préférence « Système » est dans le menu du compte). */
export function ThemeToggle() {
  const { resolved, setPreference } = useTheme();
  const next = resolved === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPreference(next, {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }}
      aria-label={
        next === 'dark' ? 'Passer en thème sombre' : 'Passer en thème clair'
      }
      title={next === 'dark' ? 'Thème sombre' : 'Thème clair'}
      className="relative grid size-9 place-items-center overflow-hidden rounded-lg text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
    >
      <Sun
        size={18}
        aria-hidden="true"
        className="absolute transition-all duration-500 dark:-translate-y-6 dark:rotate-90 dark:opacity-0"
      />
      <Moon
        size={17}
        aria-hidden="true"
        className="absolute translate-y-6 -rotate-90 opacity-0 transition-all duration-500 dark:translate-y-0 dark:rotate-0 dark:opacity-100"
      />
    </button>
  );
}
