'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  Archive,
  ArrowRight,
  Download,
  FolderSearch,
  Pencil,
  Plus,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import { ApiError, fieldErrors } from '@/lib/api/backend';
import { PageHeader } from '../page-header';
import {
  Badge,
  BilingualField,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  OfflineNotice,
  Pagination,
  SearchInput,
  SegmentedControl,
  Select,
  Skeleton,
  SkeletonText,
  StatusChip,
  Switch,
  Textarea,
  useConfirm,
  useDebouncedValue,
  useToast,
  type Column,
  type SortState,
} from '../ui';

/**
 * Catalogue vivant du kit (`components/admin/ui`) : chaque composant dans
 * ses états — défaut, focus (au clavier), désactivé, erreur, chargement —
 * avec des données fictives. Ne contacte jamais l'API.
 */

const SECTIONS = [
  ['boutons', 'Boutons'],
  ['champs', 'Champs'],
  ['bilingue', 'Champ bilingue'],
  ['statuts', 'Statuts'],
  ['tableau', 'Tableau de données'],
  ['etats', 'États'],
  ['fenetres', 'Fenêtres'],
  ['retours', 'Retours (toasts)'],
] as const;

export function ComponentCatalog() {
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Développement"
        title="Composants du portail"
        description="Catalogue vivant du kit partagé (components/admin/ui). Parcourez-le au clavier (Tab) pour voir les états de focus, et basculez le thème pour vérifier les deux apparences."
      />
      <nav aria-label="Sections du catalogue" className="flex flex-wrap gap-2">
        {SECTIONS.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            {label}
          </a>
        ))}
      </nav>
      <ButtonsSection />
      <FieldsSection />
      <BilingualSection />
      <StatusSection />
      <TableSection />
      <StatesSection />
      <DialogsSection />
      <ToastsSection />
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6">
      <h2
        id={`${id}-title`}
        className="text-lg font-semibold tracking-tight text-ink"
      >
        {title}
      </h2>
      <p className="mb-4 mt-1 max-w-3xl text-sm leading-relaxed text-ink-muted">
        {description}
      </p>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Demo({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel">
      <p className="border-b border-line px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
        {label}
      </p>
      <div className={className ?? 'flex flex-wrap items-center gap-3 p-5'}>
        {children}
      </div>
    </div>
  );
}

// --- Boutons ---

function ButtonsSection() {
  const [saving, setSaving] = useState(false);
  return (
    <Section
      id="boutons"
      title="Boutons"
      description="Une seule action principale (primary) par écran. Les actions destructives (danger) passent toujours par une confirmation. Pendant une requête, le bouton se verrouille et affiche un indicateur, sans changer de taille."
    >
      <Demo label="Variantes">
        <Button icon={Plus}>Nouvelle réalisation</Button>
        <Button variant="secondary" icon={Pencil}>
          Modifier
        </Button>
        <Button variant="ghost">Annuler</Button>
        <Button variant="danger" icon={Trash2}>
          Supprimer
        </Button>
      </Demo>
      <Demo label="Tailles, icônes, lien">
        <Button size="sm" variant="secondary" icon={Download}>
          Petit
        </Button>
        <Button>Moyen (défaut)</Button>
        <Button size="lg" iconRight={ArrowRight}>
          Grand
        </Button>
        <ButtonLink href="/admin" variant="secondary" iconRight={ArrowRight}>
          Lien bouton
        </ButtonLink>
        <IconButton icon={Pencil} label="Modifier" variant="secondary" />
        <IconButton icon={Archive} label="Archiver" />
        <IconButton
          icon={Trash2}
          label="Supprimer"
          variant="danger"
          size="sm"
        />
      </Demo>
      <Demo label="États">
        <Button
          icon={Save}
          loading={saving}
          onClick={() => {
            setSaving(true);
            window.setTimeout(() => setSaving(false), 1800);
          }}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer (cliquer)'}
        </Button>
        <Button loading>Chargement</Button>
        <Button disabled>Désactivé</Button>
        <Button variant="secondary" disabled>
          Désactivé
        </Button>
      </Demo>
    </Section>
  );
}

