'use client';

import { useQuery } from '@tanstack/react-query';
import { backendJson } from '@/lib/api/backend';
import { accountKey, type Account } from '@/lib/admin/profile';
import { useSession } from '@/components/admin/session';
import { IdentityCard } from '@/components/admin/profile/identity-card';
import { PasswordForm } from '@/components/admin/profile/password-form';
import { ProfileHero } from '@/components/admin/profile/profile-hero';
import { RoleCard } from '@/components/admin/profile/role-card';
import { SessionsCard } from '@/components/admin/profile/sessions-card';

/** `/admin/profil` : « Mon profil », ouvert à tous les rôles. */
export default function ProfilePage() {
  const session = useSession();
  const account = useQuery({
    queryKey: accountKey,
    queryFn: () => backendJson<Account>('me/account'),
  });

  return (
    <div className="space-y-6">
      <ProfileHero session={session} account={account.data} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="animate-rise-in min-w-0 space-y-6 [animation-delay:80ms]">
          <IdentityCard session={session} />
          <PasswordForm passwordChangedAt={account.data?.passwordChangedAt} />
        </div>
        <aside
          aria-label="Appareils et rôle"
          className="animate-rise-in min-w-0 space-y-6 [animation-delay:160ms]"
        >
          <SessionsCard query={account} />
          <RoleCard role={session.role} />
        </aside>
      </div>
    </div>
  );
}
