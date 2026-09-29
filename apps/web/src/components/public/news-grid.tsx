import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { NEWS_IMAGES, type NewsItem } from '@/data/news';

/**
 * Grille éditoriale des actualités (« carnet de bord ») : une actualité à la
 * une, les suivantes en vignettes. Partagée entre l'Accueil et
 * /actualites ; compatible Server Component (pas d'état).
 */
export function NewsGrid() {
  const t = useTranslations('News');
  const items = t.raw('items') as NewsItem[];

  if (items.length === 0) return null;

  return (
    <div
      className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:grid-rows-[auto_auto] lg:gap-x-14 lg:gap-y-12"
      data-stagger
    >
      {items.map((item, index) => {
        const lead = index === 0;
        return (
          <article
            key={item.id}
            className={
              lead
                ? 'lg:row-span-2'
                : 'grid gap-5 sm:grid-cols-[180px_1fr] sm:items-start'
            }
          >
            <figure
              className={`group relative overflow-hidden bg-paper-muted ${
                lead ? 'mb-6 aspect-[4/3]' : 'aspect-[16/10] sm:aspect-square'
              }`}
            >
              <Image
                src={
                  NEWS_IMAGES[item.id] ??
                  '/assets/images/ewes-environment-fallback.png'
                }
                alt={item.imageAlt}
                fill
                sizes={
                  lead
                    ? '(min-width: 1024px) 55vw, 100vw'
                    : '(min-width: 640px) 180px, 100vw'
                }
                className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
              />
            </figure>
            <div>
              <p className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted">
                <span className="border border-current px-2 py-0.5 uppercase tracking-[0.06em] text-malachite">
                  {item.type}
                </span>
                {item.date} · {item.context}
              </p>
              <h3
                className={`mt-3 font-heading font-semibold leading-tight text-sand ${
                  lead ? 'text-3xl sm:text-4xl' : 'text-xl'
                }`}
              >
                {item.title}
              </h3>
              {lead && (
                <p className="mt-4 max-w-xl text-sm leading-7 text-sand/72">
                  {item.excerpt}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
