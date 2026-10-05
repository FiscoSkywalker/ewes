'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applyApiErrors } from '@/lib/admin/form-errors';
import { countWords } from '@/lib/rich-text';
import {
  ARTICLE_TYPES,
  DATE_PRECISIONS,
  PRECISION_LABELS,
  TYPE_LABELS,
  articleSchema,
  type ArticleFormValues,
} from '@/lib/admin/articles';
import {
  BilingualField,
  Button,
  ButtonLink,
  Card,
  Field,
  Input,
  Select,
  Skeleton,
  Textarea,
} from '../ui';
import { FormAlert, SlugCard, useAutoSlug } from '../content/form-parts';

interface ArticleFormProps {
  mode: 'create' | 'edit';
  defaults: ArticleFormValues;
  /** Slug figé : un article déjà publié garde son adresse (liens partagés). */
  slugLocked?: boolean;
  submitLabel: string;
  cancelHref: string;
  /** Enregistre ; rejette avec l'erreur de l'API, affichée champ par champ. */
  onSubmit: (values: ArticleFormValues) => Promise<unknown>;
}

const API_CODES = {
  ARTICLE_SLUG_TAKEN: 'slug',
  ARTICLE_SLUG_LOCKED: 'slug',
} as const;

// L'éditeur (Tiptap) pèse lourd et ne sert qu'ici : chargé à l'ouverture de l'écran, hors du reste du portail.
const RichTextEditor = dynamic(
  () => import('../rich-text/rich-text-editor').then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[26rem] w-full rounded-lg" />,
  },
);

function wordCount(html: string) {
  const words = countWords(html);
  return words > 0 ? `${words} mot${words > 1 ? 's' : ''}` : null;
}

/**
 * Formulaire d'un article (création et modification) : React Hook Form +
 * Zod (blueprint/16 §5). La validation côté navigateur n'est qu'un confort :
 * l'API revérifie tout et ses refus s'affichent sous les champs.
 */
export function ArticleForm({
  mode,
  defaults,
  slugLocked = false,
  submitLabel,
  cancelHref,
  onSubmit,
}: ArticleFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: defaults,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const watched = useWatch({ control });

  useAutoSlug({
    enabled: mode === 'create',
    edited: Boolean(dirtyFields.slug),
    title: watched.titleFr ?? '',
    setSlug: (slug) => setValue('slug', slug, { shouldValidate: false }),
  });

  async function submit(values: ArticleFormValues) {
    setFormError(null);
    try {
      await onSubmit(values);
      reset(values);
    } catch (error) {
      setFormError(
        applyApiErrors(error, {
          setError,
          fields: Object.keys(defaults),
          codes: API_CODES,
        }),
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-6">
      {formError && <FormAlert>{formError}</FormAlert>}

      <Card
        title="Article"
        description="Ce que les visiteurs lisent, en français et en anglais."
      >
        <div className="space-y-6">
          <BilingualField
            label="Titre"
            requiredLocales={['fr']}
            filled={{
              fr: Boolean(watched.titleFr),
              en: Boolean(watched.titleEn),
            }}
            errors={{
              fr: errors.titleFr?.message,
              en: errors.titleEn?.message,
            }}
          >
            {(locale) => (
              <Input
                maxLength={300}
                {...register(locale === 'fr' ? 'titleFr' : 'titleEn')}
              />
            )}
          </BilingualField>

          <BilingualField
            label="Résumé"
            requiredLocales={[]}
            hint="Deux ou trois phrases affichées dans les listes. Un résumé ou un contenu est nécessaire pour publier."
            filled={{
              fr: Boolean(watched.excerptFr),
              en: Boolean(watched.excerptEn),
            }}
            errors={{
              fr: errors.excerptFr?.message,
              en: errors.excerptEn?.message,
            }}
          >
            {(locale) => (
              <Textarea
                rows={3}
                {...register(locale === 'fr' ? 'excerptFr' : 'excerptEn')}
              />
            )}
          </BilingualField>

          <BilingualField
            label="Contexte"
            requiredLocales={[]}
            hint="Une ligne courte : le lieu, le client ou l’occasion."
            filled={{
              fr: Boolean(watched.contextFr),
              en: Boolean(watched.contextEn),
            }}
            errors={{
              fr: errors.contextFr?.message,
              en: errors.contextEn?.message,
            }}
          >
            {(locale) => (
              <Input
                maxLength={200}
                {...register(locale === 'fr' ? 'contextFr' : 'contextEn')}
              />
            )}
          </BilingualField>

          <BilingualField
            label="Contenu"
            requiredLocales={[]}
            hint={
              <>
                Titres, gras, listes, liens et images de la médiathèque : la
                mise en page est celle du site.
                {wordCount(watched.contentFr ?? '') && (
                  <span className="ml-2 text-ink-muted">
                    FR : {wordCount(watched.contentFr ?? '')}
                  </span>
                )}
              </>
            }
            filled={{
              fr: Boolean(watched.contentFr),
              en: Boolean(watched.contentEn),
            }}
            errors={{
              fr: errors.contentFr?.message,
              en: errors.contentEn?.message,
            }}
          >
            {(locale) => (
              <Controller
                control={control}
                name={locale === 'fr' ? 'contentFr' : 'contentEn'}
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    label={`Contenu (${locale === 'fr' ? 'français' : 'anglais'})`}
                  />
                )}
              />
            )}
          </BilingualField>
        </div>
      </Card>

      <Card title="Rubrique et date">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Rubrique" required error={errors.type?.message}>
            <Select {...register('type')}>
              {ARTICLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Date affichée"
            required
            hint="La précision de la date de parution sur le site."
            error={errors.datePrecision?.message}
          >
            <Select {...register('datePrecision')}>
              {DATE_PRECISIONS.map((precision) => (
                <option key={precision} value={precision}>
                  {PRECISION_LABELS[precision]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <SlugCard
        registration={register('slug')}
        error={errors.slug?.message}
        locked={slugLocked}
        mode={mode}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ButtonLink href={cancelHref} variant="ghost">
          {mode === 'create' ? 'Annuler' : 'Retour aux actualités'}
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
  );
}