// --- Champs ---

const API_VALIDATION_ERROR = new ApiError(
  400,
  'BAD_REQUEST',
  'Validation échouée.',
  [
    { field: 'email', messages: ['email must be an email'] },
    { field: 'title', messages: ['Le titre est obligatoire.'] },
  ],
);

function FieldsSection() {
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 400);
  const errors = fieldErrors(API_VALIDATION_ERROR);
  return (
    <Section
      id="champs"
      title="Champs de formulaire"
      description={
        <>
          <code className="font-mono text-xs">Field</code> relie libellé, aide
          et erreur au contrôle (lecteurs d’écran compris). Les champs
          facultatifs sont signalés comme tels ; une erreur s’affiche avec une
          icône, jamais par la seule couleur. Les erreurs de l’API se récupèrent
          par champ avec{' '}
          <code className="font-mono text-xs">fieldErrors(erreur)</code>.
        </>
      }
    >
      <Demo label="États d’un champ" className="grid gap-5 p-5 md:grid-cols-2">
        <Field
          label="Titre"
          required
          hint="Visible sur le site public et dans les résultats de recherche."
        >
          <Input placeholder="Ex. Étude d’impact environnemental – Kolwezi" />
        </Field>
        <Field label="Client">
          <Input placeholder="Nom de l’organisation" />
        </Field>
        <Field label="Titre" required error={errors.title}>
          <Input defaultValue="" />
        </Field>
        <Field
          label="Identifiant interne"
          disabled
          hint="Attribué automatiquement."
        >
          <Input defaultValue="REA-2026-014" />
        </Field>
      </Demo>
      <Demo label="Autres contrôles" className="grid gap-5 p-5 md:grid-cols-2">
        <Field label="Pôle" required>
          <Select defaultValue="ENV">
            <option value="ENV">Environnement</option>
            <option value="EAU">Eau</option>
            <option value="ING">Travaux d’ingénierie</option>
          </Select>
        </Field>
        <Field label="Résumé" hint="Deux ou trois phrases.">
          <Textarea
            maxLength={280}
            showCount
            defaultValue="Évaluation des impacts d’un nouveau site d’exploitation minière."
          />
        </Field>
        <div className="flex flex-col gap-4">
          <Checkbox
            label="Mettre en avant sur l’accueil"
            description="Affichée dans les réalisations récentes."
            defaultChecked
          />
          <Checkbox label="Option indisponible" disabled />
        </div>
        <div className="flex flex-col gap-4">
          <Switch
            label="Envoyer un accusé de réception"
            description="Un e-mail est adressé à l’expéditeur."
            defaultChecked
          />
          <Switch label="Réglage verrouillé" disabled />
        </div>
      </Demo>
      <Demo
        label="Recherche (avec temporisation)"
        className="flex flex-col gap-2 p-5"
      >
        <SearchInput
          label="Rechercher une réalisation"
          placeholder="Rechercher une réalisation…"
          value={search}
          onValueChange={setSearch}
          className="max-w-sm"
        />
        <p className="text-xs text-ink-subtle">
          Valeur envoyée à l’API (après 400 ms sans frappe) : « {debounced} »
        </p>
      </Demo>
    </Section>
  );
}

// --- Bilingue ---

