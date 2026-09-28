'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/api/admin-fetch';
import { AdminShell } from '@/components/admin/admin-shell';

interface MeResponse {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await adminFetch('/api/me');
      if (!res.ok) {
        throw new Error('UNAUTHENTICATED');
      }
      return res.json();
    },
  });

  // Le middleware ne vérifie que la présence du cookie de session (voir
  // src/middleware.ts) : un jeton d'accès expiré/révoqué n'est détecté
  // qu'ici, via le 401 de `GET /me` — c'est le filet de sécurité côté client.
  useEffect(() => {
    if (isError) {
      router.replace('/admin/login');
    }
  }, [isError, router]);

  if (isLoading || isError) {
    return null;
  }

  return (
    <AdminShell userLabel={data ? `${data.fullName} — ${data.role}` : undefined}>
      <h1 className="text-xl font-semibold text-(--color-text)">
        Tableau de bord
      </h1>
      <p className="mt-2 text-sm text-(--color-text-muted)">
        Bienvenue, {data?.fullName}. Les écrans de gestion (éditorial,
        documentaire, contacts) seront ajoutés au fur et à mesure des Phases
        02/03 du backlog.
      </p>
    </AdminShell>
  );
}
