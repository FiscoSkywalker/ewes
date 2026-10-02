'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import {
  EMPTY_DOCUMENT,
  toCreateFormData,
  type PublicDocument,
} from '@/lib/admin/public-documents';
import { PageHeader } from '@/components/admin/page-header';
import { useToast } from '@/components/admin/ui';
import { DocumentForm } from '@/components/admin/documents/document-form';

export default function NewPublicDocumentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/admin/documents-publics"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Documents publics
      </Link>
      <PageHeader
        eyebrow="Contenus du site"
        title="Publier un document"
        description="Le document est créé en brouillon : il n’apparaît sur le site qu’après votre publication explicite, depuis sa fiche."
      />
      <DocumentForm
        mode="create"
        defaults={EMPTY_DOCUMENT}
        submitLabel="Créer le brouillon"
        cancelHref="/admin/documents-publics"
        onSubmit={async (values, file) => {
          if (!file) return;
          // Multipart : le navigateur pose lui-même le type et la frontière.
          const created = await backendJson<PublicDocument>(
            'admin/documents-publics',
            { method: 'POST', body: toCreateFormData(values, file) },
          );
          await invalidatePortalData(queryClient);
          toast.success('Brouillon créé', {
            description: 'Relisez-le, puis publiez-le depuis sa fiche.',
          });
          router.push(`/admin/documents-publics/${created.id}`);
        }}
      />
    </div>
  );
}
