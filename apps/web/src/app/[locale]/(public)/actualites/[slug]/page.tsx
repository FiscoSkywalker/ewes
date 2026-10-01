import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import { NewsCard, NewsMeta } from '@/components/public/news-card';
import { ShareLinks } from '@/components/public/share-links';
import { formatNewsDate } from '@/data/news';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getAllNews, getNewsItem, readingMinutes } from '@/lib/news';

/**
 * Page d'une actualité (`/actualites/{id}`) — Server Component, SSG : une
 * URL stable par article, métadonnées Open Graph de type `article` et
 * données structurées schema.org `NewsArticle`. Seul le partage est un îlot
 * client. Aucun texte n'est inventé : sans corps (`body`), l'extrait tient
 * lieu d'article.
 */
export async function generateStaticParams() {
  const params = await Promise.all(
    routing.locales.map(async (locale) =>
      (await getAllNews(locale)).map((item) => ({ locale, slug: item.id })),
    ),
  );
  return params.flat();
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/actualites/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const entry = await getNewsItem(slug);
  if (!entry) return {};
  const { item } = entry;
  return {
    title: item.title,
    description: item.excerpt,
    openGraph: {
      type: 'article',
      title: item.title,
      description: item.excerpt,
      publishedTime: item.date,
      images: item.image ? [{ url: item.image, alt: item.imageAlt }] : [],
    },
  };
}

export default async function NewsArticlePage({
  params,
}: PageProps<'/[locale]/actualites/[slug]'>) {
  const { locale: routeLocale, slug } = await params;
  setRequestLocale(routeLocale);
  const entry = await getNewsItem(slug);
  if (!entry) notFound();

  const { item, newer, older, related } = entry;
  const t = await getTranslations('NewsPage');
  const tNav = await getTranslations('NewsPage.article');
  const locale = await getLocale();
  const minutes = readingMinutes(item);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: item.title,
    description: item.excerpt,
    datePublished: item.date,
    inLanguage: locale,
    image: item.image ? [item.image] : undefined,
    publisher: { '@type': 'Organization', name: 'EWES S.A.R.L.' },
  };

  const facts = [
    [tNav('facts.category'), t(`categories.${item.category}`)],
    [tNav('facts.date'), formatNewsDate(item.date, locale)],
    [tNav('facts.context'), item.context],
    ...(minutes ? [[tNav('facts.reading'), tNav('minutes', { count: minutes })]] : []),
  ];

  return (
    <div className="bg-paper px-6 pb-24 pt-28 text-sand md:px-16 md:pb-32 md:pt-36">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <article className="mx-auto w-full max-w-[1200px]">
        {/* Fil d'Ariane */}
        <nav aria-label={tNav('breadcrumb')} className="mb-10">
          <ol className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            <li>
              <Link href="/" className="hover:text-sand">
                {tNav('home')}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight size={12} />
            </li>
            <li>
              <Link href="/actualites" className="hover:text-sand">
                {t('eyebrow')}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight size={12} />
            </li>
            <li aria-current="page" className="line-clamp-1 max-w-[40ch] text-sand">
              {item.title}
            </li>
          </ol>
        </nav>

        <header className="max-w-4xl" data-reveal>
          <NewsMeta item={item} />
          <h1 className="section-title mt-6 text-4xl text-sand sm:text-5xl lg:text-6xl">
            {item.title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-sand/80">
            {item.excerpt}
          </p>
        </header>

        {item.image && (
          <figure className="relative mt-12 aspect-[16/9] overflow-hidden rounded-sheet md:aspect-[21/9]">
            <Image
              src={item.image}
              alt={item.imageAlt}
              fill
              priority
              sizes="(min-width: 1200px) 1200px, 100vw"
              className="object-cover"
            />
          </figure>
        )}

        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-20">
          <div className="max-w-[68ch]">
            {item.body?.length ? (
              <div className="space-y-6 text-base leading-8 text-sand/85 first-letter:float-left first-letter:mr-3 first-letter:font-heading first-letter:text-6xl first-letter:font-bold first-letter:leading-[0.85] first-letter:text-malachite">
                {item.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <div className="rounded-sheet border border-border-subtle bg-surface-elevated p-8">
                <p className="text-sm leading-7 text-sand/75">{tNav('noBody')}</p>
                <Link
                  href="/contact"
                  className="mt-5 inline-flex items-center gap-2 border-b border-sand/25 pb-0.5 text-xs font-bold uppercase tracking-[0.12em] transition-colors hover:border-sand"
                >
                  {tNav('contact')} <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>

          <aside className="self-start lg:sticky lg:top-28">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-sand pt-6 lg:grid-cols-1">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold leading-6">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-8 border-t border-border pt-6">
              <ShareLinks title={item.title} />
            </div>
          </aside>
        </div>

        {/* Article précédent / suivant */}
        {(newer || older) && (
          <nav
            aria-label={tNav('otherArticles')}
            className="mt-20 grid overflow-hidden rounded-sheet border border-border-subtle bg-surface-elevated sm:grid-cols-2"
          >
            {[
              { entry: older, label: tNav('older'), Icon: ArrowLeft, end: false },
              { entry: newer, label: tNav('newer'), Icon: ArrowRight, end: true },
            ].map(({ entry: other, label, Icon, end }) =>
              other ? (
                <Link
                  key={label}
                  href={`/actualites/${other.id}`}
                  className={`group flex flex-col gap-2 p-7 transition-colors hover:bg-white sm:p-8 ${end ? 'sm:items-end sm:border-l sm:border-border-subtle sm:text-right' : 'border-b border-border-subtle sm:border-b-0'}`}
                >
                  <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    {!end && <Icon size={12} className="transition-transform group-hover:-translate-x-1" />}
                    {label}
                    {end && <Icon size={12} className="transition-transform group-hover:translate-x-1" />}
                  </span>
                  <span className="line-clamp-2 font-heading text-lg font-bold leading-snug">
                    {other.title}
                  </span>
                </Link>
              ) : (
                <span key={label} className="hidden sm:block" />
              ),
            )}
          </nav>
        )}
      </article>

      {/* À lire aussi */}
      {related.length > 0 && (
        <section
          aria-labelledby="related-title"
          className="mx-auto mt-20 w-full max-w-[1200px]"
        >
          <div className="mb-8 flex items-end justify-between gap-6">
            <h2 id="related-title" className="font-heading text-3xl font-bold">
              {tNav('related')}
            </h2>
            <Link
              href="/actualites"
              className="inline-flex flex-none items-center gap-2 border-b border-sand/25 pb-1 text-xs font-bold uppercase tracking-[0.12em] transition-colors hover:border-sand"
            >
              {tNav('allNews')} <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((other) => (
              <li key={other.id}>
                <NewsCard item={other} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
