'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Building2,
  FileSearch,
  FileText,
  FolderKanban,
  SearchX,
  ShieldCheck,
  Tags,
} from 'lucide-react';
import { backendJson, type Paginated } from '@/lib/api/backend';
import { plural } from '@/lib/admin/format';
import {
  DOCS_KEY,
  FILE_FAMILIES,
  type FileFamily,
  type LifecycleStatus,
  type PrivateDocument,
} from '@/lib/admin/private-docs';
import { PageHeader } from '../page-header';
import {
  Button,
  EmptyState,
  Pagination,
  SearchInput,
  SegmentedControl,
  Select,
  useDebouncedValue,
} from '../ui';
import { DocumentList } from './document-list';
import { useFolders } from './use-folders';

const PAGE_SIZE = 20;
const MIN_LENGTH = 2;

type StatusFilter = LifecycleStatus | 'ALL';

const TIPS = [
  { icon: FileText, label: 'Nom ou description', example: 'rapport annuel' },
  { icon: FolderKanban, label: 'Projet', example: 'Kamoa' },
  { icon: Tags, label: 'Catégorie', example: 'fiscal' },
  { icon: Building2, label: 'Département', example: 'ressources humaines' },
] as const;

/**
 * Recherche plein texte dans l'espace documentaire. Le serveur ne cherche que
 * dans le périmètre du compte (filtrage en base, blueprint/11 §4) : rien de ce
 * qui lui est fermé ne peut apparaître, même en devinant un nom. La requête
 * est portée par l'adresse (`?q=`) pour être partagée ou retrouvée.
 */