function BilingualSection() {
  const [title, setTitle] = useState({
    fr: 'Étude d’impact – Kolwezi',
    en: '',
  });
  const [errors, setErrors] = useState<{ fr?: string; en?: string }>({});
  return (
    <Section
      id="bilingue"
      title="Champ bilingue FR / EN"
      description="Tout contenu publié existe en français et, si possible, en anglais. Les deux versions restent saisies même quand l’onglet est masqué ; un point orange signale une traduction manquante, une icône une erreur. Après un envoi refusé, l’onglet en erreur s’ouvre de lui-même."
    >
      <Demo
        label="Titre d’une réalisation"
        className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-start"
      >
        <BilingualField
          label="Titre"
          hint="Le titre français est obligatoire ; l’anglais est recommandé."
          filled={{
            fr: Boolean(title.fr.trim()),
            en: Boolean(title.en.trim()),
          }}
          errors={errors}
        >
          {(locale) => (
            <Input
              value={title[locale]}
              onChange={(event) =>
                setTitle({ ...title, [locale]: event.target.value })
              }
              lang={locale}
            />
          )}
        </BilingualField>
        <div className="flex flex-wrap gap-2 md:mt-6">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setErrors({ en: 'Le titre anglais dépasse 120 caractères.' })
            }
          >
            Simuler une erreur EN
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setErrors({})}>
            Effacer
          </Button>
        </div>
      </Demo>
    </Section>
  );
}

// --- Statuts ---

function StatusSection() {
  return (
    <Section
      id="statuts"
      title="Statuts et étiquettes"
      description="Chaque valeur de l’API a un libellé et une couleur uniques dans tout le portail (StatusChip). Le libellé s’accorde au féminin si besoin : « Publiée » pour une réalisation."
    >
      <Demo label="Contenus (ContentStatus)">
        <StatusChip kind="content" value="DRAFT" />
        <StatusChip kind="content" value="PUBLISHED" />
        <StatusChip kind="content" value="PUBLISHED" feminine />
        <StatusChip kind="content" value="ARCHIVED" feminine />
      </Demo>
      <Demo label="Messages, e-mails, documents privés, rôles">
        <StatusChip kind="contact" value="NOUVEAU" />
        <StatusChip kind="contact" value="TRAITE" />
        <StatusChip kind="email" value="sent" />
        <StatusChip kind="email" value="pending" />
        <StatusChip kind="email" value="failed" />
        <StatusChip kind="confidentiality" value="PUBLIC_INTERNE" />
        <StatusChip kind="confidentiality" value="RESTREINT" />
        <StatusChip kind="confidentiality" value="CONFIDENTIEL" />
        <StatusChip kind="lifecycle" value="ACTIVE" />
        <StatusChip kind="role" value="ADMINISTRATEUR" />
        <StatusChip kind="role" value="GESTIONNAIRE" />
        <StatusChip kind="role" value="UTILISATEUR" />
      </Demo>
      <Demo label="Badges libres (tons)">
        <Badge>Neutre</Badge>
        <Badge tone="brand">Eau</Badge>
        <Badge tone="env">Environnement</Badge>
        <Badge tone="ing">Ingénierie</Badge>
        <Badge tone="ok">Valide</Badge>
        <Badge tone="warn">À vérifier</Badge>
        <Badge tone="bad" dot>
          Bloquant
        </Badge>
      </Demo>
    </Section>
  );
}

// --- Tableau ---

type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

interface SampleRealisation {
  id: string;
  title: string;
  client: string;
  pole: 'env' | 'eau' | 'ing';
  year: number;
  status: ContentStatus;
}

const POLES = {
  env: { label: 'Environnement', tone: 'env' },
  eau: { label: 'Eau', tone: 'brand' },
  ing: { label: 'Ingénierie', tone: 'ing' },
} as const;

