'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Info,
  Languages,
  Plus,
  SearchX,
  UserRound,
  Users,
} from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { cx, focusRing } from '@/lib/admin/cx';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { initials, englishGaps, type Expert } from '@/lib/admin/experts';
import { normalizeText, plural } from '@/lib/admin/format';
import { thumbOf } from '@/lib/admin/media';
import type { ContentStatus } from '@/lib/admin/public-documents';
import { POLE_TEXT, type Service } from '@/lib/admin/services';
import { poleOfSlug } from '@/lib/poles';
import { PageHeader } from '@/components/admin/page-header';
import { PoleTag } from '@/components/admin/services/pole-mark';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingRegion,
  SearchInput,
  SegmentedControl,
  Select,
  Skeleton,
  StatusChip,
  useToast,
} from '@/components/admin/ui';

type StatusFilter = ContentStatus | 'ALL';

const NO_POLE = 'none';

/** Portrait réduit (3:4) ou monogramme teinté de l'accent du pôle. */
function Avatar({ expert }: { expert: Expert }) {
  const pole = expert.service ? poleOfSlug(expert.service.slug) : null;
  return (
    <span className="relative grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-sunken">
      {expert.photoUrl ? (
        // Image publique servie par l'API via `/uploads/*` : pas d'optimisation Next nécessaire dans le portail.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbOf(expert.photoUrl)}
          alt=""
          loading="lazy"
          className="size-full object-cover object-[50%_25%]"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cx(
            'text-sm font-bold',
            pole ? POLE_TEXT[pole] : 'text-ink-subtle',
          )}
        >
          {initials(expert.fullName) || <UserRound size={18} />}
        </span>
      )}
    </span>
  );
}

