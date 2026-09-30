'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDownToLine, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export type DocumentCategory = 'report' | 'guide' | 'datasheet' | 'brochure';
export type DocumentPole = 'env' | 'eau' | 'ing';

/**
 * Document téléchargeable par les visiteurs. Forme volontairement calquée sur
 * ce que renverra l'API (blueprint/11_Document_Management_System.md) : il
 * suffira de remplacer les exemples des messages par la réponse de l'API.
 */
export interface ShowcaseDocument {
  id: string;
  category: DocumentCategory;
  pole: DocumentPole;
  year: string;
  pages: number;
  /** Taille déjà formatée selon la locale (« 3,2 Mo » / « 3.2 MB »). */
  size: string;
  format: string;
  title: string;
  excerpt: string;
  /** Absent tant que le fichier n'est pas servi par l'API. */
  fileUrl?: string;
}

export const POLE_CLASS: Record<DocumentPole, string> = {
  env: 'pole-env',
  eau: 'pole-eau',
  ing: 'pole-ing',
};

/** Nombre de documents listés à côté du document à la une. */
const LIST_SIZE = 4;

/** Lien de téléchargement, ou vers la page Documents tant que le fichier n'existe pas. */
export function DocumentLink({
  doc,
  className,
  children,
  label,
}: {
  doc: ShowcaseDocument;
  className: string;
  children: ReactNode;
  label: string;
}) {
  if (doc.fileUrl) {
    return (
      <a href={doc.fileUrl} download className={className} aria-label={label}>
        {children}
      </a>
    );
  }
  return (
    <Link href="/documents" className={className} aria-label={label}>
      {children}
    </Link>
  );
}

