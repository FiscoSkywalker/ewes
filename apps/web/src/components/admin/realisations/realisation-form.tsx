'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { backendJson } from '@/lib/api/backend';
import { applyApiErrors } from '@/lib/admin/form-errors';
import type { ServiceOption } from '@/lib/admin/public-documents';
import {
  MAX_FEATURED,
  REALISATION_TYPES,
  TYPE_LABELS,
  realisationSchema,
  type RealisationFormValues,
} from '@/lib/admin/realisations';
import {
  BilingualField,
  Button,
  ButtonLink,
  Card,
  Field,
  Input,
  Select,
  Switch,
  Textarea,
} from '../ui';
import { FormAlert, SlugCard, useAutoSlug } from '../content/form-parts';

interface RealisationFormProps {
  mode: 'create' | 'edit';
  defaults: RealisationFormValues;
  /** Slug figé : une fiche déjà publiée garde son adresse (liens partagés). */
  slugLocked?: boolean;
  submitLabel: string;
  cancelHref: string;
  /** Enregistre ; rejette avec l'erreur de l'API, affichée champ par champ. */
  onSubmit: (values: RealisationFormValues) => Promise<unknown>;
}

const API_CODES = {
  REALISATION_SLUG_TAKEN: 'slug',
  REALISATION_SLUG_LOCKED: 'slug',
  REALISATION_FEATURED_LIMIT: 'isFeatured',
  SERVICE_NOT_FOUND: 'serviceId',
} as const;

const TEXT_FIELDS = [
  {
    label: 'Description',
    hint: 'Le contexte et la nature de la mission.',
    fr: 'descriptionFr',
    en: 'descriptionEn',
  },
  {
    label: 'Objectifs',
    hint: 'Ce que la mission devait accomplir.',
    fr: 'objectivesFr',
    en: 'objectivesEn',
  },
  {
    label: 'Résultats',
    hint: 'Ce qui a été obtenu, livré ou démontré.',
    fr: 'resultsFr',
    en: 'resultsEn',
  },
] as const;

/**
 * Formulaire d'une réalisation (création et modification) : React Hook Form
 * + Zod (blueprint/16 §5). La validation côté navigateur n'est qu'un
 * confort : l'API revérifie tout et ses refus s'affichent sous les champs.
 */
export function RealisationForm({
  mode,
  defaults,
  slugLocked = false,
  submitLabel,
  cancelHref,
  onSubmit,
}: RealisationFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = useForm<RealisationFormValues>({
    resolver: zodResolver(realisationSchema),
    defaultValues: defaults,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const services = useQuery({
    queryKey: ['documents', 'services'],
    queryFn: () => backendJson<ServiceOption[]>('admin/services'),
    staleTime: 5 * 60_000,
  });

  const watched = useWatch({ control });
  const clientName = watched.clientName ?? '';

  useAutoSlug({
    enabled: mode === 'create',
    edited: Boolean(dirtyFields.slug),
    title: watched.titleFr ?? '',
    setSlug: (slug) => setValue('slug', slug, { shouldValidate: false }),
  });

  async function submit(values: RealisationFormValues) {
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
        title="Mission"
        description="Ce que les visiteurs lisent sur la fiche, en français et en anglais."
      >
        <div className="space-y-6">
          <BilingualField
            label="Intitulé de la mission"
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
                maxLength={500}
                {...register(locale === 'fr' ? 'titleFr' : 'titleEn')}
              />
            )}
          </BilingualField>

          {TEXT_FIELDS.map((field) => (
            <BilingualField
              key={field.label}
              label={field.label}
              hint={field.hint}
              requiredLocales={[]}
              filled={{
                fr: Boolean(watched[field.fr]),
                en: Boolean(watched[field.en]),
              }}
              errors={{
                fr: errors[field.fr]?.message,
                en: errors[field.en]?.message,
              }}
            >
              {(locale) => (
                <Textarea
                  rows={5}
                  {...register(locale === 'fr' ? field.fr : field.en)}
                />
              )}
            </BilingualField>
          ))}
        </div>
      </Card>

      <Card
        title="Classement"
        description="Permet de filtrer le portfolio public par type, année et lieu."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Type de mission"
            hint="Obligatoire pour publier."
            error={errors.projectType?.message}
          >
            <Select {...register('projectType')}>
              <option value="">À préciser</option>
              {REALISATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABELS[type].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Pôle d’expertise"
            hint="Environnement, Eau ou Travaux d’ingénierie."
            error={errors.serviceId?.message}
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
          <Field
            label="Année"
            hint="Obligatoire pour publier."
            error={errors.year?.message}
          >
            <Input
              inputMode="numeric"
              placeholder="2024"
              {...register('year')}
            />
          </Field>
          <Field
            label="Année de fin"
            hint="Pour une mission sur plusieurs années."
            error={errors.yearEnd?.message}
          >
            <Input
              inputMode="numeric"
              placeholder="2025"
              {...register('yearEnd')}
            />
          </Field>
          <Field
            label="Localisation"
            error={errors.location?.message}
            className="sm:col-span-2"
          >
            <Input
              placeholder="Lubumbashi, Haut-Katanga"
              maxLength={200}
              {...register('location')}
            />
          </Field>
        </div>
      </Card>

      <Card title="Client">
        <div className="space-y-5">
          <Field label="Nom du client" error={errors.clientName?.message}>
            <Input maxLength={300} {...register('clientName')} />
          </Field>
          <Switch
            label="Afficher le nom du client sur le site"
            description="Le client n’est jamais cité publiquement sans votre accord explicite : EWES doit avoir confirmé qu’il peut l’être."
            disabled={clientName.trim() === ''}
            {...register('isClientPublic')}
          />
        </div>
      </Card>

      <Card title="Mise en avant">
        <Switch
          label="Afficher en vitrine sur l’Accueil"
          description={`Au plus ${MAX_FEATURED} réalisations publiées peuvent être en vitrine en même temps.`}
          {...register('isFeatured')}
        />
        {errors.isFeatured?.message && (
          <p role="alert" className="mt-3 text-xs font-medium text-bad">
            {errors.isFeatured.message}
          </p>
        )}
      </Card>

      <SlugCard
        registration={register('slug')}
        error={errors.slug?.message}
        locked={slugLocked}
        mode={mode}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ButtonLink href={cancelHref} variant="ghost">
          {mode === 'create' ? 'Annuler' : 'Retour aux réalisations'}
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
