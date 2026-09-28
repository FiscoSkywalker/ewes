'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

interface AdminShellProps {
  children: React.ReactNode;
  userLabel?: string;
}

/**
 * Coquille du portail admin (blueprint/14_Admin_Backoffice.md §2) : navigation
 * + zone de contenu. Les écrans de gestion (éditorial, documentaire,
 * contacts, tableau de bord détaillé) viendront s'y monter au fur et à
 * mesure de la Phase 02/03 — seul le tableau de bord placeholder existe pour
 * l'instant (blueprint/21_Backlog_and_Session_Handoff.md).
 */
export function AdminShell({ children, userLabel }: AdminShellProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    queryClient.clear();
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh">
      <aside className="w-56 shrink-0 border-r border-(--color-border) bg-(--color-surface) p-4">
        <div className="mb-6 font-semibold text-(--color-primary)">
          EWES — Admin
        </div>
        <nav className="flex flex-col gap-2 text-sm">
          <span className="rounded-(--radius-control) bg-(--color-surface-muted) px-3 py-2 font-medium text-(--color-text)">
            Tableau de bord
          </span>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-(--color-border) bg-(--color-surface) px-6 py-3">
          <span className="text-sm text-(--color-text-muted)">
            {userLabel}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-(--radius-control) border border-(--color-border) px-3 py-1.5 text-sm text-(--color-text)"
          >
            Se déconnecter
          </button>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