/** Couverture stylisée d'un document : feuille papier sur une pile de pages. */
export function DocumentCover({ doc }: { doc: ShowcaseDocument }) {
  const t = useTranslations('HomeDocuments');

  return (
    <div
      className={`${POLE_CLASS[doc.pole]} relative mx-auto aspect-3/4 w-full max-w-60`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 translate-x-5 translate-y-3 rotate-[5deg] rounded-card bg-on-night/8 transition-transform duration-500 group-hover:translate-x-7 group-hover:rotate-[8deg]" />
      <div className="absolute inset-0 translate-x-2.5 translate-y-1.5 rotate-[2.5deg] rounded-card bg-on-night/16 transition-transform duration-500 group-hover:translate-x-3.5 group-hover:rotate-[4deg]" />
      <div className="relative flex h-full flex-col rounded-card bg-paper p-5 text-sand shadow-[0_24px_48px_-16px_rgba(0,0,0,0.55)] transition-transform duration-500 group-hover:-translate-y-1.5 group-hover:-rotate-1">
        <div className="pattern-swatch h-14 rounded-control border border-border-subtle" />
        <span className="mt-5 font-mono text-[9px] uppercase tracking-[0.16em] text-pole">
          {t(`categories.${doc.category}`)}
        </span>
        <p className="mt-2 line-clamp-5 font-heading text-[15px] font-bold leading-snug">
          {doc.title}
        </p>
        <div className="mt-auto flex items-end justify-between border-t border-border pt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
          <span>EWES · {doc.year}</span>
          <span className="rounded-[3px] bg-pole px-1.5 py-0.5 text-white">
            {doc.format}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Petite vignette de fichier (liste). */
export function FileBadge({ doc }: { doc: ShowcaseDocument }) {
  return (
    <span
      className={`${POLE_CLASS[doc.pole]} relative flex h-14 w-11 flex-none flex-col justify-end overflow-hidden rounded-md border border-border bg-surface-elevated pb-1.5 text-center font-mono text-[9px] font-bold tracking-[0.08em] text-pole transition-colors group-hover:border-pole`}
      aria-hidden="true"
    >
      <span className="pattern-swatch absolute inset-x-0 top-0 h-5 border-b border-border-subtle" />
      <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-bl-[3px] bg-white shadow-[-1px_1px_0_var(--color-border)]" />
      {doc.format}
    </span>
  );
}

/**
 * Vitrine des documents téléchargeables (Accueil) : un document à la une et
 * une sélection filtrable par type. Les visiteurs ne voient que ce qu'ils
 * peuvent télécharger — rien n'évoque l'espace documentaire réservé.
 */
export function DocumentsShowcase({
  documents,
}: {
  documents: ShowcaseDocument[];
}) {
  const t = useTranslations('HomeDocuments');
  const [category, setCategory] = useState<DocumentCategory | 'all'>('all');

  const categories = useMemo(() => {
    const counts = new Map<DocumentCategory, number>();
    for (const doc of documents) {
      counts.set(doc.category, (counts.get(doc.category) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [documents]);

  const filtered =
    category === 'all'
      ? documents
      : documents.filter((doc) => doc.category === category);
  const [featured, ...others] = filtered;

  if (!featured) {
    return (
      <p className="max-w-md text-sm leading-7 text-sand/72">{t('empty')}</p>
    );
  }

  const meta = (doc: ShowcaseDocument) =>
    [doc.year, t('pages', { count: doc.pages }), doc.size].join(' · ');

  const chip = (active: boolean) =>
    `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] transition-colors ${
      active
        ? 'border-sand bg-sand text-surface-elevated'
        : 'border-border text-sand/72 hover:border-sand/40 hover:text-sand'
    }`;

  return (
    <div>
      <div
        className="mb-8 flex flex-wrap gap-2"
        role="group"
        aria-label={t('filterLabel')}
        data-reveal
      >
        <button
          type="button"
          className={chip(category === 'all')}
          aria-pressed={category === 'all'}
          onClick={() => setCategory('all')}
        >
          {t('categories.all')}
          <span className="font-mono text-[10px] opacity-60">
            {documents.length}
          </span>
        </button>
        {categories.map(([key, count]) => (
          <button
            key={key}
            type="button"
            className={chip(category === key)}
            aria-pressed={category === key}
            onClick={() => setCategory(key)}
          >
            {t(`categories.${key}`)}
            <span className="font-mono text-[10px] opacity-60">{count}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        {/* Document à la une */}
        <article
          className="tone-night group relative isolate grid gap-10 overflow-hidden rounded-sheet bg-night p-7 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-center sm:p-10"
          data-reveal
        >
          <div
            className="pointer-events-none absolute -left-24 -top-24 -z-10 h-80 w-80 rounded-full bg-malachite/25 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-32 right-0 -z-10 h-72 w-72 rounded-full bg-primary/30 blur-3xl"
            aria-hidden="true"
          />

          <DocumentCover doc={featured} />

          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-on-night/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-malachite-bright">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-malachite-bright" />
              {t('featured')}
            </span>
            <h3 className="mt-5 font-heading text-2xl font-bold leading-tight text-on-night sm:text-[28px]">
              {featured.title}
            </h3>
            <p className="mt-4 text-sm leading-7">{featured.excerpt}</p>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-on-night-muted/80">
              {t(`categories.${featured.category}`)} · {meta(featured)}
            </p>
            <DocumentLink
              doc={featured}
              label={`${t('download')} — ${featured.title}`}
              className="primary-button on-night mt-8"
            >
              <ArrowDownToLine size={15} />
              {t('download')}
              <span className="font-mono text-[10px] opacity-60">
                {featured.format}
              </span>
            </DocumentLink>
          </div>
        </article>

        {/* Sélection */}
        <ul className="flex flex-col gap-3" data-reveal>
          {others.slice(0, LIST_SIZE).map((doc) => (
            <li key={doc.id} className="register-row">
              <DocumentLink
                doc={doc}
                label={`${t('download')} — ${doc.title}`}
                className="group flex items-center gap-4 rounded-card border border-border-subtle bg-surface-elevated p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:bg-white hover:shadow-[0_18px_40px_-24px_rgba(21,52,66,0.45)] sm:gap-5 sm:p-5"
              >
                <FileBadge doc={doc} />
                <span className="min-w-0 flex-1">
                  <span
                    className={`${POLE_CLASS[doc.pole]} font-mono text-[10px] uppercase tracking-[0.14em] text-pole`}
                  >
                    {t(`categories.${doc.category}`)}
                  </span>
                  <span className="mt-1 block text-[15px] font-semibold leading-snug text-sand">
                    {doc.title}
                  </span>
                  <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                    {meta(doc)}
                  </span>
                </span>
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-border text-sand transition-colors group-hover:border-sand group-hover:bg-sand group-hover:text-surface-elevated">
                  <ArrowDownToLine size={16} />
                </span>
              </DocumentLink>
            </li>
          ))}

          <li className="mt-auto pt-3">
            <Link
              href="/documents"
              className="group flex items-center justify-between rounded-card border border-dashed border-sand/25 px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-sand transition-colors hover:border-sand hover:bg-paper"
            >
              {t('viewAll')}
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
