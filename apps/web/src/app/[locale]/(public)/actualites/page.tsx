import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';

interface NewsItem {
  type: string;
  date: string;
  title: string;
}

/**
 * Page Actualités & publications (blueprint/15_Public_Site_Pages.md) —
 * ISR courte, Server Component. Réutilise les entrées déjà publiées sur
 * l'Accueil (namespace `Resources.news`) ; module NestJS `actualites` à
 * brancher en Phase 03 (blueprint/21 backlog).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('NewsPage');
  return { title: t('eyebrow'), description: t('description') };
}

export default async function NewsPage() {
  const t = await getTranslations('NewsPage');
  const tResources = await getTranslations('Resources');
  const news = tResources.raw('news') as NewsItem[];

  return (
    <div className="px-6 py-16 text-sand md:px-16 md:py-24">
      <SectionHeading
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />

      {news.length === 0 ? (
        <p className="mt-12 border-t border-sand/20 py-12 text-center text-sm text-sand/55">
          {t('emptyState')}
        </p>
      ) : (
        <div className="mx-auto mt-12 max-w-4xl border-y border-sand/20">
          {news.map((item, index) => (
            <article
              key={item.title}
              className="group grid grid-cols-[38px_1fr_auto] items-center gap-4 border-b border-sand/20 py-6 last:border-b-0"
            >
              <span className="font-heading text-xl text-water">
                0{index + 1}
              </span>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-primary">
                  {item.type} · {item.date}
                </div>
                <h3 className="mt-1 font-heading text-xl font-semibold leading-tight text-sand">
                  {item.title}
                </h3>
              </div>
              <ArrowUpRight
                size={17}
                className="text-sand/40 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary"
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
