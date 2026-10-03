'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { backendJson } from '@/lib/api/backend';
import { applyApiErrors } from '@/lib/admin/form-errors';
import { expertSchema, type ExpertFormValues } from '@/lib/admin/experts';
import type { Service } from '@/lib/admin/services';
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
import { FormAlert } from '../content/form-parts';
import { ExpertPreview } from './expert-preview';
import { PortraitCard } from './portrait-card';
import { SpecialtiesInput } from './specialties-input';

/**
 * Éditeur d'un expert : formulaire (React Hook Form + Zod, blueprint/16 §5) à
 * gauche ; à droite la publication (`sidebar`), le portrait et un aperçu en
 * direct de la fiche telle que la galerie du site la dévoile. La validation
 * côté navigateur n'est qu'un confort : l'API revérifie tout et ses refus
 * s'affichent sous les champs.
 */
export function ExpertEditor({
  mode,
  defaults,
  submitLabel,
  onSubmit,
  sidebar,
}: {
  mode: 'create' | 'edit';
  defaults: ExpertFormValues;
  submitLabel: string;
  /** Enregistre ; rejette avec l'erreur de l'API, affichée champ par champ. */
  onSubmit: (values: ExpertFormValues) => Promise<unknown>;
  /** Carte(s) du haut de la colonne de droite (publication, avancement de la traduction). */
  sidebar: ReactNode;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ExpertFormValues>({
    resolver: zodResolver(expertSchema),
    defaultValues: defaults,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const watched = useWatch({ control });
  const values: ExpertFormValues = { ...defaults, ...watched };

  const services = useQuery({
    queryKey: ['services', 'list'],
    queryFn: () => backendJson<Service[]>('admin/services'),
  });
  const poleName =
    services.data?.find((service) => service.id === values.serviceId)?.nameFr ??
    null;

  async function submit(next: ExpertFormValues) {
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
    <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        className="space-y-6"
        aria-label="Profil de l’expert"
      >
        {formError && <FormAlert>{formError}</FormAlert>}

        <Card
          title="Profil"
          description="Qui est l’expert, sa fonction et son pôle."
        >
          <div className="space-y-6">
            <Field
              label="Nom complet"
              required
              error={errors.fullName?.message}
            >
              <Input
                maxLength={120}
                autoComplete="off"
                data-autofocus={mode === 'create' ? true : undefined}
                {...register('fullName')}
              />
            </Field>

            <BilingualField
              label="Fonction"
              requiredLocales={['fr']}
              hint="Le titre affiché sous le nom, ex. « Hydrogéologue »."
              filled={{
                fr: Boolean(values.roleFr),
                en: Boolean(values.roleEn),
              }}
              errors={{
                fr: errors.roleFr?.message,
                en: errors.roleEn?.message,
              }}
            >
              {(locale) => (
                <Input
                  maxLength={200}
                  {...register(locale === 'fr' ? 'roleFr' : 'roleEn')}
                />
              )}
            </BilingualField>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Pôle de rattachement"
                hint="Donne sa couleur d’accent à la fiche sur le site."
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
                label="Années d’expérience"
                hint="Facultatif : affiché en grand sur la fiche."
                error={errors.yearsOfExperience?.message}
              >
                <Input
                  inputMode="numeric"
                  maxLength={2}
                  className="w-32"
                  {...register('yearsOfExperience')}
                />
              </Field>
            </div>
          </div>
        </Card>

        <Card
          title="Présentation"
          description="Le texte et les spécialités dévoilés avec la fiche."
        >
          <div className="space-y-6">
            <BilingualField
              label="Présentation"
              requiredLocales={[]}
              hint="Deux ou trois phrases : ce que fait l’expert au sein d’EWES."
              filled={{
                fr: Boolean(values.bioFr),
                en: Boolean(values.bioEn),
              }}
              errors={{
                fr: errors.bioFr?.message,
                en: errors.bioEn?.message,
              }}
            >
              {(locale) => (
                <Textarea
                  rows={5}
                  className="leading-7"
                  {...register(locale === 'fr' ? 'bioFr' : 'bioEn')}
                />
              )}
            </BilingualField>

            <BilingualField
              label="Spécialités"
              requiredLocales={[]}
              hint="Une pastille par spécialité (EIES, hydrogéologie…)."
              filled={{
                fr: values.specialtiesFr.length > 0,
                en: values.specialtiesEn.length > 0,
              }}
              errors={{
                fr: errors.specialtiesFr?.message,
                en: errors.specialtiesEn?.message,
              }}
            >
              {(locale) => (
                <Controller
                  control={control}
                  name={locale === 'fr' ? 'specialtiesFr' : 'specialtiesEn'}
                  render={({ field }) => (
                    <SpecialtiesInput
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              )}
            </BilingualField>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <ButtonLink href="/admin/services/experts" variant="ghost">
            {mode === 'create' ? 'Annuler' : 'Retour aux experts'}
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
        <PortraitCard
          value={values.photoUrl}
          name={values.fullName}
          onChange={(url) => setValue('photoUrl', url, { shouldDirty: true })}
        />
        <ExpertPreview values={values} poleName={poleName} />
      </div>
    </div>
  );
}
