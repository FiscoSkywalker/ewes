import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { FileDown, Lock } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';

/**
 * Page Documents (blueprint/15_Public_Site_Pages.md §5) — liste publique en
 * ISR (Server Component) + passerelle vers l'espace documentaire privé.
 * L'espace documentaire privé lui-même (blueprint/11_Document_Management_System.md)
 * n'est pas encore implémenté (module `documents-prives`, Phase 03) : le lien
 * ci-dessous pointe donc temporairement vers le portail admin existant,
 * seul point d'authentification fonctionnel à ce stade.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('DocumentsPage');
  return { title: t('eyebrow'), description: t('description') };
}

export default async function DocumentsPage() {
  const t = await getTranslations('DocumentsPage');

  return (
    <div className="px-6 pb-16 pt-28 text-sand md:px-16 md:pb-24 md:pt-36">
      <SectionHeading
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />

      <div className="mx-auto mt-14 grid max-w-[1440px] gap-10 lg:grid-cols-2">
        <div className="border border-sand/15 bg-surface p-8">
          <FileDown size={20} className="text-primary" />
          <h2 className="mt-4 font-heading text-xl font-semibold text-sand">
            {t('publicListTitle')}
          </h2>
          <p className="mt-3 text-sm leading-6 text-sand/55">
            {t('publicListEmpty')}
          </p>
        </div>

        <div className="border border-primary/25 bg-surface-elevated p-8">
          <Lock size={20} className="text-primary" />
          <h2 className="mt-4 font-heading text-xl font-semibold text-sand">
            {t('privateTitle')}
          </h2>
          <p className="mt-3 text-sm leading-6 text-sand/55">
            {t('privateText')}
          </p>
          {/* next/link brut (pas @/i18n/navigation) : /admin est une branche racine
              non localisée (voir apps/web/src/app/admin/layout.tsx). */}
          <Link
            href="/admin/login"
            className="primary-button mt-6 inline-flex w-fit"
          >
            {t('privateCta')}
          </Link>
        </div>
      </div>
    </div>
  );
}