export function SearchScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const initial = useSearchParams().get('q') ?? '';
  const { index, folders } = useFolders();

  const [search, setSearch] = useState(initial);
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [type, setType] = useState<FileFamily | ''>('');
  const [category, setCategory] = useState('');
  const [year, setYear] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 350);
  const active = q.length >= MIN_LENGTH;

  // L'adresse suit la recherche (sans empiler une entrée d'historique par frappe).
  useEffect(() => {
    const target = q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname;
    if (`${pathname}${window.location.search}` !== target) {
      router.replace(target, { scroll: false });
    }
  }, [q, pathname, router]);

  const categories = [
    ...new Set(folders.map((folder) => folder.category)),
  ].sort((a, b) => a.localeCompare(b, 'fr'));
  const years = [
    ...new Set(folders.flatMap((folder) => (folder.year ? [folder.year] : []))),
  ].sort((a, b) => b - a);

  const results = useQuery({
    queryKey: [DOCS_KEY, 'search', q, status, type, category, year, page],
    queryFn: () => {
      const params = new URLSearchParams({
        q,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (status !== 'ALL') params.set('status', status);
      if (type) params.set('type', type);
      if (category) params.set('category', category);
      if (year) params.set('year', year);
      return backendJson<Paginated<PrivateDocument>>(
        `documents-prives/search?${params}`,
      );
    },
    enabled: active,
    placeholderData: keepPreviousData,
  });

  const total = results.data?.meta.total ?? 0;
  const filtered =
    status !== 'ALL' || type !== '' || category !== '' || year !== '';
  const resetFilters = () => {
    setStatus('ALL');
    setType('');
    setCategory('');
    setYear('');
    setPage(1);
  };
  const change =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
    };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Espace documentaire"
        title="Recherche"
        description="Retrouvez un document par son nom, sa description, ou le classement de son dossier."
      />

      <div className="space-y-3">
        <SearchInput
          label="Rechercher dans l’espace documentaire"
          placeholder="Nom, projet, catégorie, département…"
          value={search}
          onValueChange={change(setSearch)}
          autoFocus
          enterKeyHint="search"
          className="[&_input]:h-12 [&_input]:rounded-xl [&_input]:text-[15px] sm:max-w-2xl"
        />

        {active && (
          <div className="flex flex-wrap items-center gap-2.5">
            <SegmentedControl<StatusFilter>
              label="Filtrer par état"
              value={status}
              onChange={change(setStatus)}
              options={[
                { value: 'ALL', label: 'Tous' },
                { value: 'ACTIVE', label: 'Actifs' },
                { value: 'ARCHIVED', label: 'Archivés' },
              ]}
              className="w-full sm:w-auto [&>button]:flex-1 [&>button]:justify-center"
            />
            <Select
              aria-label="Filtrer par type de fichier"
              value={type}
              onChange={(event) =>
                change(setType)(event.target.value as FileFamily | '')
              }
              className="min-w-0 flex-1 sm:w-40 sm:flex-none"
            >
              <option value="">Tous les types</option>
              {FILE_FAMILIES.map((family) => (
                <option key={family.value} value={family.value}>
                  {family.label}
                </option>
              ))}
            </Select>
            {categories.length > 1 && (
              <Select
                aria-label="Filtrer par catégorie"
                value={category}
                onChange={(event) => change(setCategory)(event.target.value)}
                className="min-w-0 flex-1 sm:w-48 sm:flex-none"
              >
                <option value="">Toutes les catégories</option>
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            )}
            {years.length > 1 && (
              <Select
                aria-label="Filtrer par année"
                value={year}
                onChange={(event) => change(setYear)(event.target.value)}
                className="w-full sm:w-44"
              >
                <option value="">Toutes les années</option>
                {years.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            )}
            {filtered && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Effacer les filtres
              </Button>
            )}
          </div>
        )}
      </div>

      {!active ? (
        <div className="rounded-2xl border border-line bg-panel px-5 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-2xl">
            <span className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand">
              <FileSearch size={22} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-ink">
              {search.trim().length === 1
                ? 'Encore un caractère…'
                : 'Que cherchez-vous ?'}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Saisissez au moins deux caractères. La recherche porte sur :
            </p>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {TIPS.map((tip) => (
                <li
                  key={tip.label}
                  className="flex items-center gap-3 rounded-xl border border-line bg-sunken/60 px-3.5 py-3"
                >
                  <tip.icon
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-ink-subtle"
                  />
                  <span className="min-w-0 text-[13px] text-ink">
                    {tip.label}
                    <span className="block truncate text-xs text-ink-subtle">
                      ex. « {tip.example} »
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-ink-subtle">
              <ShieldCheck
                size={14}
                aria-hidden="true"
                className="mt-px shrink-0"
              />
              Seuls les documents auxquels vous avez accès apparaissent dans les
              résultats.
            </p>
          </div>
        </div>
      ) : (
        <section aria-label="Résultats" className="space-y-3">
          <p
            className="text-[13px] text-ink-muted"
            role="status"
            aria-live="polite"
          >
            {results.isLoading
              ? 'Recherche en cours…'
              : results.data
                ? total === 0
                  ? 'Aucun résultat'
                  : `${plural(total, 'résultat')} pour « ${q} »`
                : ''}
          </p>
          <DocumentList
            label={`Résultats pour ${q}`}
            documents={results.data?.data}
            index={index}
            isLoading={results.isLoading}
            error={results.error}
            onRetry={() => results.refetch()}
            showFolder
            showStatus
            highlight={q}
            empty={
              <EmptyState
                icon={SearchX}
                title={`Aucun document pour « ${q} »`}
                description={
                  filtered
                    ? 'Aucun document ne correspond avec ces filtres.'
                    : 'Vérifiez l’orthographe ou essayez un autre mot. La recherche ne porte que sur les documents auxquels vous avez accès.'
                }
                action={
                  filtered && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={resetFilters}
                    >
                      Effacer les filtres
                    </Button>
                  )
                }
              />
            }
          />
          {total > PAGE_SIZE && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
              itemLabel="résultats"
            />
          )}
        </section>
      )}
    </div>
  );
}