const SAMPLE: SampleRealisation[] = [
  [
    'Étude d’impact environnemental et social – site de Kolwezi',
    'Gécamines',
    'env',
    2025,
    'PUBLISHED',
  ],
  [
    'Adduction d’eau potable – quartiers périphériques de Lubumbashi',
    'Banque mondiale',
    'eau',
    2024,
    'PUBLISHED',
  ],
  [
    'Audit environnemental d’une usine hydrométallurgique',
    'Metalkol',
    'env',
    2024,
    'DRAFT',
  ],
  [
    'Forages et réseau de distribution – Likasi',
    'REGIDESO',
    'eau',
    2023,
    'PUBLISHED',
  ],
  [
    'Réhabilitation d’un ouvrage de franchissement',
    'Province du Haut-Katanga',
    'ing',
    2023,
    'ARCHIVED',
  ],
  [
    'Plan de gestion des déchets miniers',
    'Kamoto Copper Company',
    'env',
    2022,
    'PUBLISHED',
  ],
  ['Bilan carbone d’un site d’exploitation', 'Metalkol', 'env', 2024, 'DRAFT'],
  [
    'Étude hydrogéologique – bassin de la Lufira',
    'Coopération belge',
    'eau',
    2021,
    'PUBLISHED',
  ],
  [
    'Supervision de travaux de voirie',
    'Ville de Lubumbashi',
    'ing',
    2022,
    'PUBLISHED',
  ],
  [
    'Formation des inspecteurs environnementaux',
    'Ministère de l’Environnement',
    'env',
    2023,
    'ARCHIVED',
  ],
  [
    'Analyse de la qualité des eaux de surface',
    'Université de Lubumbashi',
    'eau',
    2025,
    'DRAFT',
  ],
  ['Conception d’une station de traitement', 'AFD', 'ing', 2025, 'PUBLISHED'],
].map(([title, client, pole, year, status], i) => ({
  id: `rea-${i + 1}`,
  title,
  client,
  pole,
  year,
  status,
})) as SampleRealisation[];

const PAGE_SIZE = 5;

function TableSection() {
  const [status, setStatus] = useState<'ALL' | ContentStatus>('ALL');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState>({
    id: 'year',
    direction: 'desc',
  });
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<'data' | 'loading' | 'error' | 'empty'>(
    'data',
  );

  const counts = useMemo(() => {
    const result = { ALL: SAMPLE.length, DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0 };
    for (const row of SAMPLE) result[row.status] += 1;
    return result;
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = SAMPLE.filter(
      (row) =>
        (status === 'ALL' || row.status === status) &&
        (!term || `${row.title} ${row.client}`.toLowerCase().includes(term)),
    );
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const key = sort.id as keyof SampleRealisation;
      return (
        String(a[key]).localeCompare(String(b[key]), 'fr', { numeric: true }) *
        factor
      );
    });
  }, [status, query, sort]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<SampleRealisation>[] = [
    {
      id: 'title',
      header: 'Réalisation',
      sortable: true,
      cell: (row) => (
        <span className="block min-w-56">
          <span className="block font-medium text-ink">{row.title}</span>
          <span className="block text-xs text-ink-subtle md:hidden">
            {row.client}
          </span>
        </span>
      ),
    },
    {
      id: 'client',
      header: 'Client',
      sortable: true,
      hideBelow: 'md',
      cell: (row) => row.client,
    },
    {
      id: 'pole',
      header: 'Pôle',
      hideBelow: 'lg',
      cell: (row) => (
        <Badge tone={POLES[row.pole].tone}>{POLES[row.pole].label}</Badge>
      ),
    },
    {
      id: 'year',
      header: 'Année',
      sortable: true,
      firstDirection: 'desc',
      hideBelow: 'sm',
      className: 'tabular-nums',
      cell: (row) => row.year,
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (row) => <StatusChip kind="content" value={row.status} feminine />,
    },
  ];

  const filtersActive = status !== 'ALL' || query !== '';

  return (
    <Section
      id="tableau"
      title="Tableau de données"
      description="Liste type d’un module : filtre par statut avec effectifs, recherche, tri par en-tête (le plus récent d’abord pour les dates), pagination, et états chargement / erreur / vide intégrés. La ligne entière ouvre la fiche (lien étiré sur la première colonne)."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Filtrer par statut"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[
            { value: 'ALL', label: 'Toutes', count: counts.ALL },
            { value: 'DRAFT', label: 'Brouillons', count: counts.DRAFT },
            { value: 'PUBLISHED', label: 'Publiées', count: counts.PUBLISHED },
            { value: 'ARCHIVED', label: 'Archivées', count: counts.ARCHIVED },
          ]}
        />
        <SearchInput
          label="Rechercher une réalisation"
          value={query}
          onValueChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          className="w-full sm:w-72"
        />
      </div>

      <DataTable
        caption="Réalisations (exemple)"
        columns={columns}
        rows={mode === 'data' ? pageRows : mode === 'empty' ? [] : undefined}
        getRowId={(row) => row.id}
        isLoading={mode === 'loading'}
        error={
          mode === 'error'
            ? new ApiError(503, 'UPSTREAM_UNAVAILABLE', '', [], 'demo-4f2a9c')
            : undefined
        }
        onRetry={() => setMode('data')}
        sort={sort}
        onSortChange={setSort}
        rowHref={() => '/admin/composants#tableau'}
        empty={
          mode === 'data' && filtersActive ? (
            <EmptyState
              icon={FolderSearch}
              title="Aucun résultat"
              description="Aucune réalisation ne correspond à ces filtres."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setStatus('ALL');
                    setQuery('');
                  }}
                >
                  Effacer les filtres
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="Aucune réalisation"
              description="Créez la première fiche ; elle restera en brouillon jusqu’à sa publication."
              action={
                <Button size="sm" icon={Plus}>
                  Nouvelle réalisation
                </Button>
              }
            />
          )
        }
      />
      {mode === 'data' && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
          itemLabel="réalisations"
        />
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-3">
        <span className="text-xs text-ink-subtle">Simuler l’état :</span>
        <SegmentedControl
          label="État simulé du tableau"
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'data', label: 'Données' },
            { value: 'loading', label: 'Chargement' },
            { value: 'error', label: 'Erreur' },
            { value: 'empty', label: 'Vide' },
          ]}
        />
      </div>
    </Section>
  );
}

