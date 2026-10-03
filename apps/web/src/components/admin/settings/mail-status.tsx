'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CircleAlert,
  CircleCheck,
  Info,
  MailCheck,
  MailWarning,
  Send,
} from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { cx } from '@/lib/admin/cx';
import { relativeTime } from '@/lib/admin/format';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import {
  SECURITY_LABELS,
  type MailOverview,
  type MailTestResult,
} from '@/lib/admin/settings';
import { MAIL_QUERY_KEY } from '@/lib/admin/settings-queries';
import { Badge, Button, useToast } from '../ui';

function Stat({
  label,
  value,
  caption,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  caption?: string;
  tone?: 'neutral' | 'bad' | 'warn';
}) {
  return (
    <div className="px-5 py-4">
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd
        className={cx(
          'mt-1 text-2xl font-semibold tabular-nums tracking-tight',
          tone === 'bad' && 'text-bad',
          tone === 'warn' && 'text-warn',
          tone === 'neutral' && 'text-ink',
        )}
      >
        {value}
      </dd>
      {caption && (
        <dd className="mt-0.5 text-xs leading-snug text-ink-subtle">
          {caption}
        </dd>
      )}
    </div>
  );
}

function Detail({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="w-36 shrink-0 text-xs font-medium text-ink-muted">
        {term}
      </dt>
      <dd className="min-w-0 break-words text-[13px] text-ink">{children}</dd>
    </div>
  );
}

/**
 * État de l'envoi d'e-mails de la plateforme : configuré ou non, chiffres des
 * 30 derniers jours, paramètres du serveur (jamais le mot de passe) et test
 * d'envoi réel. Ces paramètres vivent dans l'environnement du serveur, pas
 * dans le portail : un mot de passe SMTP ne doit jamais transiter par un
 * formulaire web. L'écran dit donc *quoi* demander à l'équipe technique plutôt
 * que d'offrir des champs qui ne marcheraient pas.
 */
