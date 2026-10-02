'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Info, Languages, Layers } from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { cx, focusRing } from '@/lib/admin/cx';
import { plural } from '@/lib/admin/format';
import { thumbOf } from '@/lib/admin/media';
import {
  POLE_TEXT,
  POLE_TONES,
  hasEnglish,
  poleNeedsEnglish,
  poleOf,
  type Service,
} from '@/lib/admin/services';
import { POLE_DEFAULT_IMAGES } from '@/lib/poles';
import { PageHeader } from '@/components/admin/page-header';
import { PoleTag, PoleSwatch } from '@/components/admin/services/pole-mark';
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingRegion,
  Skeleton,
  StatusChip,
} from '@/components/admin/ui';

/** État de la version anglaise d'un pôle : sa présentation et ses prestations. */
function englishState(service: Service) {
  const missing = service.offerings.filter((o) => !hasEnglish(o)).length;
  const poleDone = !poleNeedsEnglish(service);
  if (poleDone && missing === 0) return { done: true, text: 'Anglais complet' };
  const parts = [];
  if (!poleDone) parts.push('présentation');
  if (missing > 0) parts.push(plural(missing, 'prestation'));
  return { done: false, text: `À traduire : ${parts.join(' et ')}` };
}

function PoleCard({ service }: { service: Service }) {
  const pole = poleOf(service);
  const english = englishState(service);
  const poleClass = pole ? `pole-${pole}` : 'pole-neutral';

  return (
    <li className="flex">
      <Link
        href={`/admin/services/${service.id}`}
        className={cx(
          poleClass,
          'group flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-panel transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_18px_36px_-24px_rgba(16,42,52,0.35)]',
          focusRing,
        )}
      >
        <span className="relative block aspect-[16/9] overflow-hidden bg-sunken">
          {service.imageUrl ? (
            // Image publique servie par l'API via `/uploads/*` : pas d'optimisation Next nécessaire dans le portail.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbOf(service.imageUrl)}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            pole && (
              <Image
                src={POLE_DEFAULT_IMAGES[pole]}
                alt=""
                fill
                sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            )
          )}
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-black/10"
          />
          {pole && <PoleTag pole={pole} className="absolute left-3 top-3" />}
          <span className="absolute right-3 top-3 rounded-full bg-panel shadow-sm">
            <StatusChip kind="content" value={service.status} />
          </span>
        </span>
        <PoleSwatch pole={pole ?? 'env'} className="h-2 border-y border-line" />

        <span className="flex flex-1 flex-col p-5">
          <span className="text-lg font-semibold leading-snug tracking-tight text-ink">
            {service.nameFr}
          </span>
          {service.taglineFr && (
            <span
              className={cx(
                'mt-1 block text-[13px] font-medium leading-snug',
                pole ? POLE_TEXT[pole] : 'text-ink-muted',
              )}
            >
              {service.taglineFr}
            </span>
          )}
          <span className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-ink-muted">
            {service.descriptionFr}
          </span>

          <span className="mt-auto flex flex-wrap items-center gap-2 pt-5">
            <Badge tone={pole ? POLE_TONES[pole] : 'neutral'}>
              {plural(service.offerings.length, 'prestation')}
            </Badge>
            <Badge tone={english.done ? 'ok' : 'warn'} icon={Languages}>
              {english.text}
            </Badge>
            {!pole && <Badge tone="neutral">Sans chapitre sur le site</Badge>}
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-brand">
              Modifier
              <ArrowRight
                size={14}
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * `/admin/services` : les trois pôles d'expertise. Les autres adresses de
 * cette rubrique (ex. `experts`) sont des écrans à venir : l'écran « en
 * préparation » prend le relais, comme pour `/admin/realisations/<…>`.
 */
export default function ServicesPage() {
  return <Poles />;
}

function Poles() {
  const list = useQuery({
    queryKey: ['services', 'list'],
    queryFn: () => backendJson<Service[]>('admin/services'),
  });
  const services = list.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contenus du site"
        title="Pôles & services"
        description="Environnement, Eau et Travaux d’ingénierie : présentation, visuel et prestations de chaque pôle, en français et en anglais."
      />

      <div className="flex gap-3 rounded-2xl border border-line bg-brand-soft/50 p-4 text-[13px] leading-relaxed text-ink-muted">
        <Info
          size={18}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-brand"
        />
        <p>
          Les trois pôles forment l’ossature du site : leur ordre, leur code et
          leur couleur d’accent sont fixes, pour que chaque pôle se reconnaisse
          partout. Vous modifiez ici les textes, le visuel et les prestations de
          chacun.
        </p>
      </div>

      {list.isLoading ? (
        <LoadingRegion>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        </LoadingRegion>
      ) : list.error ? (
        <ErrorState
          error={list.error}
          onRetry={() => list.refetch()}
          retrying={list.isRefetching}
        />
      ) : services && services.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Aucun pôle pour le moment"
          description="Les trois pôles sont créés avec les données initiales du site. Relancez l’import initial (seed) puis rechargez cette page."
        />
      ) : (
        <ul
          role="list"
          aria-label="Pôles d’expertise"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {services?.map((service) => (
            <PoleCard key={service.id} service={service} />
          ))}
        </ul>
      )}
    </div>
  );
}