// --- États ---

function StatesSection() {
  return (
    <Section
      id="etats"
      title="États"
      description="Chaque écran à données définit ses états (blueprint 05 §5). Les messages d’erreur sont choisis d’après le statut de l’API, jamais d’après son texte, et donnent la référence de la requête à communiquer au support."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card padding="none" title="Vide">
          <EmptyState
            title="Aucun document"
            description="Les documents téléversés dans ce dossier apparaîtront ici."
            action={
              <Button size="sm" variant="secondary" icon={Plus}>
                Téléverser
              </Button>
            }
          />
        </Card>
        <Card padding="none" title="Erreur réseau">
          <ErrorState
            error={new ApiError(0, 'NETWORK_ERROR', '')}
            onRetry={() => undefined}
          />
        </Card>
        <Card padding="none" title="Erreur serveur">
          <ErrorState
            error={new ApiError(500, 'INTERNAL_ERROR', '', [], '9c1e4b7a-2f3d')}
            onRetry={() => undefined}
          />
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Chargement">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1">
              <SkeletonText lines={2} />
            </div>
          </div>
          <SkeletonText lines={4} className="mt-5" />
        </Card>
        <Card
          padding="none"
          title="Hors connexion"
          description="Bannière affichée sous la barre supérieure (coupez le réseau pour la voir en situation)."
        >
          <OfflineNotice />
          <p className="px-5 py-4 text-xs text-ink-subtle">
            Au retour du réseau, un message « Connexion rétablie » s’affiche et
            les données se rechargent.
          </p>
        </Card>
      </div>
    </Section>
  );
}

// --- Fenêtres ---