export function MailStatus({
  overview,
  adminEmail,
}: {
  overview: MailOverview;
  /** Adresse du compte connecté, destinataire du test. */
  adminEmail: string | null;
}) {
  const { transport, summary } = overview;
  const queryClient = useQueryClient();
  const toast = useToast();
  const headingId = useId();
  const resultId = useId();
  const [result, setResult] = useState<MailTestResult | null>(null);

  const test = useMutation({
    mutationFn: () =>
      backendJson<MailTestResult>('admin/settings/mail/test', {
        method: 'POST',
      }),
    onMutate: () => setResult(null),
    onError: (error) => toast.error(error),
    onSuccess: async (sent) => {
      setResult(sent);
      await invalidatePortalData(queryClient);
      await queryClient.invalidateQueries({ queryKey: MAIL_QUERY_KEY });
    },
  });

  const ok = transport.configured;
  const attention = ok && summary.failed > 0;
  // La zone de résultat reste dans la page (lecteurs d'écran) mais ne prend de la place que si elle dit quelque chose.
  const showResult =
    test.isPending || result !== null || Boolean(adminEmail && ok);

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-2xl border border-line bg-panel"
    >
      <header className="flex flex-wrap items-center gap-x-5 gap-y-4 p-5 sm:p-6">
        <span
          aria-hidden="true"
          className={cx(
            'grid size-12 shrink-0 place-items-center rounded-2xl',
            !ok
              ? 'bg-bad-soft text-bad'
              : attention
                ? 'bg-warn-soft text-warn'
                : 'bg-ok-soft text-ok',
          )}
        >
          {ok && !attention ? (
            <MailCheck size={24} strokeWidth={1.8} />
          ) : (
            <MailWarning size={24} strokeWidth={1.8} />
          )}
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <h2
            id={headingId}
            className="flex flex-wrap items-center gap-2 text-base font-semibold text-ink"
          >
            État de l’envoi d’e-mails
            <Badge tone={!ok ? 'bad' : attention ? 'warn' : 'ok'} dot>
              {!ok
                ? 'Non configuré'
                : attention
                  ? 'À vérifier'
                  : 'Opérationnel'}
            </Badge>
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            {!ok
              ? 'Aucun e-mail ne peut partir : ni les messages du formulaire de contact, ni les invitations de comptes.'
              : attention
                ? `${summary.failed} e-mail${summary.failed > 1 ? 's' : ''} n’${summary.failed > 1 ? 'ont' : 'a'} pas pu partir. Rejouez-les depuis le suivi des e-mails.`
                : summary.lastSentAt
                  ? `Dernier e-mail envoyé ${relativeTime(summary.lastSentAt)}.`
                  : 'Le serveur est configuré. Aucun e-mail n’est encore parti : envoyez-vous un test.'}
          </p>
        </div>
        <Button
          variant="secondary"
          icon={Send}
          loading={test.isPending}
          disabled={!ok}
          aria-describedby={resultId}
          onClick={() => test.mutate()}
        >
          Envoyer un e-mail de test
        </Button>
      </header>

      <p
        id={resultId}
        role="status"
        aria-live="polite"
        className={showResult ? 'block px-5 pb-5 sm:px-6' : 'sr-only'}
      >
        {test.isPending ? (
          <span className="text-[13px] text-ink-muted">Envoi en cours…</span>
        ) : result?.status === 'sent' ? (
          <span className="flex items-start gap-2.5 rounded-xl border border-ok/25 bg-ok-soft px-4 py-3 text-[13px] text-ok">
            <CircleCheck
              size={17}
              aria-hidden="true"
              className="mt-px shrink-0"
            />
            <span>
              <strong className="font-semibold">E-mail de test envoyé</strong> à{' '}
              {result.recipientEmail}. Vérifiez votre boîte de réception — et le
              dossier des courriers indésirables.
            </span>
          </span>
        ) : result ? (
          <span className="flex items-start gap-2.5 rounded-xl border border-bad/25 bg-bad-soft px-4 py-3 text-[13px] text-bad">
            <CircleAlert
              size={17}
              aria-hidden="true"
              className="mt-px shrink-0"
            />
            <span>
              <strong className="font-semibold">
                Le serveur a refusé l’envoi.
              </strong>{' '}
              {result.lastError ? `Raison : ${result.lastError}. ` : ''}
              Vérifiez les paramètres ci-dessous avec l’équipe technique, puis
              relancez le test.
            </span>
          </span>
        ) : adminEmail && ok ? (
          <span className="text-xs text-ink-subtle">
            Le test est envoyé à votre adresse, {adminEmail}, et son résultat
            s’affiche ici.
          </span>
        ) : null}
      </p>

      <dl className="grid grid-cols-1 divide-y divide-line border-t border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat
          label="Envoyés · 30 jours"
          value={summary.sentLast30Days}
          caption={
            summary.lastSentAt
              ? `Le dernier ${relativeTime(summary.lastSentAt)}`
              : undefined
          }
        />
        <Stat
          label="En attente"
          value={summary.pending}
          tone={summary.pending > 0 ? 'warn' : 'neutral'}
          caption={
            summary.pending > 0 ? 'Envoi en cours ou interrompu' : undefined
          }
        />
        <Stat
          label="En échec"
          value={summary.failed}
          tone={summary.failed > 0 ? 'bad' : 'neutral'}
          caption={
            summary.failed > 0 && summary.lastFailedAt
              ? `Le dernier ${relativeTime(summary.lastFailedAt)}`
              : undefined
          }
        />
      </dl>
      <div className="border-t border-line px-5 py-2.5 text-right">
        <Link
          href="/admin/emails"
          className="text-xs font-medium text-brand underline-offset-2 hover:underline"
        >
          Ouvrir le suivi des e-mails
        </Link>
      </div>

      <div className="border-t border-line bg-sunken/50">
        <h3 className="px-5 pt-4 text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
          Serveur d’envoi
        </h3>
        <dl className="divide-y divide-line">
          <Detail term="Serveur">
            {transport.host ? (
              <span className="font-mono text-[12.5px]">
                {transport.host}
                {transport.port ? `:${transport.port}` : ''}
              </span>
            ) : (
              <span className="text-bad">Non défini</span>
            )}
          </Detail>
          <Detail term="Chiffrement">
            {transport.security ? SECURITY_LABELS[transport.security] : '—'}
          </Detail>
          <Detail term="Identifiant">
            {transport.host
              ? transport.authenticated
                ? 'Défini (le mot de passe n’est jamais affiché)'
                : 'Aucun : le serveur n’exige pas d’authentification'
              : '—'}
          </Detail>
          <Detail term="Expéditeur">
            {transport.from ? (
              <span className="font-mono text-[12.5px]">{transport.from}</span>
            ) : (
              <span className="text-bad">Non défini</span>
            )}
          </Detail>
        </dl>

        <div className="m-5 flex items-start gap-3 rounded-xl border border-line bg-panel p-4 text-[13px] leading-relaxed text-ink-muted">
          <Info
            size={17}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-brand"
          />
          <div className="space-y-1.5">
            {!ok && (
              <p className="text-ink">
                Il manque{' '}
                {transport.missing.map((name, index) => (
                  <span key={name}>
                    {index > 0 && ' et '}
                    <span className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[12px] text-bad">
                      {name}
                    </span>
                  </span>
                ))}
                .
              </p>
            )}
            <p>
              Ces paramètres se règlent dans la configuration du serveur
              (fichier <span className="font-mono text-[12px]">.env</span>), par
              l’équipe technique — jamais depuis le portail : un mot de passe de
              messagerie ne doit pas transiter par un formulaire web.
              {ok && ' Après une modification, relancez un test pour vérifier.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
