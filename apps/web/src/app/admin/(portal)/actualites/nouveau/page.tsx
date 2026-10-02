'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { EMPTY_ARTICLE, toPayload, type Article } from '@/lib/admin/articles';
import { PageHeader } from '@/components/admin/page-header';
import { useToast } from '@/components/admin/ui';
import { ArticleForm } from '@/components/admin/articles/article-form';

export default function NewArticlePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/admin/actualites"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Actualités & publications
      </Link>
      <PageHeader
        eyebrow="Contenus du site"
        title="Nouvel article"
        description="L’article est créé en brouillon : il n’apparaît sur le site qu’après votre publication explicite, depuis sa fiche."
      />
      <ArticleForm
        mode="create"
        defaults={EMPTY_ARTICLE}
        submitLabel="Créer le brouillon"
        cancelHref="/admin/actualites"
        onSubmit={async (values) => {
          const created = await backendJson<Article>('admin/articles', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(toPayload(values)),
          });
          await invalidatePortalData(queryClient);
          toast.success('Brouillon créé', {
            description:
              'Ajoutez une couverture et relisez-le, puis publiez-le depuis cette page.',
          });
          router.push(`/admin/actualites/${created.id}`);
        }}
      />
    </div>
  );
}
