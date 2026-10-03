'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '@/lib/admin/cx';
import {
  actionLabel,
  actionTone,
  describeAgent,
  diffRows,
  entityHref,
  entityName,
  entityTypeLabel,
  type AuditRow,
} from '@/lib/admin/audit';
import { Badge, Button, Dialog } from '../ui';

const exact = new Intl.DateTimeFormat('fr', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-xs text-ink-subtle sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 text-[13px] text-ink [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

const linkClass = 'font-medium text-brand underline-offset-2 hover:underline';

/**
 * Détail d'une entrée du journal : qui, quoi, sur quoi, d'où, et les valeurs
 * avant/après telles qu'elles ont été consignées. Lecture seule — une entrée
 * n'est ni modifiable ni supprimable. Flèches pour parcourir la page.
 */
export function AuditDetail({
  row,
  position,
  onClose,
  onPrevious,
  onNext,
}: {
  row: AuditRow | null;
  /** « 3 sur 25 » dans la page affichée. */
  position?: { index: number; total: number };
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const diff = row ? diffRows(row) : [];
  const href = row ? entityHref(row) : null;
  const name = row ? entityName(row) : null;
  const agent = row ? describeAgent(row.userAgent) : null;

  return (
    <Dialog
      open={row !== null}
      onClose={onClose}
      size="lg"
      title={row ? actionLabel(row.action) : ''}
      description={
        row && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <time dateTime={row.createdAt}>
              {exact.format(new Date(row.createdAt))}
            </time>
            <Badge tone={actionTone(row.action)}>{row.action}</Badge>
          </span>
        )
      }
      footer={
        <>
          <div className="mr-auto flex items-center gap-1.5 max-sm:hidden">
            <Button
              variant="ghost"
              size="sm"
              icon={ChevronLeft}
              onClick={onPrevious}
              disabled={!onPrevious}
            >
              Précédente
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconRight={ChevronRight}
              onClick={onNext}
              disabled={!onNext}
            >
              Suivante
            </Button>
            {position && (
              <span className="ml-1 text-xs text-ink-subtle tabular-nums">
                {position.index} sur {position.total}
              </span>
            )}
          </div>
          <Button variant="secondary" onClick={onClose} data-autofocus>
            Fermer
          </Button>
        </>
      }
    >
      {row && (
        <div className="space-y-5 pb-1 pt-1">
          <dl className="space-y-3">
            <Row label="Auteur">
              {row.actor ? (
                <Link
                  href={`/admin/utilisateurs/${row.actor.id}`}
                  className={linkClass}
                >
                  {row.actor.fullName}
                </Link>
              ) : (
                <span className="text-ink-muted">
                  Système (ou compte supprimé depuis)
                </span>
              )}
            </Row>
            {row.entityId && (
              <Row label="Élément">
                <span className="text-ink-muted">
                  {entityTypeLabel(row.entityType)} ·{' '}
                </span>
                {name ? (
                  href ? (
                    <Link href={href} className={linkClass}>
                      {name}
                    </Link>
                  ) : (
                    <span className="font-medium">{name}</span>
                  )
                ) : (
                  <span className="text-ink-muted">nom inconnu</span>
                )}
                {row.entity && !row.entity.exists && (
                  <Badge className="ml-2">Supprimé</Badge>
                )}
                <span className="mt-0.5 block font-mono text-[11px] text-ink-subtle">
                  {row.entityId}
                </span>
              </Row>
            )}
            {row.subject && (
              <Row label="Bénéficiaire">
                <Link
                  href={`/admin/utilisateurs/${row.subject.id}`}
                  className={linkClass}
                >
                  {row.subject.fullName}
                </Link>
              </Row>
            )}
            <Row label="Adresse IP">
              {row.ipAddress ?? <span className="text-ink-subtle">—</span>}
            </Row>
            <Row label="Navigateur">
              {agent ? (
                <span title={row.userAgent ?? undefined}>{agent}</span>
              ) : (
                <span className="text-ink-subtle">—</span>
              )}
            </Row>
          </dl>

          <section aria-label="Valeurs consignées">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
              Valeurs consignées
            </h3>
            {diff.length === 0 ? (
              <p className="rounded-xl bg-sunken/70 px-3.5 py-3 text-[13px] text-ink-muted">
                Aucune valeur n’a été consignée pour cette action : seule sa
                trace (qui, quoi, quand) est conservée.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-line">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-line bg-sunken/60 text-xs text-ink-subtle">
                      <th scope="col" className="px-3.5 py-2 font-medium">
                        Champ
                      </th>
                      <th scope="col" className="px-3.5 py-2 font-medium">
                        Avant
                      </th>
                      <th scope="col" className="px-3.5 py-2 font-medium">
                        Après
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {diff.map((line) => (
                      <tr
                        key={line.key}
                        className={cx(line.changed && 'bg-warn-soft/60')}
                      >
                        <th
                          scope="row"
                          className="px-3.5 py-2 align-top font-medium text-ink"
                        >
                          {line.label}
                        </th>
                        <td className="px-3.5 py-2 align-top text-ink-muted [overflow-wrap:anywhere]">
                          {line.before ?? (
                            <span className="text-ink-subtle">
                              <span aria-hidden="true">—</span>
                              <span className="sr-only">non consigné</span>
                            </span>
                          )}
                        </td>
                        <td
                          className={cx(
                            'px-3.5 py-2 align-top [overflow-wrap:anywhere]',
                            line.changed
                              ? 'font-medium text-ink'
                              : 'text-ink-muted',
                          )}
                        >
                          {line.after ?? (
                            <span className="text-ink-subtle">
                              <span aria-hidden="true">—</span>
                              <span className="sr-only">non consigné</span>
                            </span>
                          )}
                          {line.changed && (
                            <span className="sr-only"> (modifié)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </Dialog>
  );
}
