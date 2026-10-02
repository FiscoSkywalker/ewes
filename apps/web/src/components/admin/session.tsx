'use client';

import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/api/admin-fetch';
import { isRole, type Role } from '@/lib/admin/roles';

export interface Session {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export const SessionContext = createContext<Session | null>(null);

/** Utilisateur connecté (fourni par la coquille du portail). */
export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession doit être utilisé sous AdminShell');
  return session;
}

/**
 * Profil de l'utilisateur connecté (`GET /me`, via le BFF). Le proxy Next ne
 * vérifie que la présence du cookie de session (voir `src/proxy.ts`) : un
 * jeton expiré/révoqué n'est détecté qu'ici, par l'échec de cet appel — c'est
 * le filet de sécurité côté client. Le rôle sert uniquement à adapter
 * l'affichage ; l'API le revérifie à chaque requête.
 */
export function useMeQuery() {
  return useQuery<Session>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await adminFetch('/api/me');
      if (!res.ok) throw new Error('UNAUTHENTICATED');
      const data = await res.json();
      if (!isRole(data?.role)) throw new Error('UNAUTHENTICATED');
      return data as Session;
    },
    staleTime: 5 * 60_000,
  });
}

export function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : (parts[0]?.slice(0, 2) ?? '?');
  return letters.toUpperCase();
}

export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
