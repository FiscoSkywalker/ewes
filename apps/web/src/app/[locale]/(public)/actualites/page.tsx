import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { NewsCard, NewsMeta } from '@/components/public/news-card';
import { SectionHeading } from '@/components/public/section-heading';
import { NEWS_CATEGORIES, type NewsCategory } from '@/data/news';
import { Link } from '@/i18n/navigation';
import {
  NEWS_PAGE_SIZE,
  getAllNews,
  parseCategory,
  parsePage,
} from '@/lib/news';

/**
 * Page Actualités & publications (blueprint/15_Public_Site_Pages.md) —
 * Server Component, sans îlot client. Rubriques et pagination passent par
 * l'URL (`?categorie=&page=`) : liens explorables par les moteurs, état
 * partageable, et correspondance directe avec la future pagination de l'API
 * (`src/lib/news.ts`). Chaque actualité a sa page `/actualites/{id}`.
 */
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const t = await getTranslations('NewsPage');
  const page = parsePage((await searchParams).page);
  return {
    title: page > 1 ? t('pageTitle', { page }) : t('eyebrow'),
    description: t('description'),
  };
}

function listHref(category: NewsCategory | null, page = 1) {
  const query: Record<string, string> = {};
  if (category) query.categorie = category;
  if (page > 1) query.page = String(page);
  return { pathname: '/actualites', query } as const;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations('NewsPage');
  const params = await searchParams;
  const category = parseCategory(params.categorie);
  const all = await getAllNews();

  const counts = new Map<NewsCategory, number>();
  for (const item of all)
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  const categories = NEWS_CATEGORIES.filter((key) => counts.has(key));

  // À la une : la plus récente, uniquement sur la première page non filtrée.
  const filtered = category
    ? all.filter((item) => item.category === category)
    : all;
  const requestedPage = parsePage(params.page);
  const showFeatured = !category && requestedPage === 1;
  const featured = showFeatured ? filtered[0] : undefined;
  const pool = category ? filtered : filtered.slice(1);
  const pageCount = Math.max(1, Math.ceil(pool.length / NEWS_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const items = pool.slice((page - 1) * NEWS_PAGE_SIZE, page * NEWS_PAGE_SIZE);

  const tab = (active: boolean) =>
    `inline-flex flex-none items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${
      active
        ? 'border-sand bg-sand text-paper'
        : 'border-sand/20 text-sand/75 hover:border-sand hover:text-sand'
    }`;

  return (
    <div className="bg-paper px-6 pb-24 pt-28 text-sand md:px-16 md:pb-32 md:pt-36">
      <div className="mx-auto w-full max-w-[1440px]">
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
          className="mb-14 max-w-4xl"
        />

        {all.length === 0 ? (
          <p className="rounded-sheet border border-dashed border-sand/25 p-12 text-center text-sm text-sand/60">
            {t('emptyState')}
          </p>
        ) : (
          <>
            {/* À la une */}
            {featured && (
              <article
                className="tone-night group relative mb-16 grid overflow-hidden rounded-sheet bg-night focus-within:ring-2 focus-within:ring-primary lg:grid-cols-[1.35fr_1fr]"
                data-reveal
              >
                <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[480px]">
                  <Image
                    src={featured.image!}
                    alt={featured.imageAlt}
                    fill
                    priority
                    sizes="(min-width: 1024px) 58vw, 100vw"
                    className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 bg-linear-to-t from-night/50 to-transparent lg:bg-linear-to-r lg:from-transparent lg:via-transparent lg:to-night/60"
                    aria-hidden="true"
                  />
                  <span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-night/65 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-on-night backdrop-blur-md">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-malachite-bright" />
                    {t('featured')}
                  </span>
                </div>
                <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
                  <NewsMeta item={featured} tone="night" />
                  <h2 className="mt-5 font-heading text-3xl font-bold leading-tight text-on-night sm:text-4xl">
                    <Link
                      href={`/actualites/${featured.id}`}
                      className="outline-none after:absolute after:inset-0 after:content-['']"
                    >
                      {featured.title}
                    </Link>
                  </h2>
                  <p className="mt-5 text-sm leading-7 sm:text-base">
                    {featured.excerpt}
                  </p>
                  <span className="mt-8 inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.12em] text-on-night">
                    {t('readMore')}
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-on-night/25 transition-colors group-hover:border-malachite-bright group-hover:bg-malachite-bright group-hover:text-night">
                      <ArrowRight size={16} />
                    </span>
                  </span>
                </div>
              </article>
            )}

            {/* Rubriques */}
            <nav
              aria-label={t('categoriesLabel')}
              className="-mx-1 mb-8 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
              data-lenis-prevent
            >
              <Link
                href={listHref(null)}
                aria-current={!category ? 'page' : undefined}
                className={tab(!category)}
              >
                {t('categories.all')}
                <span className="font-mono text-[10px] font-normal opacity-70">
                  {all.length}
                </span>
              </Link>
              {categories.map((key) => (
                <Link
                  key={key}
                  href={listHref(key)}
                  aria-current={category === key ? 'page' : undefined}
                  className={tab(category === key)}
                >
                  {t(`categories.${key}`)}
                  <span className="font-mono text-[10px] font-normal opacity-70">
                    {counts.get(key)}
                  </span>
                </Link>
              ))}
            </nav>

            {/* Liste */}
            {items.length > 0 ? (
              <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" data-stagger>
                {items.map((item) => (
                  <li key={item.id}>
                    <NewsCard item={item} headingLevel={featured ? 'h3' : 'h2'} />
                  </li>
                ))}
              </ul>
            ) : (
              !featured && (
                <p className="rounded-sheet border border-dashed border-sand/25 p-12 text-center text-sm text-sand/60">
                  {t('emptyCategory')}
                </p>
              )
            )}

            {/* Pagination */}
            {pageCount > 1 && (
              <nav
                aria-label={t('pagination.label')}
                className="mt-14 flex items-center justify-center gap-2"
              >
                {page > 1 ? (
                  <Link
                    href={listHref(category, page - 1)}
                    rel="prev"
                    aria-label={t('pagination.previous')}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:border-sand"
                  >
                    <ArrowLeft size={16} />
                  </Link>
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border opacity-30" aria-hidden="true">
                    <ArrowLeft size={16} />
                  </span>
                )}
                <ol className="flex items-center gap-1.5">
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                    (number) => (
                      <li key={number}>
                        <Link
                          href={listHref(category, number)}
                          aria-current={number === page ? 'page' : undefined}
                          aria-label={t('pagination.page', { page: number })}
                          className={`flex h-11 min-w-11 items-center justify-center rounded-full px-3 font-mono text-xs font-bold transition-colors ${
                            number === page
                              ? 'bg-sand text-paper'
                              : 'hover:bg-paper-muted'
                          }`}
                        >
                          {String(number).padStart(2, '0')}
                        </Link>
                      </li>
                    ),
                  )}
                </ol>
                {page < pageCount ? (
                  <Link
                    href={listHref(category, page + 1)}
                    rel="next"
                    aria-label={t('pagination.next')}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:border-sand"
                  >
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border opacity-30" aria-hidden="true">
                    <ArrowRight size={16} />
                  </span>
                )}
              </nav>
            )}
          </>
        )}

        {/* Renvoi vers la bibliothèque */}
        <aside
          className="mt-20 flex flex-col gap-6 rounded-sheet bg-paper-muted p-8 sm:p-10 md:flex-row md:items-center md:justify-between"
          data-reveal
        >
          <div className="flex max-w-xl gap-5">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-control bg-white text-primary">
              <BookOpen size={20} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="font-heading text-2xl font-bold">
                {t('library.title')}
              </h2>
              <p className="mt-2 text-sm leading-7 text-sand/72">
                {t('library.text')}
              </p>
            </div>
          </div>
          <Link href="/documents" className="primary-button w-fit flex-none">
            {t('library.cta')} <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
