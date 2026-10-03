'use client';

import { useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applyApiErrors } from '@/lib/admin/form-errors';
import {
  EMPTY_FIGURE,
  VALUE_MODE_LABELS,
  figureSchema,
  toFormValues,
  type FigureFormValues,
  type KeyFigure,
  type ValueMode,
} from '@/lib/admin/key-figures';
import {
  BilingualField,
  Button,
  Dialog,
  Field,
  Input,
  SegmentedControl,
  Switch,
} from '../ui';
import { FormAlert } from '../content/form-parts';
import { FigureTile } from './figures-preview';

type Locale = 'fr' | 'en';

/** Valeur affichée d'après la saisie en cours (années écoulées recalculées comme l'API). */
function shownValue(values: FigureFormValues) {
  if (values.mode === 'years') {
    const year = Number(values.sinceYear);
    return /^\d{4}$/.test(values.sinceYear)
      ? Math.max(0, new Date().getFullYear() - year)
      : 0;
  }
  return /^\d+$/.test(values.value) ? Number(values.value) : 0;
}

function FigureForm({
  formId,
  figure,
  onSubmit,
}: {
  formId: string;
  figure: KeyFigure | null;
  onSubmit: (values: FigureFormValues) => Promise<unknown>;
}) {
  const defaults = figure ? toFormValues(figure) : EMPTY_FIGURE;
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FigureFormValues>({
    resolver: zodResolver(figureSchema),
    defaultValues: defaults,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [previewLocale, setPreviewLocale] = useState<Locale>('fr');
  const watched = useWatch({ control });
  const values: FigureFormValues = { ...defaults, ...watched };

  async function submit(next: FigureFormValues) {
    setFormError(null);
    try {
      await onSubmit(next);
    } catch (error) {
      setFormError(
        applyApiErrors(error, {
          setError,
          fields: Object.keys(defaults),
          codes: { KEY_FIGURE_YEAR_IN_FUTURE: 'sinceYear' },
        }),
      );
    }
  }

  const english = previewLocale === 'en';
  const previewFigure = {
    value: shownValue(values),
    suffix: ((english && values.suffixEn) || values.suffixFr).trim(),
    label:
      (english && values.labelEn) || values.labelFr || 'Libellé du chiffre',
    subtext: (english && values.subtextEn) || values.subtextFr,
  };

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(submit)}
      noValidate
      className="grid gap-6 pb-2 lg:grid-cols-[1.35fr_1fr]"
    >
      <div className="min-w-0 space-y-5">
        {formError && <FormAlert>{formError}</FormAlert>}

        <fieldset className="space-y-3">
          <legend className="mb-1.5 text-[13px] font-medium text-ink">
            Valeur
          </legend>
          <SegmentedControl<ValueMode>
            label="Type de valeur"
            value={values.mode}
            onChange={(mode) =>
              setValue('mode', mode, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            options={(Object.keys(VALUE_MODE_LABELS) as ValueMode[]).map(
              (mode) => ({ value: mode, label: VALUE_MODE_LABELS[mode] }),
            )}
          />
          {values.mode === 'fixed' ? (
            <Field
              label="Nombre"
              required
              error={errors.value?.message}
              hint="Un nombre entier, que vous mettez à jour vous-même."
            >
              <Input
                inputMode="numeric"
                maxLength={7}
                className="w-40"
                data-autofocus={figure ? undefined : true}
                {...register('value')}
              />
            </Field>
          ) : (
            <Field
              label="Année de départ"
              required
              error={errors.sinceYear?.message}
              hint={`Le site affiche le nombre d’années écoulées depuis cette année (${shownValue(values)} aujourd’hui) et le met à jour tout seul chaque 1er janvier.`}
            >
              <Input
                inputMode="numeric"
                maxLength={4}
                placeholder="2008"
                className="w-40"
                {...register('sinceYear')}
              />
            </Field>
          )}
        </fieldset>

        <BilingualField
          label="Texte après la valeur"
          requiredLocales={[]}
          hint="Facultatif : « pays », « ans », « + »… collé à la valeur."
          filled={{
            fr: Boolean(values.suffixFr),
            en: Boolean(values.suffixEn),
          }}
          errors={{
            fr: errors.suffixFr?.message,
            en: errors.suffixEn?.message,
          }}
        >
          {(locale) => (
            <Input
              maxLength={20}
              className="w-56"
              {...register(locale === 'fr' ? 'suffixFr' : 'suffixEn')}
            />
          )}
        </BilingualField>

        <BilingualField
          label="Libellé"
          requiredLocales={['fr']}
          filled={{
            fr: Boolean(values.labelFr),
            en: Boolean(values.labelEn),
          }}
          errors={{
            fr: errors.labelFr?.message,
            en: errors.labelEn?.message,
          }}
        >
          {(locale) => (
            <Input
              maxLength={120}
              data-autofocus={figure && locale === 'fr' ? true : undefined}
              {...register(locale === 'fr' ? 'labelFr' : 'labelEn')}
            />
          )}
        </BilingualField>

        <BilingualField
          label="Précision"
          requiredLocales={[]}
          hint="Facultative : une ligne sous le libellé (noms, période…)."
          filled={{
            fr: Boolean(values.subtextFr),
            en: Boolean(values.subtextEn),
          }}
          errors={{
            fr: errors.subtextFr?.message,
            en: errors.subtextEn?.message,
          }}
        >
          {(locale) => (
            <Input
              maxLength={300}
              {...register(locale === 'fr' ? 'subtextFr' : 'subtextEn')}
            />
          )}
        </BilingualField>

        <Switch
          label="Visible sur le site"
          description="Masqué, le chiffre est conservé mais n’apparaît pas sur la page À propos."
          {...register('isVisible')}
        />
      </div>

      <div className="min-w-0 lg:sticky lg:top-0 lg:self-start">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-ink-muted">
            Aperçu sur le site
          </p>
          <SegmentedControl<Locale>
            label="Langue de l’aperçu"
            size="sm"
            value={previewLocale}
            onChange={setPreviewLocale}
            options={[
              { value: 'fr', label: 'FR' },
              { value: 'en', label: 'EN' },
            ]}
          />
        </div>
        <div className="rounded-xl border border-line bg-sunken p-4">
          <FigureTile
            figure={previewFigure}
            locale={previewLocale}
            className="rounded-xl border border-line bg-panel"
          />
        </div>
        {english && !values.labelEn && (
          <p className="mt-2 text-xs text-ink-subtle">
            Libellé anglais manquant : le site en anglais affiche le français.
          </p>
        )}
      </div>
    </form>
  );
}

/**
 * Fenêtre d'ajout ou de modification d'un chiffre clé. Le formulaire n'est
 * monté qu'à l'ouverture ; un refus de l'API s'affiche dans la fenêtre, qui
 * reste ouverte.
 */
export function FigureDialog({
  open,
  onClose,
  figure,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  /** Chiffre à modifier ; `null` : nouveau chiffre. */
  figure: KeyFigure | null;
  /** Enregistre ; rejette avec l'erreur de l'API. La fenêtre se ferme au succès. */
  onSubmit: (values: FigureFormValues) => Promise<unknown>;
}) {
  const formId = `figure-${useId()}`;
  const [busy, setBusy] = useState(false);

  async function save(values: FigureFormValues) {
    setBusy(true);
    try {
      await onSubmit(values);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!busy}
      size="xl"
      title={figure ? 'Modifier le chiffre clé' : 'Ajouter un chiffre clé'}
      description={
        figure
          ? undefined
          : 'Il sera ajouté à la fin de la bande ; vous pourrez ensuite le déplacer.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            {figure ? 'Enregistrer' : 'Ajouter le chiffre'}
          </Button>
        </>
      }
    >
      <FigureForm formId={formId} figure={figure} onSubmit={save} />
    </Dialog>
  );
}
