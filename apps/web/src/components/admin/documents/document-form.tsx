'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, FileText, Upload } from 'lucide-react';
import {
  ApiError,
  backendJson,
  describeError,
  fieldErrors,
} from '@/lib/api/backend';
import {
  CATEGORY_LABELS,
  DOCUMENT_CATEGORIES,
  documentSchema,
  fileProblem,
  formatBytes,
  slugify,
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

const SLUG_ERROR_CODES = ['DOCUMENT_SLUG_TAKEN', 'DOCUMENT_SLUG_LOCKED'];

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

  // Création : le slug suit le titre tant que la personne ne l'a pas modifié elle-même.
  const slugEdited = Boolean(dirtyFields.slug);
  useEffect(() => {
    if (mode === 'create' && !slugEdited) {
      setValue('slug', slugify(titleFr), { shouldValidate: false });
    }
  }, [mode, slugEdited, titleFr, setValue]);

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
      const byField = fieldErrors(error);
      let placed = false;
      for (const [field, message] of Object.entries(byField)) {
        if (field in defaults) {
          setError(field as keyof DocumentFormValues, { message });
          placed = true;
        } else if (field === 'file') {
          setFileError(message);
          placed = true;
        }
      }
      if (error instanceof ApiError && SLUG_ERROR_CODES.includes(error.code)) {
        setError('slug', { message: error.message });
        placed = true;
      }
      if (!placed) setFormError(describeError(error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-6">
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-bad"
        >
          <CircleAlert
            size={18}
            aria-hidden="true"
            className="mt-0.5 shrink-0"
          />
          {formError}
        </div>
      )}

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

      <Card title="Adresse">
        <Field
          label="Slug"
          required
          error={errors.slug?.message}
          hint={
            slugLocked
              ? 'Ce document est publié : son adresse ne peut plus changer (des liens y renvoient peut-être).'
              : mode === 'create'
                ? 'Généré à partir du titre ; modifiable tant que le document n’est pas publié. Il ne pourra plus changer ensuite.'
                : 'Modifiable tant que le document n’a jamais été publié.'
          }
        >
          <Input
            maxLength={120}
            spellCheck={false}
            disabled={slugLocked}
            className="font-mono text-[13px]"
            {...register('slug')}
          />
        </Field>
      </Card>

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

/** Sélecteur de fichier : zone cliquable, nom et taille du fichier choisi, erreur éventuelle. */
export function FilePicker({
  file,
  error,
  onChange,
  disabled = false,
}: {
  file: File | null;
  error: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <input
        ref={input}
        id={id}
        type="file"
        accept="application/pdf,.pdf"
        disabled={disabled}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="sr-only"
      />
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand ${
          error
            ? 'border-bad bg-bad-soft/40'
            : 'border-line-strong hover:border-brand/50 hover:bg-sunken'
        }`}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
          {file ? (
            <FileText size={20} aria-hidden="true" />
          ) : (
            <Upload size={20} aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium text-ink">
            {file ? file.name : 'Choisir un fichier PDF'}
          </span>
          <span className="block text-xs text-ink-subtle">
            {file
              ? formatBytes(file.size)
              : 'Cliquez pour parcourir vos fichiers'}
          </span>
        </span>
        {file && (
          <span className="shrink-0 text-xs font-medium text-brand">
            Changer
          </span>
        )}
      </label>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-bad"
        >
          <CircleAlert
            size={14}
            aria-hidden="true"
            className="mt-px shrink-0"
          />
          {error}
        </p>
      )}
    </div>
  );
}
