'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  FileCheck,
  Languages,
  ListPlus,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { plural } from '@/lib/admin/format';
import {
  hasEnglish,
  poleOf,
  toOfferingPayload,
  type Offering,
  type OfferingFormValues,
  type Service,
} from '@/lib/admin/services';
import { SERVICE_ICONS } from '@/lib/service-icons';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  useConfirm,
  useToast,
} from '../ui';
import { OfferingDialog } from './offering-dialog';
import { PoleIconTile } from './pole-mark';

const JSON_HEADERS = { 'content-type': 'application/json' };

/**
 * Prestations d'un pôle, dans l'ordre où le site les affiche. Chaque action
 * (ajout, modification, déplacement, retrait) s'enregistre aussitôt : la liste
 * est celle du serveur, jamais un état présumé. Le déplacement passe par des
 * boutons (et non un glisser-déposer) : utilisable au clavier et au lecteur
 * d'écran, et annoncé en toutes lettres.
 */
export function OfferingsCard({ service }: { service: Service }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const pole = poleOf(service);
  const offerings = service.offerings;

  // `undefined` : fermée ; `null` : nouvelle prestation ; sinon la prestation modifiée.
  const [editing, setEditing] = useState<Offering | null | undefined>(
    undefined,
  );
  const [announcement, setAnnouncement] = useState('');
  const base = `admin/services/${service.id}/offerings`;

  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      backendJson<Service>(`${base}/order`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ ids }),
      }),
    onError: (error) => toast.error(error),
    onSuccess: () => invalidatePortalData(queryClient),
  });

  function move(index: number, target: number) {
    const ids = offerings.map((o) => o.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids, {
      onSuccess: () =>
        setAnnouncement(
          `« ${offerings[index].titleFr} » est maintenant en position ${target + 1} sur ${offerings.length}.`,
        ),
    });
  }

  async function save(values: OfferingFormValues) {
    const payload = toOfferingPayload(values);
    if (editing) {
      await backendJson<Offering>(`${base}/${editing.id}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      });
    } else {
      await backendJson<Offering>(base, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      });
    }
    await invalidatePortalData(queryClient);
    toast.success(editing ? 'Prestation modifiée' : 'Prestation ajoutée');
  }

  async function remove(offering: Offering) {
    const ok = await confirm({
      title: 'Retirer cette prestation ?',
      description: (
        <>
          « {offering.titleFr} » disparaît de la page Nos services
          {service.status === 'PUBLISHED' ? ' dès maintenant' : ''}. Cette
          action est tracée dans le journal d’audit.
        </>
      ),
      tone: 'danger',
      confirmLabel: 'Retirer la prestation',
      onConfirm: () =>
        backendJson<void>(`${base}/${offering.id}`, { method: 'DELETE' }),
    });
    if (!ok) return;
    await invalidatePortalData(queryClient);
    toast.success('Prestation retirée');
  }

  return (
    <Card
      title="Prestations"
      description={
        offerings.length === 0
          ? 'Aucune prestation pour l’instant.'
          : `${plural(offerings.length, 'prestation')}, affichées dans cet ordre sur le site.`
      }
      actions={
        <Button
          variant="secondary"
          size="sm"
          icon={Plus}
          onClick={() => setEditing(null)}
        >
          Ajouter une prestation
        </Button>
      }
      padding="none"
    >
      {offerings.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={ListPlus}
            title="Aucune prestation"
            description="Le chapitre du pôle affichera sa présentation seule. Ajoutez les prestations que propose EWES dans ce domaine."
            action={
              <Button size="sm" icon={Plus} onClick={() => setEditing(null)}>
                Ajouter une prestation
              </Button>
            }
          />
        </div>
      ) : (
        <ol className="divide-y divide-line" aria-label="Prestations du pôle">
          {offerings.map((offering, index) => {
            const Icon =
              (offering.icon && SERVICE_ICONS[offering.icon]?.Icon) ||
              FileCheck;
            return (
              <li
                key={offering.id}
                className="flex flex-wrap items-start gap-x-4 gap-y-3 px-5 py-4 sm:flex-nowrap"
              >
                <PoleIconTile pole={pole ?? 'env'}>
                  <Icon size={19} strokeWidth={1.75} />
                </PoleIconTile>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-[11px] text-ink-subtle">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-medium text-ink">
                      {offering.titleFr}
                    </span>
                    {!hasEnglish(offering) && (
                      <Badge tone="warn" icon={Languages}>
                        Anglais à compléter
                      </Badge>
                    )}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
                    {offering.descriptionFr}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton
                    icon={ArrowUp}
                    label={`Monter « ${offering.titleFr} »`}
                    size="sm"
                    disabled={index === 0 || reorder.isPending}
                    onClick={() => move(index, index - 1)}
                  />
                  <IconButton
                    icon={ArrowDown}
                    label={`Descendre « ${offering.titleFr} »`}
                    size="sm"
                    disabled={
                      index === offerings.length - 1 || reorder.isPending
                    }
                    onClick={() => move(index, index + 1)}
                  />
                  <IconButton
                    icon={Pencil}
                    label={`Modifier « ${offering.titleFr} »`}
                    size="sm"
                    onClick={() => setEditing(offering)}
                  />
                  <IconButton
                    icon={Trash2}
                    label={`Retirer « ${offering.titleFr} »`}
                    size="sm"
                    onClick={() => remove(offering)}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p role="status" className="sr-only">
        {announcement}
      </p>

      <OfferingDialog
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        offering={editing ?? null}
        pole={pole}
        position={
          editing
            ? offerings.findIndex((o) => o.id === editing.id) + 1
            : offerings.length + 1
        }
        onSubmit={save}
      />
    </Card>
  );
}
