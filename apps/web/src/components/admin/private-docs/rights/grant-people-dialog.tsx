'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, UserPlus, UserRoundSearch } from 'lucide-react';
import { backendJson, describeError } from '@/lib/api/backend';
import { cx } from '@/lib/admin/cx';
import { normalizeText, plural } from '@/lib/admin/format';
import { DOCS_KEY } from '@/lib/admin/private-docs';
import type { UserSummary } from '@/lib/admin/users';
import {
  Button,
  ButtonLink,
  Dialog,
  EmptyState,
  ErrorState,
  SearchInput,
  Skeleton,
  StatusChip,
} from '../../ui';
import { UserAvatar } from '../../users/user-avatar';
import { DialogActions, FormAlert } from '../dialog-parts';

/** Comptes à qui un droit peut se donner : actifs, hors administrateurs (qui ont déjà tout). */
export function useGrantableUsers(enabled = true) {
  return useQuery({
    queryKey: [DOCS_KEY, 'grantable-users'],
    queryFn: async () =>
      (await backendJson<UserSummary[]>('admin/users')).filter(
        (user) => user.isActive && user.role !== 'ADMINISTRATEUR',
      ),
    staleTime: 60_000,
    enabled,
  });
}

export interface GrantPeopleTarget {
  /** Titre de la fenêtre : « Donner l'accès à « Fiscalité » ». */
  title: string;
  /** Ce que le droit ouvre exactement (portée), rappelé avant de valider. */
  scope: React.ReactNode;
  /** Ce que la personne pourra faire, selon son rôle. */
  effect: (role: UserSummary['role']) => string;
  /** Comptes qui ont déjà ce droit : listés, mais non sélectionnables. */
  alreadyGranted: ReadonlySet<string>;
  /** Attribue le droit à une personne ; lève l'erreur de l'API en cas de refus. */
  grant: (userId: string) => Promise<unknown>;
}

/**
 * Choix des personnes à qui donner un droit (dossier ou document). Cases à
 * cocher natives, plusieurs personnes à la fois, portée rappelée avant de
 * valider. Chaque attribution est envoyée séparément : un refus est nommé,
 * les autres sont conservées.
 */
export function GrantPeopleDialog({
  target,
  onClose,
  onGranted,
}: {
  target: GrantPeopleTarget | null;
  onClose: () => void;
  onGranted: (count: number) => void;
}) {
  return (
    <Dialog
      open={Boolean(target)}
      onClose={onClose}
      size="lg"
      title={target?.title ?? ''}
      description={target?.scope}
    >
      {target && (
        <GrantForm
          key={target.title}
          target={target}
          onClose={onClose}
          onGranted={onGranted}
        />
      )}
    </Dialog>
  );
}

function GrantForm({
  target,
  onClose,
  onGranted,
}: {
  target: GrantPeopleTarget;
  onClose: () => void;
  onGranted: (count: number) => void;
}) {
  const users = useGrantableUsers();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const term = normalizeText(search.trim());
  const visible = (users.data ?? []).filter(
    (user) =>
      !term || normalizeText(`${user.fullName} ${user.email}`).includes(term),
  );

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function submit() {
    setSaving(true);
    setFormError(null);
    const failures: string[] = [];
    let granted = 0;
    for (const user of (users.data ?? []).filter((u) => selected.has(u.id))) {
      try {
        await target.grant(user.id);
        granted += 1;
        // Déjà attribué : on ne le renverra pas si l'utilisateur réessaie pour les autres.
        setSelected((current) => {
          const next = new Set(current);
          next.delete(user.id);
          return next;
        });
      } catch (error) {
        failures.push(`${user.fullName} : ${describeError(error).message}`);
      }
    }
    if (granted > 0) onGranted(granted);
    if (failures.length === 0) {
      onClose();
      return;
    }
    setFormError(failures.join(' '));
    setSaving(false);
  }

  if (users.isLoading) {
    return (
      <div className="space-y-2 pb-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }
  if (users.error) {
    return <ErrorState error={users.error} onRetry={() => users.refetch()} />;
  }
  if (!users.data?.length) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Aucun compte à qui donner un accès"
        description="Les droits se donnent aux gestionnaires et aux utilisateurs actifs. Les administrateurs ont déjà accès à tout."
        action={
          <ButtonLink href="/admin/utilisateurs/nouveau" size="sm">
            Inviter une personne
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FormAlert message={formError} />
      {users.data.length > 6 && (
        <SearchInput
          label="Chercher une personne"
          placeholder="Chercher par nom ou e-mail…"
          value={search}
          onValueChange={setSearch}
        />
      )}
      {visible.length === 0 ? (
        <EmptyState
          icon={UserRoundSearch}
          title="Personne ne correspond"
          description={`Aucun compte pour « ${search.trim()} ».`}
        />
      ) : (
        <ul aria-label="Personnes" className="flex flex-col gap-2">
          {visible.map((user) => {
            const already = target.alreadyGranted.has(user.id);
            const checked = selected.has(user.id);
            return (
              <li key={user.id}>
                <label
                  className={cx(
                    'flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors',
                    'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand',
                    already
                      ? 'cursor-default border-line bg-sunken/60'
                      : checked
                        ? 'border-brand bg-brand-soft'
                        : 'border-line-strong bg-panel hover:border-brand/40',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={already || saving}
                    onChange={() => toggle(user.id)}
                    className="sr-only"
                  />
                  <UserAvatar
                    userId={user.id}
                    avatarVersion={user.avatarVersion}
                    name={user.fullName}
                    role={user.role}
                    inactive={already}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-[13.5px] font-medium text-ink">
                        {user.fullName}
                      </span>
                      <StatusChip kind="role" value={user.role} />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-subtle">
                      {already ? 'A déjà cet accès' : target.effect(user.role)}
                    </span>
                  </span>
                  {!already && (
                    <span
                      aria-hidden="true"
                      className={cx(
                        'grid size-5 shrink-0 place-items-center rounded-md border transition-colors',
                        checked
                          ? 'border-brand bg-brand text-on-brand'
                          : 'border-line-strong bg-panel',
                      )}
                    >
                      {checked && <Check size={14} strokeWidth={3} />}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <DialogActions>
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button
          icon={UserPlus}
          onClick={submit}
          loading={saving}
          disabled={selected.size === 0}
        >
          {selected.size > 0
            ? `Donner l’accès à ${plural(selected.size, 'personne')}`
            : 'Donner l’accès'}
        </Button>
      </DialogActions>
    </div>
  );
}
