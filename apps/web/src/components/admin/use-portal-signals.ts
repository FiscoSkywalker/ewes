'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { backendJson, type Paginated } from '@/lib/api/backend';
import type { NavBadge } from '@/lib/admin/navigation';
import type { Role } from '@/lib/admin/roles';

interface ContactMessage {
  id: string;
  name: string;
  organization: string | null;
  email: string;
  sector: string | null;
  subject: string | null;
  message: string;
  createdAt: string;
}

interface MailNotification {
  id: string;
  type: string;
  recipientEmail: string;
  subject: string | null;
  lastError: string | null;
  createdAt: string;
  failedAt: string | null;
}

export type SignalKind = 'contact' | 'email-failed';

export interface PortalSignal {
  id: string;
  kind: SignalKind;
  title: string;
  body: string;
  href: string;
  at: string;
}

const POLL_MS = 60_000;
const SIGNAL_LIMIT = 10;

/**
 * Éléments qui demandent une action, lus en direct dans l'API : nouveaux
 * messages de contact (Administrateur, Gestionnaire) et e-mails dont l'envoi
 * a définitivement échoué (Administrateur). Ils alimentent les pastilles de
 * la navigation et le panneau de notifications.
 *
 * Il n'existe pas (encore) de centre de notifications côté serveur
 * (blueprint/13_Notification_System.md §1) : ce panneau n'invente rien, il
 * reflète l'état réel des données. Seul l'état « lu » est local au
 * navigateur — un simple confort d'affichage.
 */
export function usePortalSignals(role: Role) {
  const isStaff = role === 'ADMINISTRATEUR' || role === 'GESTIONNAIRE';
  const isAdmin = role === 'ADMINISTRATEUR';

  const contacts = useQuery({
    queryKey: ['signals', 'contacts-new'],
    queryFn: () =>
      backendJson<Paginated<ContactMessage>>(
        `admin/contacts?status=NOUVEAU&limit=${SIGNAL_LIMIT}`,
      ),
    enabled: isStaff,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const failedEmails = useQuery({
    queryKey: ['signals', 'emails-failed'],
    queryFn: () =>
      backendJson<Paginated<MailNotification>>(
        `admin/notifications?status=failed&limit=${SIGNAL_LIMIT}`,
      ),
    enabled: isAdmin,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const signals = useMemo<PortalSignal[]>(() => {
    const list: PortalSignal[] = [];
    for (const message of contacts.data?.data ?? []) {
      list.push({
        id: `contact:${message.id}`,
        kind: 'contact',
        title: `Nouveau message de ${message.name}`,
        body:
          [message.organization, message.subject ?? message.sector]
            .filter(Boolean)
            .join(' · ') || message.message.slice(0, 120),
        href: `/admin/contacts/${message.id}`,
        at: message.createdAt,
      });
    }
    for (const mail of failedEmails.data?.data ?? []) {
      list.push({
        id: `email:${mail.id}`,
        kind: 'email-failed',
        title: 'Échec d’envoi d’un e-mail',
        body: `${mail.subject ?? mail.type} — à ${mail.recipientEmail}`,
        href: '/admin/emails',
        at: mail.failedAt ?? mail.createdAt,
      });
    }
    return list.sort((a, b) => b.at.localeCompare(a.at));
  }, [contacts.data, failedEmails.data]);

  const badges: Partial<Record<NavBadge, number>> = {
    'contacts-new': contacts.data?.meta.total,
    'emails-failed': failedEmails.data?.meta.total,
  };

  // Le panneau ne charge que les `SIGNAL_LIMIT` plus récents de chaque source :
  // le reste est annoncé (« + N autres ») plutôt que passé sous silence.
  const hiddenCount = Math.max(
    0,
    (contacts.data?.meta.total ?? 0) -
      (contacts.data?.data.length ?? 0) +
      (failedEmails.data?.meta.total ?? 0) -
      (failedEmails.data?.data.length ?? 0),
  );

  return {
    signals,
    hiddenCount,
    badges,
    isLoading: contacts.isLoading || failedEmails.isLoading,
    isError: contacts.isError || failedEmails.isError,
    refetch: () => {
      if (isStaff) void contacts.refetch();
      if (isAdmin) void failedEmails.refetch();
    },
  };
}

function seenKey(userId: string) {
  return `ewes.admin.notifications.seen.${userId}`;
}

/** Horodatage « tout lu jusqu'ici », mémorisé par navigateur et par compte. */
export function useSeenAt(userId: string) {
  const [seenAt, setSeenAt] = useState<string>(() => {
    try {
      return localStorage.getItem(seenKey(userId)) ?? '';
    } catch {
      return '';
    }
  });

  const markAllSeen = useCallback(() => {
    const now = new Date().toISOString();
    setSeenAt(now);
    try {
      localStorage.setItem(seenKey(userId), now);
    } catch {
      // Non mémorisé : l'état « lu » vaut pour cette visite seulement.
    }
  }, [userId]);

  return { seenAt, markAllSeen };
}
