import { ShieldCheck } from 'lucide-react';
import type { Role } from '@/lib/admin/roles';
import { ROLE_PROFILES } from '@/lib/admin/users';
import { SettingsSection } from '../settings/settings-section';
import { RoleScope } from '../users/role-scope';

/** Ce que le rôle de la personne lui permet, en clair. Informatif : c'est le serveur qui décide. */
export function RoleCard({ role }: { role: Role }) {
  const profile = ROLE_PROFILES[role];
  const Icon = profile.icon;
  return (
    <SettingsSection
      icon={ShieldCheck}
      tone="env"
      title="Votre rôle"
      description="Ce que votre compte peut faire dans le portail."
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3.5">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl ${profile.tile}`}
          >
            <Icon size={19} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{profile.label}</p>
            <p className="text-[13px] text-ink-muted">{profile.tagline}</p>
          </div>
        </div>
        <RoleScope role={role} />
        <p className="rounded-xl bg-sunken/70 px-3.5 py-3 text-xs leading-relaxed text-ink-muted">
          Seul un administrateur peut modifier votre rôle.
        </p>
      </div>
    </SettingsSection>
  );
}
