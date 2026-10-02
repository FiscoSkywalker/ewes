'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  CheckCheck,
  Mail,
  Phone,
  RotateCcw,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { ApiError, backendJson } from '@/lib/api/backend';
import {
  sectorLabel,
  type ContactMessage,
  type ContactStatus,
} from '@/lib/admin/contacts';
import { homePathFor } from '@/lib/admin/roles';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { PageHeader } from '@/components/admin/page-header';
import { useSession } from '@/components/admin/session';
import { PortalNotFound } from '@/components/admin/states';
import {
  Button,
  ButtonLink,
  Card,
  ErrorState,
  LoadingRegion,
  Skeleton,
  StatusChip,
  useToast,
} from '@/components/admin/ui';

const dateTime = new Intl.DateTimeFormat('fr', {
  dateStyle: 'long',
  timeStyle: 'short',
});

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const query = useQuery({
    queryKey: ['contacts', 'detail', id],
    queryFn: () => backendJson<ContactMessage>(`admin/contacts/${id}`),
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
      <BackLink status={query.data?.status} />
      {query.isLoading ? (
        <DetailSkeleton />
      ) : query.error || !query.data ? (
        <ErrorState
          error={query.error}
          onRetry={() => query.refetch()}
          retrying={query.isRefetching}
          size="page"
        />
      ) : (
        <Detail message={query.data} />
      )}
    </div>
  );
}

function BackLink({ status }: { status?: ContactStatus }) {
  const done = status === 'TRAITE';
  return (
    <Link
      href={done ? '/admin/contacts/traites' : '/admin/contacts'}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
    >
      <ArrowLeft size={14} aria-hidden="true" />
      {done ? 'Messages traités' : 'Messages à traiter'}
    </Link>
  );
}

function DetailSkeleton() {
  return (
    <LoadingRegion>
      <Skeleton className="h-8 w-64" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </LoadingRegion>
  );
}

function Detail({ message }: { message: ContactMessage }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const done = message.status === 'TRAITE';

  // Pas de mise à jour optimiste : l'état affiché est celui que le serveur a enregistré.
  const setStatus = useMutation({
    mutationFn: (status: ContactStatus) =>
      backendJson<ContactMessage>(`admin/contacts/${message.id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    onSuccess: async (saved) => {
      queryClient.setQueryData(['contacts', 'detail', message.id], saved);
      await invalidatePortalData(queryClient);
      toast.success(
        saved.status === 'TRAITE'
          ? 'Message marqué comme traité'
          : 'Message remis à traiter',
      );
    },
    onError: (error) => toast.error(error),
  });

  const topic = message.subject ?? sectorLabel(message.sector);
  const replySubject = `Re: ${message.subject ?? 'Votre demande auprès d’EWES'}`;
  const mailto = `mailto:${message.email}?subject=${encodeURIComponent(replySubject)}`;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <StatusChip kind="contact" value={message.status} />
            <time dateTime={message.createdAt} className="normal-case">
              Reçu le {dateTime.format(new Date(message.createdAt))}
            </time>
          </span>
        }
        title={message.name}
        description={topic ?? undefined}
        actions={
          <>
            <ButtonLink href={mailto} variant="secondary" icon={Mail}>
              Répondre par e-mail
            </ButtonLink>
            <Button
              icon={done ? RotateCcw : CheckCheck}
              variant={done ? 'secondary' : 'primary'}
              loading={setStatus.isPending}
              onClick={() => setStatus.mutate(done ? 'NOUVEAU' : 'TRAITE')}
            >
              {done ? 'Remettre à traiter' : 'Marquer comme traité'}
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Message">
          {/* Texte saisi par un visiteur : rendu en texte, jamais en HTML. */}
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
            {message.message}
          </p>
        </Card>

        <Card title="Expéditeur">
          <dl className="space-y-4 text-sm">
            <Row icon={Mail} label="E-mail">
              <a
                href={`mailto:${message.email}`}
                className="break-all text-brand hover:text-brand-strong"
              >
                {message.email}
              </a>
            </Row>
            {message.phone && (
              <Row icon={Phone} label="Téléphone">
                <a
                  href={`tel:${message.phone.replace(/[^\d+]/g, '')}`}
                  className="text-brand hover:text-brand-strong"
                >
                  {message.phone}
                </a>
              </Row>
            )}
            {message.organization && (
              <Row icon={Building2} label="Organisation">
                {message.organization}
              </Row>
            )}
            {message.sector && (
              <Row icon={Tag} label="Pôle concerné">
                {sectorLabel(message.sector)}
              </Row>
            )}
            <div className="border-t border-line pt-4 text-xs text-ink-subtle">
              Langue du formulaire :{' '}
              {message.locale === 'en' ? 'anglais' : 'français'}
            </div>
          </dl>
        </Card>
      </div>
    </>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon
        size={16}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-ink-subtle"
      />
      <div className="min-w-0">
        <dt className="text-xs text-ink-subtle">{label}</dt>
        <dd className="text-ink">{children}</dd>
      </div>
    </div>
  );
}
