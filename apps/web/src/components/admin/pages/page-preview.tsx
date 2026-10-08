'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { cx } from '@/lib/admin/cx';
import { META_DESCRIPTION_RANGE, type PageFormValues } from '@/lib/admin/pages';
import type { PageTexts, SitePage } from '@/lib/site-pages';
import { excerpt } from '@/lib/text';
import { Card, SegmentedControl } from '../ui';

type Locale = 'fr' | 'en';

/** Texte affiché pour une langue : l'anglais retombe sur le français s'il est vide, comme le site. */
function shown(values: PageFormValues, locale: Locale) {
  const english = locale === 'en';
  const title = (english && values.titleEn) || values.titleFr;
  const intro = (english && values.contentEn) || values.contentFr;
  // Comme le site : pas de description française sur le site anglais.
  const meta = english ? values.metaDescriptionEn : values.metaDescriptionFr;
  return {
    title,
    intro,
    description: meta || excerpt(intro),
    explicitMeta: Boolean(meta),
    // L'anglais n'est « propre » que si titre et introduction sont traduits.
    translated: !english || Boolean(values.titleEn && values.contentEn),
  };
}

/**
 * Aperçu en direct de l'en-tête de la page et de son extrait dans un moteur
 * de recherche, FR/EN, d'après ce qui est saisi (même règles de repli que le
 * site : une langue vide affiche le français). Simplifié : la mise en page
 * exacte, avec ses polices, se voit sur le site.
 */
export function PagePreview({
  sitePage,
  values,
  texts,
}: {
  sitePage: SitePage;
  values: PageFormValues;
  /** Textes d'origine (porteurs du nom de la page dans chaque langue). */
  texts?: { fr: PageTexts; en: PageTexts };
}) {
  const [locale, setLocale] = useState<Locale>('fr');
  const current = shown(values, locale);
  const eyebrow = texts?.[locale].eyebrow ?? sitePage.label;
  // Accueil : le titre est celui de l'onglet, pas un titre affiché en grand.
  const titleIsTabTitle = Boolean(sitePage.header);

  return (
    <Card
      title="Aperçu"
      actions={
        <SegmentedControl<Locale>
          label="Langue de l’aperçu"
          size="sm"
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'fr', label: 'FR' },
            { value: 'en', label: 'EN' },
          ]}
        />
      }
    >
      {/* En-tête de la page */}
      <div
        className="overflow-hidden rounded-xl border border-line"
        aria-label="Aperçu de l’en-tête de la page"
        role="group"
      >
        <div className="flex items-center gap-1.5 border-b border-line bg-sunken px-3 py-2">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-line-strong"
          />
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-line-strong"
          />
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-line-strong"
          />
          <span className="ml-2 truncate font-mono text-[10.5px] text-ink-subtle">
            /{locale}
            {sitePage.href}
          </span>
        </div>
        <div className="bg-sunken/60 px-5 pb-6 pt-5">
          <p className="mb-3 flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-brand">
            <span aria-hidden="true" className="h-px w-5 bg-brand" />
            {eyebrow}
          </p>
          {!titleIsTabTitle && (
            <p
              className={cx(
                'text-balance text-[22px] font-semibold leading-[1.15] tracking-tight',
                current.title ? 'text-ink' : 'text-ink-subtle',
              )}
            >
              {current.title || 'Titre de la page'}
            </p>
          )}
          <p
            className={cx(
              'mt-3 line-clamp-6 text-[13px] leading-relaxed',
              current.intro ? 'text-ink-muted' : 'text-ink-subtle',
            )}
          >
            {current.intro ||
              (titleIsTabTitle
                ? 'Le texte d’accroche apparaîtra ici.'
                : 'L’introduction apparaîtra ici.')}
          </p>
        </div>
      </div>
      {!current.translated && (
        <p className="mt-2 text-xs text-ink-subtle">
          Version anglaise incomplète : le site en anglais affiche alors le
          texte français.
        </p>
      )}

      {/* Extrait de moteur de recherche */}
      <div className="mt-5">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
          <Search size={13} aria-hidden="true" />
          Dans un moteur de recherche
        </p>
        <div className="rounded-xl border border-line bg-panel p-3.5">
          <p className="truncate text-[11.5px] text-ink-subtle">
            /{locale}
            {sitePage.href}
          </p>
          <p className="mt-0.5 text-[15.5px] leading-snug text-brand">
            {titleIsTabTitle
              ? current.title || 'Titre de l’onglet'
              : `${eyebrow} | EWES S.A.R.L.`}
          </p>
          <p
            className={cx(
              'mt-1 text-[12.5px] leading-snug',
              current.description ? 'text-ink-muted' : 'text-ink-subtle',
            )}
          >
            {current.description || 'Aucun texte à afficher.'}
          </p>
        </div>
        <p className="mt-2 text-xs text-ink-subtle">
          {current.explicitMeta
            ? `Description rédigée pour les moteurs de recherche (idéal : ${META_DESCRIPTION_RANGE.min} à ${META_DESCRIPTION_RANGE.max} caractères).`
            : 'Aucune description dédiée : le début de l’introduction est utilisé.'}
        </p>
      </div>
    </Card>
  );
}
