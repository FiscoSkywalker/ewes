'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDownToLine, ArrowRight, Search, X } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import {
  DocumentCover,
  DocumentLink,
  FileBadge,
  POLE_CLASS,
  type DocumentCategory,
  type DocumentPole,
  type ShowcaseDocument,
} from './documents-showcase';

const POLES: DocumentPole[] = ['env', 'eau', 'ing'];

/** Recherche insensible à la casse et aux accents. */
function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Bibliothèque de la page Documents : dernière publication à la une, puis
 * l'ensemble des documents téléchargeables, avec recherche et filtres par
 * type et par pôle. Les documents viennent pour l'instant des messages
 * (`HomeDocuments.items`) et viendront ensuite de l'API.
 */
export function DocumentsLibrary({
  documents,
}: {
  documents: ShowcaseDocument[];
}) {
  const t = useTranslations('DocumentsPage');
  const tDoc = useTranslations('HomeDocuments');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<DocumentCategory | 'all'>('all');
  const [pole, setPole] = useState<DocumentPole | 'all'>('all');

  const sorted = useMemo(
    () => [...documents].sort((a, b) => b.year.localeCompare(a.year)),
    [documents],
  );
  const latest = sorted[0];

  const categories = useMemo(() => {
    const counts = new Map<DocumentCategory, number>();
    for (const doc of documents) {
      counts.set(doc.category, (counts.get(doc.category) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [documents]);

  const needle = normalize(query.trim());
  const filtered = sorted.filter(
    (doc) =>
      (category === 'all' || doc.category === category) &&
      (pole === 'all' || doc.pole === pole) &&
      (!needle || normalize(`${doc.title} ${doc.excerpt}`).includes(needle)),
  );
  const hasFilters = needle !== '' || category !== 'all' || pole !== 'all';

  const reset = () => {
    setQuery('');
    setCategory('all');
    setPole('all');
  };

  const meta = (doc: ShowcaseDocument) =>
    [tDoc('pages', { count: doc.pages }), doc.size].join(' · ');

  const chip = (active: boolean) =>
    `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] transition-colors ${
      active
        ? 'border-sand bg-sand text-surface-elevated'
        : 'border-border text-sand/72 hover:border-sand/40 hover:text-sand'
    }`;

  if (!latest) {
    return (
      <p className="max-w-md text-sm leading-7 text-sand/72">
        {tDoc('empty')}
      </p>
    );
  }

  return (
    <div>
      {/* Dernière publication */}
      <article
        className="tone-night group relative isolate grid gap-10 overflow-hidden rounded-sheet bg-night p-7 sm:p-10 md:grid-cols-[minmax(0,240px)_1fr] md:items-center lg:gap-16 lg:p-14"
        data-reveal
      >
        <div
          className="pointer-events-none absolute -left-24 -top-24 -z-10 h-96 w-96 rounded-full bg-malachite/25 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 right-10 -z-10 h-96 w-96 rounded-full bg-primary/30 blur-3xl"
          aria-hidden="true"
        />

        <DocumentCover doc={latest} />

        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-on-night/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-malachite-bright">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-malachite-bright" />
            {t('latest')}
          </span>
          <h2 className="mt-5 font-heading text-3xl font-bold leading-tight text-on-night lg:text-4xl">
            {latest.title}
          </h2>
          <p className="mt-5 text-sm leading-7 sm:text-base">
            {latest.excerpt}
          </p>
          <dl className="mt-8 grid max-w-md grid-cols-3 gap-4 border-t border-on-night/12 pt-6">
            {[
              [t('meta.type'), tDoc(`categories.${latest.category}`)],
              [t('meta.year'), latest.year],
              [t('meta.file'), `${latest.format} · ${latest.size}`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-night-muted/70">
                  {label}
                </dt>
                <dd className="mt-1.5 text-sm font-semibold text-on-night">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <DocumentLink
            doc={latest}
            label={`${tDoc('download')} — ${latest.title}`}
            className="primary-button on-night mt-8"
          >
            <ArrowDownToLine size={15} />
            {tDoc('download')}
          </DocumentLink>
        </div>
      </article>

      {/* Outils de recherche */}
      <div className="mt-20 flex flex-col gap-5" data-reveal>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">{t('searchLabel')}</span>
            <Search
              size={16}
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchPlaceholder')}
              className="h-13 w-full rounded-full border border-border bg-surface-elevated pl-12 pr-5 text-sm text-sand outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-white"
            />
          </label>

          <div
            className="flex flex-wrap gap-1 rounded-full border border-border bg-surface-elevated p-1"
            role="group"
            aria-label={t('poleFilterLabel')}
          >
            {(['all', ...POLES] as const).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={pole === key}
                onClick={() => setPole(key)}
                className={`${key === 'all' ? '' : POLE_CLASS[key]} inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] transition-colors ${
                  pole === key
                    ? 'bg-sand text-surface-elevated'
                    : 'text-sand/72 hover:text-sand'
                }`}
              >
                {key !== 'all' && (
                  <span
                    className="h-2 w-2 rounded-full bg-pole"
                    aria-hidden="true"
                  />
                )}
                {t(`poles.${key}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={tDoc('filterLabel')}
          >
            <button
              type="button"
              className={chip(category === 'all')}
              aria-pressed={category === 'all'}
              onClick={() => setCategory('all')}
            >
              {tDoc('categories.all')}
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
                {tDoc(`categories.${key}`)}
                <span className="font-mono text-[10px] opacity-60">
                  {count}
                </span>
              </button>
            ))}
          </div>

          <p
            className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted"
            aria-live="polite"
          >
            {t('results', { count: filtered.length })}
            {hasFilters && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 border-b border-sand/25 pb-0.5 text-sand transition-colors hover:border-sand"
              >
                <X size={12} /> {t('reset')}
              </button>
            )}
          </p>
        </div>
      </div>

      {/* Bibliothèque */}
      {filtered.length > 0 ? (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doc) => (
            <li key={doc.id} className="register-row">
              <DocumentLink
                doc={doc}
                label={`${tDoc('download')} — ${doc.title}`}
                className={`${POLE_CLASS[doc.pole]} group relative flex h-full flex-col overflow-hidden rounded-sheet border border-border-subtle bg-surface-elevated p-6 transition-all duration-300 hover:-translate-y-1 hover:border-border hover:bg-white hover:shadow-[0_24px_48px_-28px_rgba(21,52,66,0.5)] sm:p-7`}
              >
                <div className="flex items-start justify-between">
                  <FileBadge doc={doc} />
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                    {doc.year}
                  </span>
                </div>
                <span className="mt-7 font-mono text-[10px] uppercase tracking-[0.14em] text-pole">
                  {tDoc(`categories.${doc.category}`)} · {t(`poles.${doc.pole}`)}
                </span>
                <h3 className="mt-2 font-heading text-lg font-bold leading-snug text-sand">
                  {doc.title}
                </h3>
                <p className="mb-6 mt-3 line-clamp-3 text-sm leading-6 text-sand/72">
                  {doc.excerpt}
                </p>
                <div className="mt-auto flex items-center justify-between gap-4 border-t border-border-subtle pt-5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                    {doc.format} · {meta(doc)}
                  </span>
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-border text-sand transition-colors group-hover:border-pole group-hover:bg-pole group-hover:text-white">
                    <ArrowDownToLine size={16} />
                  </span>
                </div>
                <span
                  className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-pole transition-transform duration-500 group-hover:scale-x-100"
                  aria-hidden="true"
                />
              </DocumentLink>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 flex flex-col items-start gap-5 rounded-sheet border border-dashed border-sand/25 p-10">
          <Search size={20} className="text-muted" aria-hidden="true" />
          <p className="max-w-md text-sm leading-7 text-sand/72">
            {t('noResults')}
          </p>
          <button type="button" onClick={reset} className="primary-button">
            {t('reset')}
          </button>
        </div>
      )}

      {/* Demande de document */}
      <aside
        className="mt-20 flex flex-col gap-6 rounded-sheet bg-paper-muted p-8 sm:p-10 md:flex-row md:items-center md:justify-between"
        data-reveal
      >
        <div className="max-w-xl">
          <h2 className="font-heading text-2xl font-bold text-sand">
            {t('request.title')}
          </h2>
          <p className="mt-3 text-sm leading-7 text-sand/72">
            {t('request.text')}
          </p>
        </div>
        <Link href="/contact" className="primary-button w-fit flex-none">
          {t('request.cta')} <ArrowRight size={15} />
        </Link>
      </aside>
    </div>
  );
}
