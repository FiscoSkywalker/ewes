'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Handshake,
  Pencil,
  SearchX,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { ApiError, backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { plural } from '@/lib/admin/format';
import { MAX_PARTNER_NAME, type PartnerEntry } from '@/lib/admin/realisations';
import { PageHeader } from '@/components/admin/page-header';
import {
  Badge,
  Button,
  ButtonLink,
  DataTable,
  Dialog,
  EmptyState,
  Field,
  Input,
  SearchInput,
  useConfirm,
  useDebouncedValue,
  useToast,
  type Column,
} from '@/components/admin/ui';

const SHOWN_REALISATIONS = 3;

export default function PartnersPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [renaming, setRenaming] = useState<PartnerEntry | null>(null);
  const q = useDebouncedValue(search.trim());

  const list = useQuery({
    queryKey: ['realisations', 'partners', 'directory', 'screen', q],
    queryFn: () => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      return backendJson<{ data: PartnerEntry[]; meta: { total: number } }>(
        `admin/realisation-partners?${params}`,
      );
    },
  });

  async function remove(partner: PartnerEntry) {
    let removed = 0;
    const ok = await confirm({
      title: `Retirer « ${partner.name} » ?`,
      description: `${partner.name} sera retiré de ${plural(partner.count, 'réalisation')}. Les réalisations elles-mêmes ne sont pas touchées. Cette action est irréversible.`,
      confirmLabel: 'Retirer partout',
      tone: 'danger',
      onConfirm: async () => {
        const result = await backendJson<{ removed: number }>(
          'admin/realisation-partners/remove',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: partner.name }),
          },
        );
        removed = result.removed;
      },
    });
    if (!ok) return;
    await invalidatePortalData(queryClient);
    toast.success(
      `${partner.name} retiré de ${plural(removed, 'réalisation')}`,
    );
  }

  const columns: Column<PartnerEntry>[] = [
    {
      id: 'name',
      header: 'Organisation',
      className: 'min-w-48',
      cell: (p) => (
        <span className="block">
          <span className="block font-medium text-ink">{p.name}</span>
          {p.variants.length > 0 && (
            <span className="mt-1 flex items-start gap-1.5 text-xs text-warn">
              <TriangleAlert
                size={13}
                aria-hidden="true"
                className="mt-px shrink-0"
              />
              Écrit aussi : {p.variants.join(', ')}
            </span>
          )}
        </span>
      ),
    },
    {
      id: 'count',
      header: 'Réalisations',
      className: 'whitespace-nowrap',
      cell: (p) => <Badge tone="brand">{p.count}</Badge>,
    },
    {
      id: 'realisations',
      header: 'Citée dans',
      hideBelow: 'md',
      className: 'max-w-md',
      cell: (p) => (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {p.realisations.slice(0, SHOWN_REALISATIONS).map((r) => (
            <Link
              key={r.id}
              href={`/admin/realisations/${r.id}`}
              className="max-w-56 truncate text-ink-muted underline-offset-2 hover:text-brand hover:underline"
            >
              {r.titleFr}
            </Link>
          ))}
          {p.realisations.length > SHOWN_REALISATIONS && (
            <span className="text-ink-subtle">
              +{p.realisations.length - SHOWN_REALISATIONS}
            </span>
          )}
        </span>
      ),
    },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'end',
      className: 'whitespace-nowrap',
      cell: (p) => (
        <span className="inline-flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={Pencil}
            onClick={() => setRenaming(p)}
            aria-label={`Renommer ${p.name}`}
          >
            <span className="max-sm:sr-only">
              {p.variants.length > 0 ? 'Unifier' : 'Renommer'}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => remove(p)}
            aria-label={`Retirer ${p.name} de toutes les réalisations`}
          >
            <span className="text-bad max-sm:sr-only">Retirer</span>
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contenus du site · Réalisations"
        title="Partenaires & bailleurs"
        description="Les organisations citées dans les réalisations, chacune une seule fois. Corrigez une faute ou unifiez deux graphies ici : le changement vaut pour toutes les réalisations. Pour ajouter un partenaire à une mission, ouvrez sa fiche."
        actions={
          <ButtonLink href="/admin/realisations" variant="secondary">
            Voir les réalisations
          </ButtonLink>
        }
      />

      <SearchInput
        label="Rechercher une organisation"
        placeholder="Nom de l’organisation…"
        value={search}
        onValueChange={setSearch}
        className="w-full sm:w-80"
      />

      <DataTable
        caption="Partenaires et bailleurs"
        columns={columns}
        rows={list.data?.data}
        getRowId={(p) => p.name}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => list.refetch()}
        empty={
          q ? (
            <EmptyState
              icon={SearchX}
              title="Aucun résultat"
              description={`Aucune organisation ne correspond à « ${q} ».`}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSearch('')}
                >
                  Effacer la recherche
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Handshake}
              title="Aucun partenaire pour le moment"
              description="Ouvrez une réalisation et ajoutez ses partenaires dans le panneau « Partenaires & bailleurs » : ils apparaîtront ici."
              action={
                <ButtonLink href="/admin/realisations" size="sm">
                  Ouvrir les réalisations
                </ButtonLink>
              }
            />
          )
        }
      />

      <RenameDialog
        partner={renaming}
        onClose={() => setRenaming(null)}
        onDone={async (message) => {
          setRenaming(null);
          await invalidatePortalData(queryClient);
          toast.success(message);
        }}
      />
    </div>
  );
}

