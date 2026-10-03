'use client';

import { useState } from 'react';
import { ArrowRight, CircleAlert, ShieldAlert } from 'lucide-react';
import { backendJson, describeError } from '@/lib/api/backend';
import type { Role } from '@/lib/admin/roles';
import { ROLE_PROFILES, type UserDetail } from '@/lib/admin/users';
import { Button, Dialog } from '../ui';
import { RolePicker } from './role-picker';

/**
 * Changement de rôle : choix du nouveau rôle puis confirmation explicite
 * (blueprint/14_Admin_Backoffice.md §4). La fenêtre annonce ce qui va se
 * passer, reste ouverte pendant la requête et affiche le refus du serveur
 * (dernier administrateur, rôle inchangé…) sans présumer du succès.
 */
export function RoleDialog({
  user,
  open,
  onClose,
  onChanged,
}: {
  user: UserDetail;
  open: boolean;
  onClose: () => void;
  onChanged: (user: UserDetail) => void | Promise<void>;
}) {
  // Contenu monté à l'ouverture seulement : à chaque ouverture, le choix repart du rôle actuel.
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
      title={`Changer le rôle de ${user.fullName}`}
      description="Le changement est enregistré dans le journal d’audit, avec l’ancien et le nouveau rôle."
    >
      {open && <RoleForm user={user} onClose={onClose} onChanged={onChanged} />}
    </Dialog>
  );
}

function RoleForm({
  user,
  onClose,
  onChanged,
}: {
  user: UserDetail;
  onClose: () => void;
  onChanged: (user: UserDetail) => void | Promise<void>;
}) {
  const [role, setRole] = useState<Role>(user.role);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const unchanged = role === user.role;
  const demotion = user.role === 'ADMINISTRATEUR' && !unchanged;
  const info = error ? describeError(error) : null;

  async function submit() {
    if (unchanged || pending) return;
    setPending(true);
    setError(null);
    try {
      const updated = await backendJson<UserDetail>(
        `admin/users/${user.id}/role`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ role }),
        },
      );
      await onChanged(updated);
      onClose();
    } catch (caught) {
      setError(caught);
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="space-y-4"
    >
      <RolePicker
        legend="Nouveau rôle"
        value={role}
        current={user.role}
        onChange={setRole}
        disabled={pending}
      />

      <div
        className="rounded-xl border border-line bg-sunken/60 px-3.5 py-3 text-[13px] leading-relaxed text-ink-muted"
        aria-live="polite"
      >
        {unchanged ? (
          'Choisissez un autre rôle pour continuer.'
        ) : (
          <>
            <p className="flex flex-wrap items-center gap-1.5 font-medium text-ink">
              {ROLE_PROFILES[user.role].label}
              <ArrowRight
                size={14}
                aria-hidden="true"
                className="text-ink-subtle"
              />
              {ROLE_PROFILES[role].label}
            </p>
            <p className="mt-1">
              {user.fullName} sera déconnecté(e) de tous ses appareils et
              retrouvera ses accès avec le nouveau rôle à sa prochaine
              connexion.
            </p>
          </>
        )}
      </div>

      {demotion && (
        <div className="flex gap-2.5 rounded-xl border border-warn/30 bg-warn-soft px-3.5 py-3 text-[13px] text-ink">
          <ShieldAlert
            size={16}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-warn"
          />
          <p>
            Ce compte perdra la gestion des comptes, des droits d’accès et du
            journal d’audit.
          </p>
        </div>
      )}

      {info && (
        <div
          role="alert"
          className="flex gap-2.5 rounded-xl border border-bad/25 bg-bad-soft px-3.5 py-3 text-[13px]"
        >
          <CircleAlert
            size={16}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-bad"
          />
          <div>
            <p className="font-medium text-ink">{info.title}</p>
            <p className="mt-0.5 text-ink-muted">{info.message}</p>
          </div>
        </div>
      )}

      <div className="-mx-5 -mb-3 mt-1 flex flex-col-reverse gap-2 border-t border-line bg-sunken/50 px-5 py-3.5 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={pending}
          data-autofocus
        >
          Annuler
        </Button>
        <Button
          type="submit"
          variant={demotion ? 'danger' : 'primary'}
          loading={pending}
          disabled={unchanged}
        >
          Changer le rôle
        </Button>
      </div>
    </form>
  );
}
