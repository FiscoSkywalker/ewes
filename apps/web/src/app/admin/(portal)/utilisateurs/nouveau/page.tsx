'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { InviteForm } from '@/components/admin/users/invite-form';

export default function InviteUserPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/utilisateurs"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Utilisateurs & rôles
      </Link>
      <PageHeader
        eyebrow="Administration"
        title="Inviter un utilisateur"
        description="La personne reçoit un e-mail et choisit elle-même son mot de passe. Son compte n’existe qu’à partir de ce moment-là."
      />
      <InviteForm />
    </div>
  );
}