function RenameDialog({
  partner,
  onClose,
  onDone,
}: {
  partner: PartnerEntry | null;
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  // Le contenu est monté à l'ouverture seulement : le champ repart du nom courant.
  return (
    <Dialog
      open={partner !== null}
      onClose={onClose}
      size="md"
      title={
        partner?.variants.length
          ? 'Unifier les graphies'
          : 'Renommer le partenaire'
      }
    >
      {partner && (
        <RenameForm partner={partner} onClose={onClose} onDone={onDone} />
      )}
    </Dialog>
  );
}

function RenameForm({
  partner,
  onClose,
  onDone,
}: {
  partner: PartnerEntry;
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  const [name, setName] = useState(partner.name);
  const [error, setError] = useState<string | null>(null);
  const cleaned = name.trim().replace(/\s+/g, ' ');
  const unchanged = cleaned === partner.name;

  const rename = useMutation({
    mutationFn: () =>
      backendJson<{ updated: number; merged: number }>(
        'admin/realisation-partners/rename',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ from: partner.name, to: cleaned }),
        },
      ),
    onSuccess: (result) =>
      onDone(
        `Renommé en « ${cleaned} » dans ${plural(result.updated + result.merged, 'réalisation')}`,
      ),
    onError: (caught) =>
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Le renommage a échoué. Réessayez.',
      ),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (cleaned && !unchanged) {
          setError(null);
          rename.mutate();
        }
      }}
      className="space-y-4 pb-1"
    >
      <p className="text-[13px] leading-relaxed text-ink-muted">
        Le nouveau nom remplace l’ancien dans{' '}
        <strong className="font-semibold text-ink">
          {plural(partner.count, 'réalisation')}
        </strong>
        . Si ce nom existe déjà, les deux sont fusionnés.
      </p>
      <Field
        label="Nom de l’organisation"
        required
        error={error}
        hint={
          partner.variants.length > 0
            ? `Graphies actuelles : ${[partner.name, ...partner.variants].join(', ')}.`
            : undefined
        }
      >
        <Input
          value={name}
          maxLength={MAX_PARTNER_NAME}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          data-autofocus
        />
      </Field>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={rename.isPending}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          loading={rename.isPending}
          disabled={!cleaned || unchanged}
        >
          Renommer
        </Button>
      </div>
    </form>
  );
}
