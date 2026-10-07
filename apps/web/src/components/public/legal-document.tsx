import { Fragment, type ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { ArrowUpRight, CalendarClock, Info, ListTree } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import {
  LEGAL_SLUGS,
  LEGAL_UPDATED_ISO,
  legalLabels,
  type LegalBlock,
  type LegalDocument as LegalDocumentData,
  type LegalSlug,
} from '@/lib/legal';
import { SectionHeading } from '@/components/public/section-heading';

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
const LINK = /^\[([^\]]+)\]\(([^)]+)\)$/;

const linkClass =
  'font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary';

/**
 * Balisage minimal des textes légaux : `**gras**`, `` `code` `` et
 * `[libellé](adresse)`. Une adresse interne (`/…`) passe par le routage
 * localisé ; `mailto:` et `tel:` restent des liens simples ; le reste s'ouvre
 * dans un nouvel onglet.
 */
function inline(text: string, newTabLabel: string): ReactNode {
  return text.split(INLINE).map((part, index) => {
    if (!part) return null;
    if (part.startsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-sand">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`')) {
      return (
        <code
          key={index}
          className="rounded bg-sand/8 px-1.5 py-0.5 font-mono text-[0.85em] text-sand"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = LINK.exec(part);
    if (!link) return <Fragment key={index}>{part}</Fragment>;
    const [, label, href] = link;
    if (href.startsWith('/')) {
      return (
        <Link key={index} href={href} className={linkClass}>
          {label}
        </Link>
      );
    }
    if (href.startsWith('mailto:') || href.startsWith('tel:')) {
      return (
        <a key={index} href={href} className={`${linkClass} break-words`}>
          {label}
        </a>
      );
    }
    return (
      <a
        key={index}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {label}
        <span className="sr-only"> ({newTabLabel})</span>
      </a>
    );
  });
}

function Block({
  block,
  newTabLabel,
}: {
  block: LegalBlock;
  newTabLabel: string;
}) {
  const text = (value: string) => inline(value, newTabLabel);

  switch (block.type) {
    case 'p':
      return <p className="leading-7 text-sand/80">{text(block.text)}</p>;

    case 'list':
      return (
        <ul className="grid gap-3">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 leading-7 text-sand/80">
              <span
                aria-hidden="true"
                className="mt-[0.7rem] size-1.5 flex-none rounded-full bg-primary"
              />
              <span>{text(item)}</span>
            </li>
          ))}
        </ul>
      );

    case 'note':
      return (
        <p
          role="note"
          className="flex gap-3 rounded-card border border-primary/20 bg-primary/[0.06] p-5 text-sm leading-6 text-sand/85"
        >
          <Info
            size={17}
            className="mt-0.5 flex-none text-primary"
            aria-hidden="true"
          />
          <span>{text(block.text)}</span>
        </p>
      );

    case 'facts':
      return (
        <dl className="overflow-hidden rounded-card border border-border bg-surface-elevated">
          {block.rows.map(([label, value]) => (
            <div
              key={label}
              className="grid gap-1 border-b border-border-subtle px-5 py-4 last:border-b-0 sm:grid-cols-[13rem_1fr] sm:gap-6"
            >
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                {label}
              </dt>
              <dd className="text-sm leading-6 text-sand">{text(value)}</dd>
            </div>
          ))}
        </dl>
      );

    case 'table':
      return (
        <>
          {/* Grand écran : tableau. */}
          <div className="hidden overflow-hidden rounded-card border border-border bg-surface-elevated md:block">
            <table className="w-full border-collapse text-left text-sm leading-6">
              <thead>
                <tr className="bg-paper-muted">
                  {block.head.map((cell) => (
                    <th
                      key={cell}
                      scope="col"
                      className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted"
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row) => (
                  <tr
                    key={row[0]}
                    className="border-t border-border-subtle align-top"
                  >
                    {row.map((cell, column) => (
                      <td
                        key={column}
                        className={`px-4 py-4 ${column === 0 ? 'font-medium text-sand' : 'text-sand/78'}`}
                      >
                        {text(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile : une fiche par ligne, libellé de colonne devant chaque valeur. */}
          <ul className="grid gap-3 md:hidden">
            {block.rows.map((row) => (
              <li
                key={row[0]}
                className="grid gap-3 rounded-card border border-border bg-surface-elevated p-4 text-sm leading-6"
              >
                {row.map((cell, column) => (
                  <div key={column}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                      {block.head[column]}
                    </div>
                    <div
                      className={
                        column === 0 ? 'font-medium text-sand' : 'text-sand/78'
                      }
                    >
                      {text(cell)}
                    </div>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </>
      );
  }
}

/** « 7 octobre 2026 » / « 7 October 2026 », sans dépendre du fuseau du serveur. */
function formatUpdated(locale: string) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${LEGAL_UPDATED_ISO}T00:00:00Z`));
}

interface LegalDocumentProps {
  slug: LegalSlug;
  locale: string;
  document: LegalDocumentData;
}

/**
 * Mise en page commune des documents légaux (blueprint/15 §2) : en-tête avec
 * date de révision, sommaire (collé à gauche sur grand écran, repliable sur
 * mobile), sections numérotées, puis renvois vers les autres documents.
 * Server Component : aucun JavaScript côté navigateur.
 */
export async function LegalDocument({
  slug,
  locale,
  document,
}: LegalDocumentProps) {
  const t = await getTranslations('Legal');
  const labels = legalLabels(locale);
  const others = LEGAL_SLUGS.filter((other) => other !== slug);
  const anchor = (index: number) => `section-${index + 1}`;
  const newTab = t('newTab');

  const toc = (
    <ol className="grid gap-1 text-sm">
      {document.sections.map((section, index) => (
        <li key={section.title}>
          <a
            href={`#${anchor(index)}`}
            className="flex gap-3 rounded-control px-3 py-2 leading-5 text-sand/70 transition-colors hover:bg-sand/6 hover:text-sand"
          >
            <span className="font-mono text-[11px] leading-5 text-primary">
              {String(index + 1).padStart(2, '0')}
            </span>
            {section.title}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="text-sand">
      <section className="bg-paper-muted px-6 pb-14 pt-28 md:px-16 md:pb-20 md:pt-36">
        <div className="mx-auto w-full max-w-[1440px]">
          <SectionHeading
            as="h1"
            eyebrow={document.eyebrow}
            title={document.title}
            description={document.intro}
            className="max-w-4xl"
          />
          <p className="mt-8 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            <CalendarClock size={14} aria-hidden="true" />
            {t('updated', { date: formatUpdated(locale) })}
          </p>
        </div>
      </section>

      <section className="bg-paper px-6 py-14 md:px-16 md:py-20">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-16 xl:grid-cols-[19rem_minmax(0,1fr)]">
          <nav
            aria-label={t('toc')}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            {/* Mobile : sommaire repliable ; grand écran : toujours ouvert. */}
            <details className="group rounded-card border border-border bg-surface-elevated lg:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3 text-sm font-medium">
                <ListTree
                  size={16}
                  className="text-primary"
                  aria-hidden="true"
                />
                {t('toc')}
              </summary>
              <div className="border-t border-border-subtle p-2">{toc}</div>
            </details>
            <div className="hidden lg:block">
              <h2 className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                {t('toc')}
              </h2>
              {toc}
            </div>
          </nav>

          <div className="min-w-0 max-w-3xl">
            {document.sections.map((section, index) => (
              <section
                key={section.title}
                id={anchor(index)}
                aria-labelledby={`${anchor(index)}-title`}
                className="scroll-mt-28 border-t border-border py-10 first:border-t-0 first:pt-0"
              >
                <h2
                  id={`${anchor(index)}-title`}
                  className="mb-6 flex items-baseline gap-4 font-heading text-2xl font-bold leading-tight sm:text-3xl"
                >
                  <span className="font-mono text-sm font-medium text-primary">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {section.title}
                </h2>
                <div className="grid gap-5">
                  {section.blocks.map((block, position) => (
                    <Block key={position} block={block} newTabLabel={newTab} />
                  ))}
                </div>
              </section>
            ))}

            <aside
              aria-labelledby="legal-others"
              className="mt-6 border-t border-border pt-10"
            >
              <h2
                id="legal-others"
                className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
              >
                {t('others')}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-3">
                {others.map((other) => (
                  <li key={other}>
                    <Link
                      href={`/${other}`}
                      className="group flex h-full items-center justify-between gap-3 rounded-card border border-border bg-surface-elevated p-4 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {labels[other]}
                      <ArrowUpRight
                        size={16}
                        className="flex-none text-muted transition-colors group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
