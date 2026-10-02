'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { backendJson } from '@/lib/api/backend';
import { applyApiErrors } from '@/lib/admin/form-errors';
import {
  CATEGORY_LABELS,
  DOCUMENT_CATEGORIES,
  documentSchema,
  fileProblem,
  type DocumentFormValues,
  type ServiceOption,
} from '@/lib/admin/public-documents';
import {
  BilingualField,
  Button,
  ButtonLink,
  Card,
  Field,
  Input,
  Select,
  Textarea,
} from '../ui';
import { FilePicker } from '../content/file-picker';
import { FormAlert, SlugCard, useAutoSlug } from '../content/form-parts';

interface DocumentFormProps {
  mode: 'create' | 'edit';
  defaults: DocumentFormValues;
  /** Slug figé : un document déjà publié garde son adresse (liens partagés). */
  slugLocked?: boolean;
  submitLabel: string;
  cancelHref: string;
  /** Enregistre ; rejette avec l'erreur de l'API, affichée champ par champ. */
  onSubmit: (values: DocumentFormValues, file: File | null) => Promise<unknown>;
}

const SLUG_CODES = {
  DOCUMENT_SLUG_TAKEN: 'slug',
  DOCUMENT_SLUG_LOCKED: 'slug',
} as const;

/**
 * Formulaire d'un document public (création et modification) : React Hook
 * Form + Zod (blueprint/16 §5). La validation côté navigateur n'est qu'un
 * confort : l'API revérifie tout et ses refus s'affichent sous les champs.
 */
export function DocumentForm({
  mode,
  defaults,
  slugLocked = false,
  submitLabel,
  cancelHref,
  onSubmit,
}: DocumentFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: defaults,
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const services = useQuery({
    queryKey: ['documents', 'services'],
    queryFn: () => backendJson<ServiceOption[]>('admin/services'),
    staleTime: 5 * 60_000,
  });

  const [titleFr, titleEn, excerptFr, excerptEn] = useWatch({
    control,
    name: ['titleFr', 'titleEn', 'excerptFr', 'excerptEn'],
  });

  useAutoSlug({
    enabled: mode === 'create',
    edited: Boolean(dirtyFields.slug),
    title: titleFr,
    setSlug: (slug) => setValue('slug', slug, { shouldValidate: false }),
  });

  async function submit(values: DocumentFormValues) {
    setFormError(null);
    if (mode === 'create') {
      if (!file) return setFileError('Choisissez le fichier PDF à publier.');
      if (fileError) return;
    }
    try {
      await onSubmit(values, file);
      reset(values);
    } catch (error) {
      setFormError(
        applyApiErrors(error, {
          setError,
          fields: Object.keys(defaults),
          codes: SLUG_CODES,
          onExtraField: (field, message) => {
            if (field !== 'file') return false;
            setFileError(message);
            return true;
          },
        }),
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-6">
      {formError && <FormAlert>{formError}</FormAlert>}

      <Card
        title="Contenu"
        description="Ce que les visiteurs voient sur le site."
      >
        <div className="space-y-5">
          <BilingualField
            label="Titre"
            requiredLocales={['fr']}
            filled={{ fr: Boolean(titleFr), en: Boolean(titleEn) }}
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
            label="Description"
            requiredLocales={[]}
            hint="Quelques lignes affichées sous le titre dans la bibliothèque."
            filled={{ fr: Boolean(excerptFr), en: Boolean(excerptEn) }}
            errors={{
              fr: errors.excerptFr?.message,
              en: errors.excerptEn?.message,
            }}
          >
            {(locale) => (
              <Textarea
                rows={4}
                {...register(locale === 'fr' ? 'excerptFr' : 'excerptEn')}
              />
            )}
          </BilingualField>
        </div>
      </Card>

      <Card title="Classement">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Catégorie" required error={errors.category?.message}>
            <Select {...register('category')}>
              {DOCUMENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Pôle d’expertise"
            error={errors.serviceId?.message}
            hint="Rattache le document à un pôle du site."
          >
            <Select {...register('serviceId')}>
              <option value="">Aucun pôle</option>
              {services.data?.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.nameFr}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Année" error={errors.year?.message}>
            <Input
              inputMode="numeric"
              placeholder="2025"
              {...register('year')}
            />
          </Field>
          <Field label="Nombre de pages" error={errors.pages?.message}>
            <Input inputMode="numeric" {...register('pages')} />
          </Field>
        </div>
      </Card>

      <SlugCard
        registration={register('slug')}
        error={errors.slug?.message}
        locked={slugLocked}
        mode={mode}
      />

      {mode === 'create' && (
        <Card
          title="Fichier PDF"
          description="20 Mo au plus. Le contenu du fichier est vérifié : seul un vrai PDF est accepté."
        >
          <FilePicker
            file={file}
            error={fileError}
            onChange={(next) => {
              setFile(next);
              setFileError(next ? fileProblem(next) : null);
            }}
          />
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ButtonLink href={cancelHref} variant="ghost">
          {mode === 'create' ? 'Annuler' : 'Retour à la bibliothèque'}
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
