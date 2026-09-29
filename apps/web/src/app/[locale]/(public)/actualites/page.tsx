import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { NewsGrid } from '@/components/public/news-grid';
import { SectionHeading } from '@/components/public/section-heading';

/**
 * Page Actualités & publications (blueprint/15_Public_Site_Pages.md) —
 * ISR courte, Server Component. Même « carnet de bord » que l'Accueil
 * (`NewsGrid`, namespace `News`) ; module NestJS `actualites` à brancher en
 * Phase 03 (blueprint/21 backlog).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('NewsPage');
  return { title: t('eyebrow'), description: t('description') };
}

export default async function NewsPage() {
  const t = await getTranslations('NewsPage');
  const tNews = await getTranslations('News');
  const hasNews = (tNews.raw('items') as unknown[]).length > 0;

  return (
    <div className="px-6 pb-20 pt-28 text-sand md:px-16 md:pb-28 md:pt-36">
      <div className="mx-auto w-full max-w-[1440px]">
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
          className="mb-14"
        />
        {hasNews ? (
          <NewsGrid />
        ) : (
          <p className="border-t border-sand/20 py-12 text-center text-sm text-sand/55">
            {t('emptyState')}
          </p>
        )}
      </div>
    </div>
  );
}
