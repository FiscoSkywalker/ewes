'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { NewsGrid } from '@/components/public/news-grid';
import { SectionHeading } from '@/components/public/section-heading';
import { Link } from '@/i18n/navigation';

/** « 04 · Actualités & publications » de l'Accueil — homepage uniquement. */
export function NewsSection() {
  const t = useTranslations('News');

  return (
    <section className="bg-paper-muted px-6 py-24 text-sand md:px-16 md:py-32">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading eyebrow={t('eyebrow')} title={t('title')} />
          <Link
            href="/actualites"
            className="inline-flex w-fit flex-none items-center gap-2 border-b border-sand/25 pb-1 text-xs font-bold uppercase tracking-[0.12em] text-sand transition-colors hover:border-sand"
          >
            {t('viewAll')} <ArrowRight size={14} />
          </Link>
        </div>
        <NewsGrid />
      </div>
    </section>
  );
}