function DialogsSection() {
  const confirm = useConfirm();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [sending, setSending] = useState(false);

  return (
    <Section
      id="fenetres"
      title="Fenêtres et confirmations"
      description="Toute action critique (suppression, révocation d’un droit, changement de rôle) exige une confirmation explicite (blueprint 14 §4). La fenêtre reste ouverte, bouton verrouillé, jusqu’à la réponse du serveur ; un échec s’y affiche, sans jamais présumer le succès."
    >
      <Demo label="Exemples">
        <Button
          variant="secondary"
          icon={Send}
          onClick={async () => {
            const ok = await confirm({
              title: 'Publier cette réalisation ?',
              description:
                'Elle sera visible immédiatement sur le site public, en français et en anglais.',
              confirmLabel: 'Publier',
              onConfirm: () =>
                new Promise((resolve) => window.setTimeout(resolve, 1200)),
            });
            if (ok)
              toast.success('Réalisation publiée', {
                description: 'Le site public est à jour.',
              });
          }}
        >
          Confirmation simple
        </Button>
        <Button
          variant="danger"
          icon={Trash2}
          onClick={async () => {
            const ok = await confirm({
              title: 'Supprimer définitivement ce dossier ?',
              description:
                'Le dossier « Contrats 2023 » et ses droits d’accès seront supprimés. Cette action est tracée et ne peut pas être annulée.',
              tone: 'danger',
              confirmLabel: 'Supprimer le dossier',
              confirmationText: 'Contrats 2023',
              onConfirm: () =>
                new Promise((resolve) => window.setTimeout(resolve, 1200)),
            });
            if (ok) toast.success('Dossier supprimé');
          }}
        >
          Suppression (saisie exigée)
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            confirm({
              title: 'Révoquer l’accès de Grace Kabila ?',
              description:
                'L’accès au dossier « Projets Kolwezi » cesse immédiatement.',
              tone: 'danger',
              confirmLabel: 'Révoquer',
              onConfirm: () =>
                new Promise((_, reject) =>
                  window.setTimeout(
                    () =>
                      reject(
                        new ApiError(
                          503,
                          'UPSTREAM_UNAVAILABLE',
                          '',
                          [],
                          'demo-7b31e0',
                        ),
                      ),
                    900,
                  ),
                ),
            })
          }
        >
          Échec côté serveur
        </Button>
        <Button
          variant="secondary"
          icon={Pencil}
          onClick={() => setFormOpen(true)}
        >
          Fenêtre de formulaire
        </Button>
      </Demo>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        dismissible={!sending}
        title="Renommer le dossier"
        description="Le nouveau nom est visible de toutes les personnes qui ont accès au dossier."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setFormOpen(false)}
              disabled={sending}
            >
              Annuler
            </Button>
            <Button type="submit" form="rename-folder" loading={sending}>
              Enregistrer
            </Button>
          </>
        }
      >
        <form
          id="rename-folder"
          onSubmit={(event) => {
            event.preventDefault();
            setSending(true);
            window.setTimeout(() => {
              setSending(false);
              setFormOpen(false);
              toast.success('Dossier renommé');
            }, 1000);
          }}
        >
          <Field label="Nom du dossier" required>
            <Input
              defaultValue="Contrats 2023"
              data-autofocus
              disabled={sending}
            />
          </Field>
        </form>
      </Dialog>
    </Section>
  );
}

// --- Toasts ---

function ToastsSection() {
  const toast = useToast();
  return (
    <Section
      id="retours"
      title="Retours (toasts)"
      description="Confirmation brève de ce que le serveur a validé. Disparaît d’elle-même (pause au survol ou au focus) ; les erreurs restent plus longtemps et sont annoncées aux lecteurs d’écran. toast.error(erreur) déduit le message de l’erreur de l’API."
    >
      <Demo label="Tons">
        <Button
          variant="secondary"
          onClick={() =>
            toast.success('Article publié', {
              description: 'Visible sur le site en FR et EN.',
            })
          }
        >
          Succès
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast.info('Brouillon enregistré automatiquement')}
        >
          Information
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast.warning('Version anglaise manquante', {
              description: 'Le site anglais affichera le texte français.',
            })
          }
        >
          Avertissement
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast.error(new ApiError(403, 'FORBIDDEN', ''))}
        >
          Erreur (depuis l’API)
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast.success('Message marqué comme traité', {
              action: {
                label: 'Annuler',
                onClick: () => toast.info('Message rouvert'),
              },
            })
          }
        >
          Avec action
        </Button>
      </Demo>
    </Section>
  );
}
