import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, ChevronRight, Download, FileText } from 'lucide-react';
import {
  PROJECT_CATEGORY_TONE,
  type ProjectCategory,
  type ProjectCategoryOption,
} from '@/data/projects';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import {
  getRealisation,
  getRealisationSlugs,
  getRelatedProjects,
} from '@/lib/api/public-realisations';
import { GalleryLightbox } from '@/components/public/gallery-lightbox';
import { ProjectCard } from '@/components/public/project-card';
import { ProjectCover } from '@/components/public/project-cover';
import { ShareLinks } from '@/components/public/share-links';
import { TextLink } from '@/components/public/ui';
import { pageAlternates, pageOpenGraph } from '@/lib/seo';

/**
 * Fiche d'une réalisation (`/realisations/{slug}`) — Server Component, SSG
 * avec régénération à la demande : une URL stable par mission, invalidée à la
 * publication, à la modification ou à la dépublication de cette fiche
 * (blueprint/16 §2). Brouillon, archivée ou supprimée : 404. Seul le partage
 * est un îlot client. Aucun texte n'est inventé : une rubrique sans contenu
 * n'est pas affichée.
 */
export async function generateStaticParams() {
  const slugs = await getRealisationSlugs();
  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/realisations/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const detail = await getRealisation(slug, locale);
  if (!detail) return {};
  const { project } = detail;
  const description =
    project.summary ??
    [project.client, project.location].filter(Boolean).join(' · ');
  return {
    title: project.mission,
    description: description || undefined,
    alternates: pageAlternates(locale, `/realisations/${slug}`),
    openGraph: pageOpenGraph(locale, `/realisations/${slug}`, {
      type: 'article',
      title: project.mission,
      description: description || undefined,
      images: project.image
        ? [{ url: project.image, alt: project.imageAlt }]
        : [],
    }),
  };
}

