'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  canAccess,
  navigationFor,
  resolveRoute,
  searchEntriesFor,
} from '@/lib/admin/navigation';
import { homePathFor } from '@/lib/admin/roles';
import { SessionContext, useMeQuery, type Session } from './session';
import { AccessDenied } from './states';
import { usePortalSignals, useSeenAt } from './use-portal-signals';
import { CommandPalette } from './shell/command-palette';
import { NotificationsMenu } from './shell/notifications-menu';
import { ShellSkeleton } from './shell/shell-skeleton';
import { Sidebar } from './shell/sidebar';
import { Topbar } from './shell/topbar';
import { ThemeToggle, UserMenu } from './shell/user-menu';

const SIDEBAR_STORAGE_KEY = 'ewes.admin.sidebar';

/**
 * Coquille du portail (blueprint/14_Admin_Backoffice.md §2,
 * blueprint/05_UI_UX_System.md §7) : vérifie la session, adapte la
 * navigation au rôle, puis monte l'écran demandé dans la zone de contenu.
 *
 * Rien ici n'accorde d'accès : la navigation filtrée et l'état « accès non
 * autorisé » évitent seulement d'afficher un écran que l'API refuserait de
 * toute façon (guards RBAC NestJS, blueprint/10_Security.md).
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isError } = useMeQuery();

  useEffect(() => {
    if (isError) {
      const next =
        pathname !== '/admin' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/admin/login${next}`);
    }
  }, [isError, pathname, router]);

  // L'Utilisateur n'a pas de tableau de bord : il arrive dans l'espace documentaire.
  const home = session ? homePathFor(session.role) : '/admin';
  const redirectHome = session && pathname === '/admin' && home !== '/admin';
  useEffect(() => {
    if (redirectHome) router.replace(home);
  }, [redirectHome, home, router]);

  if (!session || redirectHome) return <ShellSkeleton />;

  const allowed = canAccess(pathname, session.role);
  return (
    <SessionContext.Provider value={session}>
      <PortalFrame session={session} pathname={pathname} allowed={allowed}>
        {allowed ? children : <AccessDenied homeHref={home} />}
      </PortalFrame>
    </SessionContext.Provider>
  );
}

function subscribeDesktop(callback: () => void) {
  const media = window.matchMedia('(min-width: 1024px)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia('(min-width: 1024px)').matches,
    () => true,
  );
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  );
}

function PortalFrame({
  session,
  pathname,
  allowed,
  children,
}: {
  session: Session;
  pathname: string;
  /** Écran refusé : ni fil d'Ariane ni menu actif, pour ne rien révéler de la section. */
  allowed: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();
  const mainRef = useRef<HTMLElement>(null);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'collapsed';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [modKey] = useState(() =>
    /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl',
  );

  const groups = navigationFor(session.role);
  const route = allowed ? resolveRoute(pathname) : null;
  const signals = usePortalSignals(session.role);
  const { seenAt, markAllSeen } = useSeenAt(session.id);

  // Changement de page : le tiroir mobile se referme (ajustement pendant le
  // rendu plutôt qu'un effet) et le contenu repart en haut.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        collapsed ? 'collapsed' : 'expanded',
      );
    } catch {
      // Préférence non mémorisée : elle vaut pour cette visite.
    }
  }, [collapsed]);

  const toggleCollapsed = () => setCollapsed((value) => !value);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key === '/') {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (event.key === '[') {
        setCollapsed((value) => !value);
      } else if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    queryClient.clear();
    router.replace('/admin/login');
    router.refresh();
  }

  const isStaff = session.role !== 'UTILISATEUR';
  const effectiveCollapsed = collapsed && isDesktop;

  return (
    <div className="flex h-dvh overflow-hidden">
      <a
        href="#portal-main"
        className="sr-only z-70 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-brand focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Aller au contenu
      </a>

      <Sidebar
        groups={groups}
        route={route}
        badges={signals.badges}
        collapsed={effectiveCollapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        areaLabel={isStaff ? 'Administration' : 'Espace documentaire'}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-panel lg:rounded-2xl lg:border lg:border-line lg:shadow-panel">
          <Topbar
            route={route}
            modKey={modKey}
            onOpenMenu={() => setMobileOpen(true)}
            onOpenPalette={() => setPaletteOpen(true)}
            actions={
              <>
                <ThemeToggle />
                <NotificationsMenu
                  signals={signals.signals}
                  seenAt={seenAt}
                  onMarkAllSeen={markAllSeen}
                  isLoading={signals.isLoading}
                  isError={signals.isError}
                  onRetry={signals.refetch}
                  hasSources={isStaff}
                />
                <span
                  aria-hidden="true"
                  className="mx-1.5 h-6 w-px bg-line-strong"
                />
                <UserMenu
                  session={session}
                  onLogout={handleLogout}
                  loggingOut={loggingOut}
                />
              </>
            }
          />

          <main
            ref={mainRef}
            id="portal-main"
            tabIndex={-1}
            className="portal-scroll relative min-h-0 flex-1 overflow-y-auto outline-none"
          >
            <div
              aria-hidden="true"
              className="portal-aurora pointer-events-none absolute inset-x-0 top-0 h-72"
            />
            <div className="relative mx-auto w-full max-w-330 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
              {children}
            </div>
          </main>
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        entries={searchEntriesFor(session.role)}
        onLogout={handleLogout}
      />
    </div>
  );
}
