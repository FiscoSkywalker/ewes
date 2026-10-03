'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Eye,
  EyeOff,
  Hash,
  Languages,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import {
  SOURCE_BADGES,
  hasEnglish,
  toPayload,
  type FigureFormValues,
  type KeyFigure,
  type LiveCounts,
} from '@/lib/admin/key-figures';
import { formatFigureValue, MAX_KEY_FIGURES } from '@/lib/key-figures';
import { plural } from '@/lib/admin/format';
import { PageHeader } from '@/components/admin/page-header';
import { FigureDialog } from '@/components/admin/key-figures/figure-dialog';
import { FiguresPreview } from '@/components/admin/key-figures/figures-preview';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingRegion,
  Skeleton,
  useConfirm,
  useToast,
} from '@/components/admin/ui';

const JSON_HEADERS = { 'content-type': 'application/json' };
const BASE = 'admin/key-figures';
const LIST_KEY = ['key-figures', 'list'];

export default function KeyFiguresPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const list = useQuery({
    queryKey: LIST_KEY,
    queryFn: () => backendJson<KeyFigure[]>(BASE),
  });
  const figures = list.data;
  // Nombres actuels des valeurs automatiques, pour la fenêtre d'édition.
  const counts = useQuery({
    queryKey: ['key-figures', 'counts'],
    queryFn: () => backendJson<LiveCounts>(`${BASE}/counts`),
  });

  // `undefined` : fermée ; `null` : nouveau chiffre ; sinon le chiffre modifié.
  const [editing, setEditing] = useState<KeyFigure | null | undefined>(
    undefined,
  );
  const [announcement, setAnnouncement] = useState('');
  const full = (figures?.length ?? 0) >= MAX_KEY_FIGURES;

  /** Réponse du serveur → liste à jour (jamais un état présumé), puis rafraîchit le reste du portail. */
  const refresh = () => invalidatePortalData(queryClient);

  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      backendJson<KeyFigure[]>(`${BASE}/order`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ ids }),
      }),
    onError: (error) => toast.error(error),
    onSuccess: async (saved) => {
      queryClient.setQueryData(LIST_KEY, saved);
      await refresh();
    },
  });

  function move(index: number, target: number) {
    if (!figures) return;
    const ids = figures.map((figure) => figure.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids, {
      onSuccess: () =>
        setAnnouncement(
          `« ${figures[index].labelFr} » est maintenant en position ${target + 1} sur ${figures.length}.`,
        ),
    });
  }

  const toggleVisible = useMutation({
    mutationFn: (figure: KeyFigure) =>
      backendJson<KeyFigure>(`${BASE}/${figure.id}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ isVisible: !figure.isVisible }),
      }),
    onError: (error) => toast.error(error),
    onSuccess: async (saved) => {
      await refresh();
      toast.success(
        saved.isVisible ? 'Chiffre affiché sur le site' : 'Chiffre masqué',
      );
    },
  });

  async function save(values: FigureFormValues) {
    const payload = toPayload(values);
    await backendJson<KeyFigure>(editing ? `${BASE}/${editing.id}` : BASE, {
      method: editing ? 'PATCH' : 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    await refresh();
    toast.success(editing ? 'Chiffre modifié' : 'Chiffre ajouté');
  }

  async function remove(figure: KeyFigure) {
    const ok = await confirm({
      title: 'Retirer ce chiffre ?',
      description: (
        <>
          « {figure.labelFr} » disparaît de la page À propos
          {figure.isVisible ? ' dès maintenant' : ''}. Pour le garder sans
          l’afficher, masquez-le plutôt. Cette action est tracée dans le journal
          d’audit.
        </>
      ),
      tone: 'danger',
      confirmLabel: 'Retirer le chiffre',
      onConfirm: () =>
        backendJson<void>(`${BASE}/${figure.id}`, { method: 'DELETE' }),
    });
    if (!ok) return;
    await refresh();
    toast.success('Chiffre retiré');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contenus du site"
        title="Chiffres clés"
        description="Les chiffres de la bande affichée sur la page À propos : valeur, libellé et précision, en français et en anglais. Les changements sont visibles sur le site dès l’enregistrement."
        actions={
          <Button
            icon={Plus}
            disabled={full || list.isLoading || Boolean(list.error)}
            onClick={() => setEditing(null)}
          >
            Ajouter un chiffre
          </Button>
        }
      />

      {list.isLoading ? (
        <LoadingRegion>
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="mt-6 h-64 rounded-2xl" />
        </LoadingRegion>
      ) : list.error || !figures ? (
        <ErrorState
          error={list.error}
          onRetry={() => list.refetch()}
          retrying={list.isRefetching}
        />
      ) : (
        <>
          <FiguresPreview figures={figures} />

          <Card
            title="Chiffres"
            description={
              full
                ? `${plural(figures.length, 'chiffre')} : le maximum (${MAX_KEY_FIGURES}) est atteint, retirez-en un pour en ajouter.`
                : `${plural(figures.length, 'chiffre')} sur ${MAX_KEY_FIGURES} au plus, affichés dans cet ordre.`
            }
            padding="none"
          >
            {figures.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={Hash}
                  title="Aucun chiffre clé"
                  description="La page À propos n’affiche pas de bande de chiffres. Ajoutez-en un : quelques chiffres solides (clients, années, pays) rassurent plus qu’une longue liste."
                  action={
                    <Button
                      size="sm"
                      icon={Plus}
                      onClick={() => setEditing(null)}
                    >
                      Ajouter un chiffre
                    </Button>
                  }
                />
              </div>
            ) : (
              <ol className="divide-y divide-line" aria-label="Chiffres clés">
                {figures.map((figure, index) => (
                  <li
                    key={figure.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 sm:flex-nowrap"
                  >
                    <p
                      className={
                        figure.isVisible
                          ? 'w-28 shrink-0 text-2xl font-bold tracking-tight text-ink'
                          : 'w-28 shrink-0 text-2xl font-bold tracking-tight text-ink-subtle'
                      }
                    >
                      {formatFigureValue(figure.displayedValue, 'fr')}
                      {figure.suffixFr && (
                        <span className="ml-1 text-sm font-semibold">
                          {figure.suffixFr}
                        </span>
                      )}
                    </p>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-mono text-[11px] text-ink-subtle">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="text-sm font-medium text-ink">
                          {figure.labelFr}
                        </span>
                        {!figure.isVisible && (
                          <Badge icon={EyeOff}>Masqué</Badge>
                        )}
                        {figure.source === 'YEARS_SINCE' && (
                          <Badge tone="brand" icon={CalendarClock}>
                            Calculé depuis {figure.sinceYear}
                          </Badge>
                        )}
                        {SOURCE_BADGES[figure.source] && (
                          <Badge tone="brand" icon={RefreshCw}>
                            {SOURCE_BADGES[figure.source]}
                          </Badge>
                        )}
                        {!hasEnglish(figure) && (
                          <Badge tone="warn" icon={Languages}>
                            Anglais à compléter
                          </Badge>
                        )}
                      </p>
                      {figure.subtextFr && (
                        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
                          {figure.subtextFr}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <IconButton
                        icon={ArrowUp}
                        label={`Monter « ${figure.labelFr} »`}
                        size="sm"
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => move(index, index - 1)}
                      />
                      <IconButton
                        icon={ArrowDown}
                        label={`Descendre « ${figure.labelFr} »`}
                        size="sm"
                        disabled={
                          index === figures.length - 1 || reorder.isPending
                        }
                        onClick={() => move(index, index + 1)}
                      />
                      <IconButton
                        icon={figure.isVisible ? EyeOff : Eye}
                        label={
                          figure.isVisible
                            ? `Masquer « ${figure.labelFr} »`
                            : `Afficher « ${figure.labelFr} »`
                        }
                        size="sm"
                        disabled={toggleVisible.isPending}
                        onClick={() => toggleVisible.mutate(figure)}
                      />
                      <IconButton
                        icon={Pencil}
                        label={`Modifier « ${figure.labelFr} »`}
                        size="sm"
                        onClick={() => setEditing(figure)}
                      />
                      <IconButton
                        icon={Trash2}
                        label={`Retirer « ${figure.labelFr} »`}
                        size="sm"
                        onClick={() => remove(figure)}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      )}

      <p role="status" className="sr-only">
        {announcement}
      </p>

      <FigureDialog
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        figure={editing ?? null}
        counts={counts.data}
        onSubmit={save}
      />
    </div>
  );
}
