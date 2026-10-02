'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CircleAlert, FileText, Link2, TriangleAlert, X } from 'lucide-react';
import { ApiError, backendJson } from '@/lib/api/backend';
import { plural } from '@/lib/admin/format';
import { CATEGORY_LABELS } from '@/lib/admin/public-documents';
import {
  MAX_REALISATION_DOCUMENTS,
  type Realisation,
  type RealisationDocument,
} from '@/lib/admin/realisations';
import { Badge, Button, Card, IconButton, StatusChip, useToast } from '../ui';
import { DocumentPicker } from '../documents/document-picker';

/**
 * Documents publics associés à une réalisation (rapport, brochure…). La liste
 * s'enregistre d'un coup (`PUT :id/documents`). Un document qui n'est pas
 * publié reste dans la liste mais n'est pas montré sur le site : l'écran le dit.
 *
 * Le brouillon est comparé à ce que le serveur renvoie (`realisation`) : après
 * un enregistrement il lui est égal, sans qu'il faille remonter le composant.
 */
export function DocumentsCard({
  realisation,
  onSaved,
}: {
  realisation: Realisation;
  onSaved: (saved: Realisation) => Promise<unknown> | unknown;
}) {
  const toast = useToast();
  const saved = realisation.documents;
  const [documents, setDocuments] = useState<RealisationDocument[]>(saved);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    documents.map((d) => d.id).join() !== saved.map((d) => d.id).join();
  const room = MAX_REALISATION_DOCUMENTS - documents.length;
  const hidden = documents.filter((d) => d.status !== 'PUBLISHED').length;

  const save = useMutation({
    mutationFn: () =>
      backendJson<Realisation>(
        `admin/realisations/${realisation.id}/documents`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ documentIds: documents.map((d) => d.id) }),
        },
      ),
    onSuccess: async (result) => {
      await onSaved(result);
      toast.success('Documents enregistrés');
    },
    onError: (caught) =>
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Les documents n’ont pas pu être enregistrés. Réessayez.',
      ),
  });

  return (
    <Card
      title="Documents associés"
      description={
        documents.length === 0
          ? 'Rapports, brochures ou fiches liés à cette mission, à télécharger depuis sa fiche.'
          : `${plural(documents.length, 'document')} sur ${MAX_REALISATION_DOCUMENTS}.`
      }
      actions={
        <Button
          variant="secondary"
          size="sm"
          icon={Link2}
          disabled={room <= 0}
          onClick={() => setPicking(true)}
        >
          Associer des documents
        </Button>
      }
    >
      {documents.length === 0 ? (
        <p className="flex items-start gap-2 rounded-xl bg-sunken px-3.5 py-3 text-xs leading-relaxed text-ink-muted">
          <FileText size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
          Aucun document associé. Les documents viennent de la bibliothèque «
          Documents publics ».
        </p>
      ) : (
        <ul
          role="list"
          aria-label="Documents associés"
          className="divide-y divide-line overflow-hidden rounded-xl border border-line"
        >
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex items-center gap-3 px-3.5 py-3"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                <FileText size={16} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-ink">
                  {document.titleFr}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-subtle">
                  <Badge>{CATEGORY_LABELS[document.category]}</Badge>
                  {document.year && <span>{document.year}</span>}
                </span>
              </span>
              <StatusChip kind="content" value={document.status} />
              <IconButton
                icon={X}
                label={`Dissocier ${document.titleFr}`}
                size="sm"
                onClick={() =>
                  setDocuments(documents.filter((d) => d.id !== document.id))
                }
              />
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 && (
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-warn">
          <TriangleAlert
            size={14}
            aria-hidden="true"
            className="mt-0.5 shrink-0"
          />
          {hidden > 1
            ? `${hidden} documents ne sont pas publiés : ils n’apparaissent pas sur le site tant qu’ils ne le sont pas.`
            : 'Un document n’est pas publié : il n’apparaît pas sur le site tant qu’il ne l’est pas.'}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-1.5 text-xs font-medium text-bad"
        >
          <CircleAlert
            size={14}
            aria-hidden="true"
            className="mt-px shrink-0"
          />
          {error}
        </p>
      )}

      {dirty && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <p role="status" className="mr-auto text-xs text-ink-muted">
            Modifications non enregistrées
          </p>
          <Button
            variant="secondary"
            size="sm"
            disabled={save.isPending}
            onClick={() => {
              setDocuments(saved);
              setError(null);
            }}
          >
            Annuler
          </Button>
          <Button
            size="sm"
            loading={save.isPending}
            onClick={() => {
              setError(null);
              save.mutate();
            }}
          >
            Enregistrer les documents
          </Button>
        </div>
      )}

      <DocumentPicker
        open={picking}
        onClose={() => setPicking(false)}
        onConfirm={(chosen) =>
          setDocuments((current) => [
            ...current,
            ...chosen
              .filter((c) => !current.some((d) => d.id === c.id))
              .map<RealisationDocument>((c) => ({
                id: c.id,
                slug: c.slug,
                titleFr: c.titleFr,
                titleEn: c.titleEn,
                category: c.category,
                year: c.year,
                pages: c.pages,
                status: c.status,
                publishedAt: c.publishedAt,
              })),
          ])
        }
        disabledIds={documents.map((d) => d.id)}
        maxSelectable={room}
      />
    </Card>
  );
}
