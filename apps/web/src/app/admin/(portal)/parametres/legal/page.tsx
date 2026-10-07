'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, TriangleAlert } from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import {
  missingLegalNotices,
  toLegalPayload,
  type LegalFormValues,
  type LegalSettings,
} from '@/lib/admin/settings';
import { LEGAL_QUERY_KEY } from '@/lib/admin/settings-queries';
import { LegalForm } from '@/components/admin/settings/legal-form';
import {
  ErrorState,
  LoadingRegion,
  Skeleton,
  useToast,
} from '@/components/admin/ui';

/** `/admin/parametres/legal` : mentions légales, hébergeur et contact pour les droits sur les données. */
export default function LegalSettingsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const settings = useQuery({
    queryKey: LEGAL_QUERY_KEY,
    queryFn: () => backendJson<LegalSettings>('admin/settings/legal'),
  });

  async function save(values: LegalFormValues) {
    const saved = await backendJson<LegalSettings>('admin/settings/legal', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(toLegalPayload(values)),
    });
    queryClient.setQueryData(LEGAL_QUERY_KEY, saved);
    await invalidatePortalData(queryClient);
    toast.success('Informations enregistrées', {
      description: 'Les pages légales du site sont à jour.',
    });
  }

  if (settings.isLoading) {
    return (
      <LoadingRegion>
        <div className="space-y-5">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
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

  const missing = missingLegalNotices(settings.data);

  return (
    <div className="space-y-5">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
        Ces informations complètent les pages légales du site, en français comme
        en anglais.
        <Link
          href="/fr/mentions-legales"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 font-medium text-brand underline-offset-2 hover:underline"
        >
          Voir les mentions légales
          <ExternalLink size={13} aria-hidden="true" />
          <span className="sr-only">(s’ouvre dans un nouvel onglet)</span>
        </Link>
      </p>
      {missing.length > 0 && (
        <p
          role="note"
          className="flex items-start gap-2.5 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-[13px] leading-relaxed text-warn"
        >
          <TriangleAlert
            size={17}
            aria-hidden="true"
            className="mt-px shrink-0"
          />
          <span>
            À compléter avant la mise en ligne :{' '}
            <strong className="font-semibold">{missing.join(', ')}</strong>. Une
            mention vide n’est pas affichée, et les mentions légales d’une
            entreprise doivent en principe l’être (Code du numérique, art. 52).
          </span>
        </p>
      )}
      {/* `key` : après un enregistrement, le formulaire repart des valeurs du serveur. */}
      <LegalForm
        key={settings.data.updatedAt ?? 'original'}
        settings={settings.data}
        onSubmit={save}
      />
    </div>
  );
}
