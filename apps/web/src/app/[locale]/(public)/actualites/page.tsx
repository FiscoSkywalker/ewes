import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, BookOpen } from 'lucide-react';
import { NewsCard, NewsMeta } from '@/components/public/news-card';
import { SectionHeading } from '@/components/public/section-heading';
import type { NewsCategory } from '@/data/news';
import { Link } from '@/i18n/navigation';
import { getNewsListPage, parseCategory, parsePage } from '@/lib/news';
import {
  ButtonLink,
  EmptyState,
  FilterChip,
  Pagination,
} from '@/components/public/ui';

/**
 * Page Actualités & publications (blueprint/15_Public_Site_Pages.md) —
 * Server Component, sans îlot client. Rubriques et pagination passent par
 * l'URL (`?categorie=&page=`) : liens explorables par les moteurs, état
 * partageable, et transmis tels quels à l'API qui pagine et filtre : seule la
 * page affichée est chargée (`getNewsListPage`, `src/lib/news.ts`). Chaque
 * actualité a sa page `/actualites/{id}`.
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
  const { featured, items, page, pageCount, total, categories } =
    await getNewsListPage(category, parsePage(params.page));

  return (
    <div className="bg-paper px-6 pb-24 pt-28 text-sand md:px-16 md:pb-32 md:pt-36">
      <div className="mx-auto w-full max-w-[1440px]">
        <SectionHeading
          as="h1"
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
          className="mb-14 max-w-4xl"
        />

        {total === 0 ? (
          <EmptyState align="center" message={t('emptyState')} />
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
              <FilterChip
                href={listHref(null)}
                active={!category}
                count={total}
              >
                {t('categories.all')}
              </FilterChip>
              {categories.map(({ key, count }) => (
                <FilterChip
                  key={key}
                  href={listHref(key)}
                  active={category === key}
                  count={count}
                >
                  {t(`categories.${key}`)}
                </FilterChip>
              ))}
            </nav>

            {/* Liste */}
            {items.length > 0 ? (
              <ul
                className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
                data-stagger
              >
                {items.map((item) => (
                  <li key={item.id}>
                    <NewsCard
                      item={item}
                      headingLevel={featured ? 'h3' : 'h2'}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              !featured && (
                <EmptyState align="center" message={t('emptyCategory')} />
              )
            )}

            <Pagination
              page={page}
              pageCount={pageCount}
              label={t('pagination.label')}
              hrefFor={(number) => listHref(category, number)}
              className="mt-14"
            />
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
          <ButtonLink
            href="/documents"
            icon={ArrowRight}
            className="w-fit flex-none"
          >
            {t('library.cta')}
          </ButtonLink>
        </aside>
      </div>
    </div>
  );
}
