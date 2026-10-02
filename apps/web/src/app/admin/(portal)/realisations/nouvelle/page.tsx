'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import {
  EMPTY_REALISATION,
  toPayload,
  type Realisation,
} from '@/lib/admin/realisations';
import { PageHeader } from '@/components/admin/page-header';
import { useToast } from '@/components/admin/ui';
import { RealisationForm } from '@/components/admin/realisations/realisation-form';

export default function NewRealisationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/admin/realisations"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Réalisations
      </Link>
      <PageHeader
        eyebrow="Contenus du site"
        title="Nouvelle réalisation"
        description="La fiche est créée en brouillon : elle n’apparaît sur le site qu’après votre publication explicite, depuis sa fiche."
      />
      <RealisationForm
        mode="create"
        defaults={EMPTY_REALISATION}
        submitLabel="Créer le brouillon"
        cancelHref="/admin/realisations"
        onSubmit={async (values) => {
          const created = await backendJson<Realisation>('admin/realisations', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(toPayload(values)),
          });
          await invalidatePortalData(queryClient);
          toast.success('Brouillon créé', {
            description:
              'Complétez la fiche, puis publiez-la depuis cette page.',
          });
          router.push(`/admin/realisations/${created.id}`);
        }}
      />
    </div>
  );
}
