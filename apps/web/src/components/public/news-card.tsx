import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';
import { NEWS_FALLBACK_IMAGE, formatNewsDate, type NewsItem } from '@/data/news';
import { Link } from '@/i18n/navigation';

/** Rubrique + date + contexte d'une actualité. */
export function NewsMeta({
  item,
  tone = 'light',
}: {
  item: NewsItem;
  tone?: 'light' | 'night';
}) {
  const t = useTranslations('NewsPage');
  const locale = useLocale();
  const night = tone === 'night';

  return (
    <p
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-[0.1em] ${night ? 'text-on-night-muted' : 'text-muted'}`}
    >
      <span
        className={`rounded-full px-2.5 py-1 font-bold ${night ? 'bg-malachite-bright/15 text-malachite-bright' : 'bg-malachite/10 text-malachite'}`}
      >
        {t(`categories.${item.category}`)}
      </span>
      <time dateTime={item.date}>{formatNewsDate(item.date, locale)}</time>
      <span aria-hidden="true">·</span>
      <span className="normal-case tracking-normal">{item.context}</span>
    </p>
  );
}

/**
 * Carte d'actualité (liste /actualites, articles liés). Toute la carte est
 * cliquable via le lien du titre étendu (`after:absolute`), un seul lien par
 * carte pour les lecteurs d'écran. Compatible Server Component.
 */
export function NewsCard({
  item,
  headingLevel: Heading = 'h3',
}: {
  item: NewsItem;
  headingLevel?: 'h2' | 'h3';
}) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-sheet border border-border-subtle bg-surface-elevated transition-all duration-300 focus-within:ring-2 focus-within:ring-primary hover:-translate-y-1 hover:border-border hover:shadow-[0_28px_56px_-30px_rgba(21,52,66,0.55)]">
      <div className="relative aspect-[3/2] overflow-hidden bg-paper-muted">
        <Image
          src={item.image ?? NEWS_FALLBACK_IMAGE}
          alt={item.imageAlt}
          fill
          sizes="(min-width: 1280px) 460px, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <NewsMeta item={item} />
        <Heading className="mt-4 font-heading text-xl font-bold leading-snug text-sand">
          <Link
            href={`/actualites/${item.id}`}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {item.title}
          </Link>
        </Heading>
        <p className="mb-6 mt-3 line-clamp-3 text-sm leading-6 text-sand/70">
          {item.excerpt}
        </p>
        <span
          className="mt-auto flex h-9 w-9 items-center justify-center self-end rounded-full border border-border text-sand transition-colors group-hover:border-sand group-hover:bg-sand group-hover:text-paper"
          aria-hidden="true"
        >
          <ArrowUpRight size={15} />
        </span>
      </div>
    </article>
  );
}
