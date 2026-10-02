'use client';

import { useId, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CircleAlert, Handshake, Plus, X } from 'lucide-react';
import { ApiError, backendJson } from '@/lib/api/backend';
import { cx } from '@/lib/admin/cx';
import { plural } from '@/lib/admin/format';
import {
  MAX_PARTNER_NAME,
  MAX_REALISATION_PARTNERS,
  type PartnerEntry,
  type Realisation,
} from '@/lib/admin/realisations';
import { Button, Card, Input, useToast } from '../ui';

const clean = (name: string) => name.trim().replace(/\s+/g, ' ');
const key = (name: string) => clean(name).toLowerCase();

/**
 * Partenaires et bailleurs d'une réalisation : une liste de noms, saisie
 * assistée par ceux déjà employés ailleurs (une même organisation s'écrit
 * alors toujours pareil). Les changements s'enregistrent d'un coup
 * (`PUT :id/partners`) ; la liste est remplacée, jamais fusionnée.
 *
 * À monter avec une `key` qui change après chaque enregistrement.
 */
export function PartnersCard({
  realisation,
  onSaved,
}: {
  realisation: Realisation;
  onSaved: (saved: Realisation) => Promise<unknown> | unknown;
}) {
  const toast = useToast();
  const listId = useId();
  const [initial] = useState(() => realisation.partners.map((p) => p.name));
  const [names, setNames] = useState<string[]>(initial);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Annuaire : noms déjà employés dans d'autres réalisations (proposés à la saisie).
  const directory = useQuery({
    queryKey: ['realisations', 'partners', 'directory'],
    queryFn: () =>
      backendJson<{ data: PartnerEntry[] }>('admin/realisation-partners'),
    staleTime: 60_000,
  });
  const taken = new Set(names.map(key));
  const suggestions = (directory.data?.data ?? []).filter(
    (p) => !taken.has(key(p.name)),
  );

  const dirty = JSON.stringify(names) !== JSON.stringify(initial);
  const full = names.length >= MAX_REALISATION_PARTNERS;

  function add(raw: string) {
    // Une virgule colle plusieurs noms d'un coup (« FNPSS, DPEM »).
    const wanted = raw.split(',').map(clean).filter(Boolean);
    if (wanted.length === 0) return;
    const next = [...names];
    const duplicates: string[] = [];
    const tooLong: string[] = [];
    for (const name of wanted) {
      if (name.length > MAX_PARTNER_NAME) tooLong.push(name);
      else if (next.some((n) => key(n) === key(name))) duplicates.push(name);
      else if (next.length < MAX_REALISATION_PARTNERS) next.push(name);
    }
    setNames(next);
    // Un nom refusé reste dans le champ pour être corrigé.
    setText(tooLong.join(', '));
    setNotice(
      tooLong.length > 0
        ? `Un nom dépasse ${MAX_PARTNER_NAME} caractères : raccourcissez-le.`
        : duplicates.length > 0
          ? `${duplicates.join(', ')} : déjà dans la liste.`
          : null,
    );
  }

  const save = useMutation({
    mutationFn: () =>
      backendJson<Realisation>(
        `admin/realisations/${realisation.id}/partners`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ partners: names }),
        },
      ),
    onSuccess: async (saved) => {
      await onSaved(saved);
      toast.success('Partenaires enregistrés');
    },
    onError: (caught) =>
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Les partenaires n’ont pas pu être enregistrés. Réessayez.',
      ),
  });

  return (
    <Card
      title="Partenaires & bailleurs"
      description={
        names.length === 0
          ? 'Organisations associées à cette mission : bailleurs, partenaires, co-traitants.'
          : `${plural(names.length, 'organisation')} sur ${MAX_REALISATION_PARTNERS} — affichées sur la fiche publique de la mission.`
      }
    >
      {names.length > 0 && (
        <ul
          role="list"
          aria-label="Partenaires de la réalisation"
          className="mb-4 flex flex-wrap gap-2"
        >
          {names.map((name) => (
            <li
              key={key(name)}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-soft py-1 pl-3 pr-1 text-[13px] font-medium text-brand"
            >
              <span className="truncate">{name}</span>
              <button
                type="button"
                onClick={() => setNames(names.filter((n) => n !== name))}
                aria-label={`Retirer ${name}`}
                className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-brand/15 focus-visible:outline-2 focus-visible:outline-brand"
              >
                <X size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          add(text);
        }}
        className="flex gap-2"
      >
        <div className="relative min-w-0 flex-1">
          <Handshake
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
          />
          <Input
            aria-label="Ajouter un partenaire ou un bailleur"
            placeholder={
              full ? 'Maximum atteint' : 'Nom de l’organisation, puis Entrée…'
            }
            list={listId}
            value={text}
            maxLength={MAX_PARTNER_NAME * 2}
            disabled={full}
            autoComplete="off"
            onChange={(event) => {
              setText(event.target.value);
              setNotice(null);
            }}
            className="pl-9"
          />
          <datalist id={listId}>
            {suggestions.slice(0, 50).map((p) => (
              <option key={p.name} value={p.name} />
            ))}
          </datalist>
        </div>
        <Button
          type="submit"
          variant="secondary"
          icon={Plus}
          disabled={full || clean(text) === ''}
        >
          Ajouter
        </Button>
      </form>
      <p
        className={cx(
          'mt-2 text-xs',
          notice ? 'font-medium text-warn' : 'text-ink-subtle',
        )}
      >
        {notice ??
          'Les noms déjà utilisés dans d’autres réalisations sont proposés pendant la saisie. Une virgule sépare plusieurs noms.'}
      </p>

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
              setNames(initial);
              setText('');
              setNotice(null);
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
            Enregistrer les partenaires
          </Button>
        </div>
      )}
    </Card>
  );
}
