'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { ArrowLeft, CloudUpload, FileText } from 'lucide-react';
import { ApiError, backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { homePathFor } from '@/lib/admin/roles';
import {
  CATEGORY_LABELS,
  fileProblem,
  formatBytes,
  toFormValues,
  toUpdatePayload,
  type PublicDocument,
} from '@/lib/admin/public-documents';
import { PageHeader } from '@/components/admin/page-header';
import { useSession } from '@/components/admin/session';
import { PortalNotFound } from '@/components/admin/states';
import { PublicationPanel } from '@/components/admin/content/publication-panel';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  ErrorState,
  LoadingRegion,
  Skeleton,
  StatusChip,
  useConfirm,
  useToast,
} from '@/components/admin/ui';
import { DocumentForm } from '@/components/admin/documents/document-form';
import { FilePicker } from '@/components/admin/content/file-picker';

const detailKey = (id: string) => ['documents', 'detail', id];

export default function PublicDocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const query = useQuery({
    queryKey: detailKey(id),
    queryFn: () => backendJson<PublicDocument>(`admin/documents-publics/${id}`),
    retry: (count, error) =>
      !(error instanceof ApiError && [400, 404].includes(error.status)) &&
      count < 2,
  });

  if (
    query.error instanceof ApiError &&
    [400, 404].includes(query.error.status)
  ) {
    return <PortalNotFound homeHref={homePathFor(session.role)} />;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/documents-publics"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Documents publics
      </Link>
      {query.isLoading ? (
        <LoadingRegion>
          <Skeleton className="h-8 w-80" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </LoadingRegion>
      ) : query.error || !query.data ? (
        <ErrorState
          error={query.error}
          onRetry={() => query.refetch()}
          retrying={query.isRefetching}
          size="page"
        />
      ) : (
        <Detail document={query.data} />
      )}
    </div>
  );
}

/** Après une écriture : la fiche reçoit la réponse du serveur, le reste du portail se rafraîchit. */
async function applySaved(queryClient: QueryClient, saved: PublicDocument) {
  queryClient.setQueryData(detailKey(saved.id), saved);
  await invalidatePortalData(queryClient);
}

function Detail({ document }: { document: PublicDocument }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <StatusChip kind="content" value={document.status} />
            <Badge>{CATEGORY_LABELS[document.category]}</Badge>
          </span>
        }
        title={document.titleFr}
        description={
          document.titleEn ? (
            <span lang="en">{document.titleEn}</span>
          ) : undefined
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* `key` : après un enregistrement, le formulaire repart des valeurs du serveur. */}
        <DocumentForm
          key={document.updatedAt}
          mode="edit"
          defaults={toFormValues(document)}
          slugLocked={document.publishedAt !== null}
          submitLabel="Enregistrer les modifications"
          cancelHref="/admin/documents-publics"
          onSubmit={async (values) => {
            const saved = await backendJson<PublicDocument>(
              `admin/documents-publics/${document.id}`,
              {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(toUpdatePayload(values)),
              },
            );
            await applySaved(queryClient, saved);
            toast.success('Modifications enregistrées');
          }}
        />

        <div className="space-y-6">
          <PublicationPanel<PublicDocument>
            endpoint={`admin/documents-publics/${document.id}`}
            status={document.status}
            publishedAt={document.publishedAt}
            updatedAt={document.updatedAt}
            slug={document.slug}
            noun={{ label: 'document', feminine: false }}
            unpublishImpact="Il disparaît immédiatement du site public (et son fichier n’y est plus téléchargeable). Il reste en brouillon dans le portail."
            afterDeleteHref="/admin/documents-publics"
            onPublished={(saved) => applySaved(queryClient, saved)}
          />
          <FilePanel document={document} />
        </div>
      </div>
    </>
  );
}

function FilePanel({ document }: { document: PublicDocument }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  // Le sélecteur est remonté à neuf après un remplacement (vide le champ natif).
  const [pickerKey, setPickerKey] = useState(0);

  const replace = useMutation({
    mutationFn: (next: File) => {
      const data = new FormData();
      data.append('file', next);
      return backendJson<PublicDocument>(
        `admin/documents-publics/${document.id}/file`,
        { method: 'PUT', body: data },
      );
    },
    onSuccess: async (saved) => {
      await applySaved(queryClient, saved);
      setFile(null);
      setPickerKey((key) => key + 1);
      toast.success('Fichier remplacé');
    },
    onError: (error) => setFileError(describeReplaceError(error)),
  });

  async function startReplace() {
    if (!file) return;
    setFileError(null);
    if (document.status === 'PUBLISHED') {
      const ok = await confirm({
        title: 'Remplacer le fichier d’un document publié ?',
        description:
          'Le nouveau PDF est servi immédiatement sur le site, à la place de l’ancien (qui est supprimé).',
        confirmLabel: 'Remplacer',
      });
      if (!ok) return;
    }
    replace.mutate(file);
  }

  return (
    <Card title="Fichier PDF">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
          <FileText size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium text-ink">
            PDF · {formatBytes(document.fileSizeBytes)}
          </p>
          {document.pages && (
            <p className="text-xs text-ink-subtle">
              {document.pages} page{document.pages > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {/* Route réservée au personnel : un brouillon se relit avant publication. */}
        <ButtonLink
          href={`/api/backend/admin/documents-publics/${document.id}/file`}
          target="_blank"
          rel="noopener"
          variant="secondary"
          size="sm"
        >
          Ouvrir
        </ButtonLink>
      </div>

      <div className="mt-5 space-y-3 border-t border-line pt-5">
        <p className="text-[13px] font-medium text-ink">Remplacer le fichier</p>
        <FilePicker
          key={pickerKey}
          file={file}
          error={fileError}
          disabled={replace.isPending}
          onChange={(next) => {
            setFile(next);
            setFileError(next ? fileProblem(next) : null);
          }}
        />
        {file && !fileError && (
          <Button
            icon={CloudUpload}
            loading={replace.isPending}
            onClick={startReplace}
            block
          >
            Remplacer le fichier
          </Button>
        )}
      </div>
    </Card>
  );
}

function describeReplaceError(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Le fichier n’a pas pu être envoyé. Réessayez.';
}
