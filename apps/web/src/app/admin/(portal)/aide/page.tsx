'use client';

import { PageHeader } from '@/components/admin/page-header';
import { GuideView } from '@/components/admin/guide/guide-view';
import { useSession } from '@/components/admin/session';

/** `/admin/aide` : « Guide d'utilisation », ouvert à tous les rôles (menu du compte). */
export default function GuidePage() {
  const session = useSession();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compte"
        title="Guide d’utilisation"
        description="Le mode d’emploi du portail, écran par écran : publier un contenu, gérer les documents, administrer les accès."
      />
      <GuideView role={session.role} />
    </div>
  );
}
