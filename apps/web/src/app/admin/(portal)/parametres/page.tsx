'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import {
  toGeneralPayload,
  type GeneralFormValues,
  type GeneralSettings,
} from '@/lib/admin/settings';
import { GENERAL_QUERY_KEY } from '@/lib/admin/settings-queries';
import { GeneralForm } from '@/components/admin/settings/general-form';
import {
  ErrorState,
  LoadingRegion,
  Skeleton,
  useToast,
} from '@/components/admin/ui';

/** `/admin/parametres` : coordonnées, adresse, horaires et réseaux sociaux du site. */
export default function GeneralSettingsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const settings = useQuery({
    queryKey: GENERAL_QUERY_KEY,
    queryFn: () => backendJson<GeneralSettings>('admin/settings/general'),
  });

  async function save(values: GeneralFormValues) {
    const saved = await backendJson<GeneralSettings>(
      'admin/settings/general',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toGeneralPayload(values)),
      },
    );
    // La réponse du serveur fait foi (adresses normalisées, jours triés).
    queryClient.setQueryData(GENERAL_QUERY_KEY, saved);
    await invalidatePortalData(queryClient);
    toast.success('Réglages enregistrés', {
      description: 'Les changements sont visibles sur le site.',
    });
  }

  if (settings.isLoading) {
    return (
      <LoadingRegion>
        <div className="space-y-5">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </LoadingRegion>
    );
  }
  if (settings.error || !settings.data) {
    return (
      <ErrorState
        error={settings.error}
        onRetry={() => settings.refetch()}
        retrying={settings.isRefetching}
      />
    );
  }

  return (
    <div className="space-y-5">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
        Ce qui s’affiche ici est repris sur tout le site, en français comme en
        anglais.
        <Link
          href="/fr/contact"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 font-medium text-brand underline-offset-2 hover:underline"
        >
          Voir la page Contact
          <ExternalLink size={13} aria-hidden="true" />
          <span className="sr-only">(s’ouvre dans un nouvel onglet)</span>
        </Link>
      </p>
      {/* `key` : après un enregistrement, le formulaire repart des valeurs du serveur. */}
      <GeneralForm
        key={settings.data.updatedAt ?? 'original'}
        settings={settings.data}
        onSubmit={save}
      />
    </div>
  );
}
