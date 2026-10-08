'use client';

import { useState, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applyApiErrors } from '@/lib/admin/form-errors';
import {
  META_DESCRIPTION_RANGE,
  pageSchema,
  type PageFormValues,
} from '@/lib/admin/pages';
import type { PageTexts, SitePage } from '@/lib/site-pages';
import { cx } from '@/lib/admin/cx';
import {
  BilingualField,
  Button,
  ButtonLink,
  Card,
  Input,
  Textarea,
} from '../ui';
import { FormAlert } from '../content/form-parts';
import { PagePreview } from './page-preview';

interface PageEditorProps {
  sitePage: SitePage;
  mode: 'create' | 'edit';
  defaults: PageFormValues;
  /** Textes d'origine, pour l'aperçu (nom de la page dans chaque langue). */
  texts?: { fr: PageTexts; en: PageTexts };
  /** La page est en ligne : un enregistrement est visible sur le site aussitôt. */
  live: boolean;
  submitLabel: string;
  /** Enregistre ; rejette avec l'erreur de l'API, affichée champ par champ. */
  onSubmit: (values: PageFormValues) => Promise<unknown>;
  /** Cartes de la colonne de droite sous l'aperçu (publication, avancement de la traduction). */
  sidebar: ReactNode;
}

/** Compteur de la description de référencement : la cible est une plage, pas un plafond strict. */
function MetaCounter({ label, text }: { label: string; text: string }) {
  const length = text.trim().length;
  const { min, max } = META_DESCRIPTION_RANGE;
  const tone =
    length === 0
      ? 'text-ink-subtle'
      : length < min || length > max
        ? 'text-warn'
        : 'text-ok';
  const advice =
    length === 0
      ? 'non renseignée'
      : length < min
        ? `${length} caractères, un peu courte`
        : length > max
          ? `${length} caractères, sera coupée`
          : `${length} caractères`;
  return (
    <span className={cx('whitespace-nowrap', tone)}>
      {label} : {advice}
    </span>
  );
}

/**
 * Éditeur d'une page institutionnelle : formulaire (React Hook Form + Zod,
 * blueprint/16 §5) à gauche, aperçu en direct et cartes de publication à
 * droite. La validation côté navigateur n'est qu'un confort : l'API revérifie
 * tout et ses refus s'affichent sous les champs.
 */
export function PageEditor({
  sitePage,
  mode,
  defaults,
  texts,
  live,
  submitLabel,
  onSubmit,
  sidebar,
}: PageEditorProps) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PageFormValues>({
    resolver: zodResolver(pageSchema),
    defaultValues: defaults,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const watched = useWatch({ control });
  // `useWatch` renvoie des valeurs partielles au premier rendu : on complète avec les défauts.
  const values: PageFormValues = { ...defaults, ...watched };

  async function submit(next: PageFormValues) {
    setFormError(null);
    try {
      await onSubmit(next);
      reset(next);
    } catch (error) {
      setFormError(
        applyApiErrors(error, {
          setError,
          fields: Object.keys(defaults),
        }),
      );
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        className="space-y-6"
        aria-label={`Modifier la page ${sitePage.label}`}
      >
        {formError && <FormAlert>{formError}</FormAlert>}

        <Card
          title="En-tête de la page"
          description={
            sitePage.header?.cardDescription ??
            `Le titre et l’introduction affichés en haut de la page « ${sitePage.label} ».`
          }
        >
          <div className="space-y-6">
            <BilingualField
              label={sitePage.header?.titleLabel ?? 'Titre'}
              requiredLocales={['fr']}
              hint={
                sitePage.header?.titleHint ??
                'La phrase d’accroche en grand : une idée, en une ligne ou deux.'
              }
              filled={{
                fr: Boolean(values.titleFr),
                en: Boolean(values.titleEn),
              }}
              errors={{
                fr: errors.titleFr?.message,
                en: errors.titleEn?.message,
              }}
            >
              {(locale) => (
                <Input
                  maxLength={200}
                  {...register(locale === 'fr' ? 'titleFr' : 'titleEn')}
                />
              )}
            </BilingualField>

            <BilingualField
              label={sitePage.header?.introLabel ?? 'Introduction'}
              requiredLocales={['fr']}
              hint={
                sitePage.header?.introHint ??
                'Deux à quatre phrases sous le titre : pour qui, pour quoi.'
              }
              filled={{
                fr: Boolean(values.contentFr),
                en: Boolean(values.contentEn),
              }}
              errors={{
                fr: errors.contentFr?.message,
                en: errors.contentEn?.message,
              }}
            >
              {(locale) => (
                <Textarea
                  rows={6}
                  className="leading-7"
                  {...register(locale === 'fr' ? 'contentFr' : 'contentEn')}
                />
              )}
            </BilingualField>
          </div>
        </Card>

        <Card
          title="Référencement"
          description="Le texte que Google et les réseaux sociaux affichent sous le nom de la page."
        >
          <BilingualField
            label="Description pour les moteurs de recherche"
            requiredLocales={[]}
            hint={
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  Facultative : sans elle, le début de l’introduction est
                  utilisé. Idéal : {META_DESCRIPTION_RANGE.min} à{' '}
                  {META_DESCRIPTION_RANGE.max} caractères.
                </span>
                <span aria-live="polite" className="flex flex-wrap gap-x-4">
                  <MetaCounter label="FR" text={values.metaDescriptionFr} />
                  <MetaCounter label="EN" text={values.metaDescriptionEn} />
                </span>
              </span>
            }
            filled={{
              fr: Boolean(values.metaDescriptionFr),
              en: Boolean(values.metaDescriptionEn),
            }}
            errors={{
              fr: errors.metaDescriptionFr?.message,
              en: errors.metaDescriptionEn?.message,
            }}
          >
            {(locale) => (
              <Textarea
                rows={3}
                {...register(
                  locale === 'fr' ? 'metaDescriptionFr' : 'metaDescriptionEn',
                )}
              />
            )}
          </BilingualField>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {live && (
            <p className="mr-auto text-xs text-ink-subtle">
              Page en ligne : une modification est visible sur le site dès
              l’enregistrement.
            </p>
          )}
          <ButtonLink href="/admin/pages" variant="ghost">
            Retour aux pages
          </ButtonLink>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={mode === 'edit' && !isDirty}
          >
            {submitLabel}
          </Button>
        </div>
      </form>

      <div className="space-y-6">
        {sidebar}
        <PagePreview sitePage={sitePage} values={values} texts={texts} />
      </div>
    </div>
  );
}