export default function ExpertsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [pole, setPole] = useState('');
  const [search, setSearch] = useState('');
  const [announcement, setAnnouncement] = useState('');

  const list = useQuery({
    queryKey: ['experts', 'list'],
    queryFn: () => backendJson<Expert[]>('admin/experts'),
  });
  const services = useQuery({
    queryKey: ['services', 'list'],
    queryFn: () => backendJson<Service[]>('admin/services'),
  });
  const experts = list.data;

  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      backendJson<Expert[]>('admin/experts/order', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids }),
      }),
    onError: (error) => toast.error(error),
    onSuccess: async (saved) => {
      queryClient.setQueryData(['experts', 'list'], saved);
      await invalidatePortalData(queryClient);
    },
  });

  const q = normalizeText(search.trim());
  const filtered = Boolean(q) || status !== 'ALL' || pole !== '';
  const shown = (experts ?? []).filter(
    (expert) =>
      (status === 'ALL' || expert.status === status) &&
      (pole === '' ||
        (pole === NO_POLE ? !expert.serviceId : expert.serviceId === pole)) &&
      (!q || normalizeText(`${expert.fullName} ${expert.roleFr}`).includes(q)),
  );

  const count = (value: ContentStatus) =>
    experts?.filter((expert) => expert.status === value).length ?? 0;
  const published = count('PUBLISHED');

  function move(expert: Expert, target: number) {
    if (!experts) return;
    const index = experts.findIndex((e) => e.id === expert.id);
    const ids = experts.map((e) => e.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids, {
      onSuccess: () =>
        setAnnouncement(
          `${expert.fullName} est maintenant en position ${target + 1} sur ${experts.length}.`,
        ),
    });
  }

  const resetFilters = () => {
    setStatus('ALL');
    setPole('');
    setSearch('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pôles & services"
        title="Experts"
        description="L’équipe présentée dans la galerie « Équipe & experts » de la page À propos : portrait, fonction, présentation et spécialités en français et en anglais. Un profil est une personne : il reste en brouillon jusqu’à sa publication."
        actions={
          <ButtonLink href="/admin/services/experts/nouveau" icon={Plus}>
            Nouvel expert
          </ButtonLink>
        }
      />

      {experts && (
        <div className="flex gap-3 rounded-2xl border border-line bg-brand-soft/50 p-4 text-[13px] leading-relaxed text-ink-muted">
          <Info
            size={18}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-brand"
          />
          <p>
            {published === 0 ? (
              <>
                <strong className="font-medium text-ink">
                  Aucun expert n’est publié : la section « Équipe & experts »
                  n’apparaît pas sur la page À propos.
                </strong>{' '}
                Les profils provisoires importés au départ sont des personnes
                fictives : remplacez-les par les vrais experts avant de publier.
              </>
            ) : (
              <>
                {plural(published, 'expert publié', 'experts publiés')} sur la
                page À propos, dans l’ordre de cette liste.
              </>
            )}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          label="Rechercher un expert"
          placeholder="Nom ou fonction…"
          value={search}
          onValueChange={setSearch}
          className="w-full sm:w-64"
        />
        <Select
          aria-label="Filtrer par pôle"
          value={pole}
          onChange={(event) => setPole(event.target.value)}
          className="w-52"
        >
          <option value="">Tous les pôles</option>
          {services.data?.map((service) => (
            <option key={service.id} value={service.id}>
              {service.nameFr}
            </option>
          ))}
          <option value={NO_POLE}>Sans pôle</option>
        </Select>
        <SegmentedControl<StatusFilter>
          label="Filtrer par statut"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'ALL', label: 'Tous', count: experts?.length },
            {
              value: 'PUBLISHED',
              label: 'Publiés',
              count: experts ? published : undefined,
            },
            {
              value: 'DRAFT',
              label: 'Brouillons',
              count: experts ? count('DRAFT') : undefined,
            },
          ]}
        />
      </div>

      {list.isLoading ? (
        <LoadingRegion>
          <Skeleton className="h-96 rounded-2xl" />
        </LoadingRegion>
      ) : list.error || !experts ? (
        <ErrorState
          error={list.error}
          onRetry={() => list.refetch()}
          retrying={list.isRefetching}
        />
      ) : experts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun expert pour le moment"
          description="Ajoutez le premier : il restera en brouillon jusqu’à sa publication."
          action={
            <ButtonLink
              href="/admin/services/experts/nouveau"
              icon={Plus}
              size="sm"
            >
              Nouvel expert
            </ButtonLink>
          }
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Aucun expert pour ces filtres"
          action={
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              Effacer les filtres
            </Button>
          }
        />
      ) : (
        <Card
          padding="none"
          title={plural(shown.length, 'expert')}
          description={
            filtered
              ? 'Retirez les filtres pour réordonner : l’ordre est celui de la liste complète.'
              : 'Dans l’ordre d’affichage de la galerie.'
          }
        >
          <ol className="divide-y divide-line" aria-label="Experts">
            {shown.map((expert) => {
              const index = experts.findIndex((e) => e.id === expert.id);
              const slug = expert.service?.slug;
              const expertPole = slug ? poleOfSlug(slug) : null;
              const gaps = englishGaps(expert);
              return (
                <li
                  key={expert.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5 sm:flex-nowrap"
                >
                  <Avatar expert={expert} />
                  <Link
                    href={`/admin/services/experts/${expert.id}`}
                    className={cx('min-w-0 flex-1 rounded-md', focusRing)}
                  >
                    <span className="block truncate text-sm font-medium text-ink hover:underline">
                      {expert.fullName}
                    </span>
                    <span className="block truncate text-[13px] text-ink-muted">
                      {expert.roleFr}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {expertPole ? (
                        <PoleTag pole={expertPole} />
                      ) : (
                        <Badge>Sans pôle</Badge>
                      )}
                      {expert.yearsOfExperience !== null && (
                        <Badge>{expert.yearsOfExperience} ans</Badge>
                      )}
                      {gaps.length > 0 && (
                        <Badge tone="warn" icon={Languages}>
                          Anglais à compléter
                        </Badge>
                      )}
                    </span>
                  </Link>
                  <StatusChip kind="content" value={expert.status} />
                  <div className="flex shrink-0 items-center gap-0.5">
                    <IconButton
                      icon={ArrowUp}
                      label={`Monter ${expert.fullName}`}
                      size="sm"
                      disabled={filtered || index === 0 || reorder.isPending}
                      onClick={() => move(expert, index - 1)}
                    />
                    <IconButton
                      icon={ArrowDown}
                      label={`Descendre ${expert.fullName}`}
                      size="sm"
                      disabled={
                        filtered ||
                        index === experts.length - 1 ||
                        reorder.isPending
                      }
                      onClick={() => move(expert, index + 1)}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