export default async function RealisationPage({
  params,
}: PageProps<'/[locale]/realisations/[slug]'>) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const detail = await getRealisation(slug, locale);
  if (!detail) notFound();

  const { project } = detail;
  const t = await getTranslations('RealisationsPage');
  const tDetail = await getTranslations('RealisationsPage.detail');
  const tSheet = await getTranslations('RealisationsPage.sheet');
  const tCategory = await getTranslations('RealisationsPage.categoryDetails');
  const tProjects = await getTranslations('Projects');
  const categories = tProjects.raw('categories') as ProjectCategoryOption[];
  const category = categories.find((c) => c.key === project.category);
  const related = await getRelatedProjects(slug, project.category, locale);

  const period = project.yearEnd
    ? `${project.year}–${project.yearEnd}`
    : `${project.year}`;
  const duration = project.yearEnd ? project.yearEnd - project.year + 1 : null;
  const hasDetail =
    detail.description.length +
      detail.objectives.length +
      detail.results.length >
    0;
  // La première image sert de couverture ; les suivantes forment la galerie.
  const extraImages = detail.gallery.slice(1);

  const facts = [
    [tSheet('period'), period],
    ...(duration
      ? [[tSheet('duration'), tSheet('years', { count: duration })]]
      : []),
    ...(project.client ? [[tSheet('client'), project.client]] : []),
    [tSheet('type'), category?.label ?? project.category],
    ...(project.location ? [[tSheet('location'), project.location]] : []),
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.mission,
    description: project.summary,
    inLanguage: locale,
    dateCreated: String(project.yearEnd ?? project.year),
    locationCreated: project.location
      ? { '@type': 'Place', name: project.location }
      : undefined,
    image: project.image ? [project.image] : undefined,
    creator: { '@type': 'Organization', name: 'EWES S.A.R.L.' },
  };

  const sections = [
    {
      id: 'description',
      title: tDetail('sections.description'),
      paragraphs: detail.description,
    },
    {
      id: 'objectives',
      title: tDetail('sections.objectives'),
      paragraphs: detail.objectives,
    },
    {
      id: 'results',
      title: tDetail('sections.results'),
      paragraphs: detail.results,
    },
  ].filter((section) => section.paragraphs.length > 0);

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
        <nav aria-label={tDetail('breadcrumb')} className="mb-10">
          <ol className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            <li>
              <Link href="/" className="hover:text-sand">
                {tDetail('home')}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight size={12} />
            </li>
            <li>
              <Link href="/realisations" className="hover:text-sand">
                {t('eyebrow')}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight size={12} />
            </li>
            <li
              aria-current="page"
              className="line-clamp-1 max-w-[40ch] text-sand"
            >
              {project.mission}
            </li>
          </ol>
        </nav>

        <header className="max-w-4xl" data-reveal>
          <p
            className={`font-mono text-[11px] font-bold uppercase tracking-[0.18em] ${PROJECT_CATEGORY_TONE[project.category as ProjectCategory]}`}
          >
            {category?.label ?? project.category}
          </p>
          <h1 className="section-title mt-5 text-4xl text-sand sm:text-5xl lg:text-6xl">
            {project.mission}
          </h1>
          <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-sand/75">
            {project.client && <span>{project.client}</span>}
            {project.client && <span aria-hidden="true">·</span>}
            <span>{period}</span>
            {project.location && (
              <>
                <span aria-hidden="true">·</span>
                <span>{project.location}</span>
              </>
            )}
          </p>
        </header>

        <ProjectCover
          project={project}
          tag={category?.tag}
          priority
          sizes="(min-width: 1200px) 1200px, 100vw"
          className="mt-12 aspect-[16/9] rounded-sheet md:aspect-[21/9]"
        />

        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-20">
          <div className="min-w-0 space-y-14">
            {sections.map((section) => (
              <section key={section.id} aria-labelledby={`${section.id}-title`}>
                <h2
                  id={`${section.id}-title`}
                  className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted"
                >
                  {section.title}
                </h2>
                <div className="mt-5 max-w-[68ch] space-y-5 text-base leading-8 text-sand/85">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}

            {/* Nature de la mission : le texte de référence du type, toujours établi. */}
            <section aria-labelledby="nature-title">
              <h2
                id="nature-title"
                className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted"
              >
                {tDetail('sections.nature')} —{' '}
                {category?.label ?? project.category}
              </h2>
              <p className="mt-5 max-w-[68ch] border-l-2 border-malachite pl-5 text-base leading-8 text-sand/85">
                {tCategory(project.category)}
              </p>
              {!hasDetail && (
                <div className="mt-8 rounded-sheet border border-border-subtle bg-surface-elevated p-8">
                  <p className="text-sm leading-7 text-sand/75">
                    {tDetail('noDetail')}
                  </p>
                  <TextLink href="/contact" icon={ArrowRight} className="mt-5">
                    {tDetail('contact')}
                  </TextLink>
                </div>
              )}
            </section>

            {extraImages.length > 0 && (
              <section aria-labelledby="gallery-title">
                <h2
                  id="gallery-title"
                  className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted"
                >
                  {tDetail('sections.gallery')}
                </h2>
                <GalleryLightbox
                  images={extraImages}
                  firstNumber={2}
                  total={detail.gallery.length}
                />
              </section>
            )}

            {detail.documents.length > 0 && (
              <section aria-labelledby="documents-title">
                <h2
                  id="documents-title"
                  className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted"
                >
                  {tDetail('sections.documents')}
                </h2>
                <ul className="mt-5 divide-y divide-border-subtle overflow-hidden rounded-card border border-border-subtle bg-surface-elevated">
                  {detail.documents.map((document) => (
                    <li key={document.slug}>
                      <a
                        href={document.url}
                        target="_blank"
                        rel="noopener"
                        aria-label={tDetail('downloadLabel', {
                          title: document.title,
                          format: document.format,
                          size: document.size,
                        })}
                        className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white"
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-paper-muted text-sand">
                          <FileText size={18} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold leading-6">
                            {document.title}
                          </span>
                          <span className="block font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                            {[
                              document.format,
                              document.size,
                              document.pages
                                ? tDetail('pages', { count: document.pages })
                                : null,
                              document.year,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </span>
                        <span className="hidden items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-sand/70 transition-colors group-hover:text-sand sm:inline-flex">
                          {tDetail('download')}
                          <Download size={14} aria-hidden="true" />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="self-start lg:sticky lg:top-28">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-sand pt-6 lg:grid-cols-1">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold leading-6">
                    {value}
                  </dd>
                </div>
              ))}
              {detail.partners.length > 0 && (
                <div className="col-span-2 lg:col-span-1">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    {tDetail('facts.partners')}
                  </dt>
                  <dd className="mt-2">
                    <ul className="flex flex-wrap gap-2">
                      {detail.partners.map((partner) => (
                        <li
                          key={partner}
                          className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
                        >
                          {partner}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-8 rounded-card bg-paper-muted p-5">
              <p className="text-sm font-semibold leading-6">
                {tSheet('ctaTitle')}
              </p>
              <Link
                href="/contact"
                className="mt-3 inline-flex items-center gap-2 border-b border-sand/25 pb-0.5 text-xs font-bold uppercase tracking-[0.12em] transition-colors hover:border-sand"
              >
                {tSheet('cta')} <ArrowRight size={13} />
              </Link>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <ShareLinks
                title={project.mission}
                nativeLabel={tDetail('shareNative')}
              />
            </div>
          </aside>
        </div>
      </article>

      {related.length > 0 && (
        <section
          aria-labelledby="related-title"
          className="mx-auto mt-24 w-full max-w-[1200px]"
        >
          <div className="mb-8 flex items-end justify-between gap-6">
            <h2 id="related-title" className="font-heading text-3xl font-bold">
              {tDetail('related')}
            </h2>
            <TextLink
              href="/realisations"
              icon={ArrowRight}
              className="flex-none"
            >
              {tDetail('allProjects')}
            </TextLink>
          </div>
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((other) => (
              <li key={other.id}>
                <ProjectCard
                  project={other}
                  category={categories.find((c) => c.key === other.category)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
