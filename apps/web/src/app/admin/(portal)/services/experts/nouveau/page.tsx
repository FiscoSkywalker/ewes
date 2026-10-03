'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { EMPTY_EXPERT, toPayload, type Expert } from '@/lib/admin/experts';
import { PageHeader } from '@/components/admin/page-header';
import { ExpertEditor } from '@/components/admin/experts/expert-editor';
import { Card, useToast } from '@/components/admin/ui';

export default function NewExpertPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/services/experts"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Experts
      </Link>
      <PageHeader
        eyebrow="Pôles & services"
        title="Nouvel expert"
        description="Le profil est créé en brouillon : il n’apparaît sur le site qu’après votre publication explicite, depuis sa fiche."
      />
      <ExpertEditor
        mode="create"
        defaults={EMPTY_EXPERT}
        submitLabel="Créer le brouillon"
        onSubmit={async (values) => {
          const created = await backendJson<Expert>('admin/experts', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(toPayload(values)),
          });
          await invalidatePortalData(queryClient);
          toast.success('Brouillon créé', {
            description:
              'Complétez le profil, puis publiez-le depuis cette page.',
          });
          router.push(`/admin/services/experts/${created.id}`);
        }}
        sidebar={
          <Card title="Publication">
            <div className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <UserPlus size={18} aria-hidden="true" />
              </span>
              <p className="text-[13px] leading-relaxed text-ink-muted">
                Enregistrez d’abord le brouillon : vous pourrez ensuite le
                publier. Tant qu’il n’est pas publié, personne d’autre que
                l’équipe du portail ne le voit.
              </p>
            </div>
          </Card>
        }
      />
    </div>
  );
}
