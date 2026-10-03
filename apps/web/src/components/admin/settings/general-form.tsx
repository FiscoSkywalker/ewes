'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, ExternalLink, MapPin, Phone, Share2 } from 'lucide-react';
import { applyApiErrors } from '@/lib/admin/form-errors';
import {
  SOCIAL_FIELDS,
  generalSchema,
  toGeneralFormValues,
  type GeneralFormValues,
  type GeneralSettings,
} from '@/lib/admin/settings';
import { hoursRows } from '@/lib/office-hours';
import { BilingualField, Field, Input, Textarea } from '../ui';
import { FormAlert } from '../content/form-parts';
import { ContactPreview } from './contact-preview';
import { DayPicker } from './day-picker';
import { SaveBar } from './save-bar';
import { SettingsSection } from './settings-section';

interface GeneralFormProps {
  settings: GeneralSettings;
  /** Enregistre ; rejette avec l'erreur de l'API, affichée champ par champ. */
  onSubmit: (values: GeneralFormValues) => Promise<unknown>;
}

const MAPS_SEARCH = 'https://www.google.com/maps/search/?api=1&query=';

/**
 * Réglages généraux du site : coordonnées, adresse, horaires, réseaux sociaux.
 * Formulaire (React Hook Form + Zod, blueprint/16 §5) avec aperçu en direct du
 * pied de page. Pas de brouillon : un enregistrement est visible sur le site
 * aussitôt, ce que la barre d'enregistrement rappelle. La validation côté
 * navigateur n'est qu'un confort : l'API revérifie tout et ses refus
 * s'affichent sous les champs.
 */
export function GeneralForm({ settings, onSubmit }: GeneralFormProps) {
  const defaults = toGeneralFormValues(settings);
  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: defaults,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const watched = useWatch({ control });
  // `useWatch` renvoie des valeurs partielles au premier rendu : on complète avec les défauts.
  const values: GeneralFormValues = { ...defaults, ...watched };

  // Quitter ou recharger la page avec des modifications en cours : le navigateur demande confirmation.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  async function submit(next: GeneralFormValues) {
    setFormError(null);
    try {
      await onSubmit(next);
      reset(next);
    } catch (error) {
      setFormError(
        applyApiErrors(error, { setError, fields: Object.keys(defaults) }),
      );
    }
  }

  const hours = hoursRows(
    {
      days: values.officeDays,
      opensAt: values.opensAt,
      closesAt: values.closesAt,
      timeZone: 'Africa/Lubumbashi',
    },
    'fr',
  ).filter((row) => row.value);
  const validHours =
    /^\d\d:\d\d$/.test(values.opensAt) &&
    /^\d\d:\d\d$/.test(values.closesAt) &&
    values.closesAt > values.opensAt;

  return (
    <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_22rem]">
      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        aria-label="Réglages généraux du site"
        className="min-w-0 space-y-5"
      >
        {formError && <FormAlert>{formError}</FormAlert>}

        <SettingsSection
          icon={Phone}
          title="Coordonnées"
          description="Affichées dans le pied de page, la page Contact, l’accueil et À propos."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Téléphone"
              required
              error={errors.phone?.message}
              hint="Tel qu’il s’affiche. Un appel direct est proposé aux visiteurs sur mobile."
            >
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="+243 81 81 53 110"
                {...register('phone')}
              />
            </Field>
            <Field
              label="E-mail public"
              required
              error={errors.email?.message}
              hint={
                <>
                  Adresse affichée aux visiteurs. Les messages du formulaire
                  arrivent, eux, à l’adresse choisie dans{' '}
                  <Link
                    href="/admin/parametres/messagerie"
                    className="font-medium text-brand underline underline-offset-2 hover:text-brand-strong"
                  >
                    Messagerie
                  </Link>
                  .
                </>
              }
            >
              <Input
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="contact@ewes.cd"
                {...register('email')}
              />
            </Field>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={MapPin}
          tone="env"
          title="Adresse du siège"
          description="Affichée dans le pied de page et la page Contact ; le bouton « Itinéraire » ouvre cette adresse dans Google Maps."
        >
          <BilingualField
            label="Adresse"
            requiredLocales={['fr']}
            hint={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  Sans version anglaise, le site en anglais affiche l’adresse
                  française.
                </span>
                {values.addressFr.trim() && (
                  <a
                    href={`${MAPS_SEARCH}${encodeURIComponent(values.addressFr.trim())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-brand underline underline-offset-2 hover:text-brand-strong"
                  >
                    Vérifier sur Google Maps
                    <ExternalLink size={12} aria-hidden="true" />
                    <span className="sr-only">
                      (s’ouvre dans un nouvel onglet)
                    </span>
                  </a>
                )}
              </span>
            }
            filled={{
              fr: Boolean(values.addressFr),
              en: Boolean(values.addressEn),
            }}
            errors={{
              fr: errors.addressFr?.message,
              en: errors.addressEn?.message,
            }}
          >
            {(locale) => (
              <Textarea
                rows={2}
                maxLength={300}
                autoComplete="off"
                {...register(locale === 'fr' ? 'addressFr' : 'addressEn')}
              />
            )}
          </BilingualField>
        </SettingsSection>

        <SettingsSection
          icon={Clock}
          tone="ing"
          title="Horaires d’ouverture"
          description="Sur la page Contact : l’état « bureaux ouverts / fermés » et le tableau des horaires. Heure de Lubumbashi (UTC+2)."
        >
          <div className="space-y-5">
            <Controller
              control={control}
              name="officeDays"
              render={({ field, fieldState }) => (
                <DayPicker
                  legend="Jours d’ouverture"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <div className="grid max-w-md gap-5 sm:grid-cols-2">
              <Field label="Ouverture" required error={errors.opensAt?.message}>
                <Input type="time" {...register('opensAt')} />
              </Field>
              <Field
                label="Fermeture"
                required
                error={errors.closesAt?.message}
              >
                <Input type="time" {...register('closesAt')} />
              </Field>
            </div>
            <p
              aria-live="polite"
              className="rounded-lg bg-sunken px-3.5 py-2.5 text-[13px] text-ink-muted"
            >
              {validHours && hours.length > 0 ? (
                <>
                  <span className="font-medium text-ink">
                    Les visiteurs liront :{' '}
                  </span>
                  {hours.map((row) => `${row.label}, ${row.value}`).join(' · ')}
                </>
              ) : (
                'Complétez les jours et les heures pour voir le résumé.'
              )}
            </p>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Share2}
          title="Réseaux sociaux"
          description="Les liens apparaissent dans le pied de page. Un champ vide n’affiche pas le réseau."
        >
          <div className="grid gap-5">
            {SOCIAL_FIELDS.map((network) => (
              <Field
                key={network.id}
                label={network.label}
                error={errors[network.field]?.message}
              >
                <Input
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={network.placeholder}
                  {...register(network.field)}
                />
              </Field>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-ink-subtle">
            Collez l’adresse complète de votre page, en https://. Elle doit
            mener au réseau indiqué ; les liens s’ouvrent dans un nouvel onglet.
          </p>
        </SettingsSection>

        <SaveBar
          dirty={isDirty}
          saving={isSubmitting}
          savedAt={settings.updatedAt}
          onReset={() => {
            reset(defaults);
            setFormError(null);
          }}
          consequence="Les changements seront visibles sur le site dès l’enregistrement."
        />
      </form>

      <div className="2xl:sticky 2xl:top-24">
        <ContactPreview values={values} />
      </div>
    </div>
  );
}
