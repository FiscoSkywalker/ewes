'use client';

import { useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileCheck } from 'lucide-react';
import { applyApiErrors } from '@/lib/admin/form-errors';
import {
  EMPTY_OFFERING,
  offeringSchema,
  toOfferingFormValues,
  type Offering,
  type OfferingFormValues,
} from '@/lib/admin/services';
import { SERVICE_ICONS } from '@/lib/service-icons';
import type { PoleKey } from '@/lib/poles';
import {
  BilingualField,
  Button,
  Dialog,
  Input,
  SegmentedControl,
  Textarea,
} from '../ui';
import { FormAlert } from '../content/form-parts';
import { IconPicker } from './icon-picker';
import { PoleIconTile } from './pole-mark';

type Locale = 'fr' | 'en';

/** La carte d'une prestation telle que le site la dessine, d'après la saisie en cours. */
function OfferingPreview({
  pole,
  values,
  position,
}: {
  pole: PoleKey | null;
  values: OfferingFormValues;
  position: number;
}) {
  const [locale, setLocale] = useState<Locale>('fr');
  const english = locale === 'en';
  const title = (english && values.titleEn) || values.titleFr;
  const text = (english && values.descriptionEn) || values.descriptionFr;
  const Icon = SERVICE_ICONS[values.icon]?.Icon ?? FileCheck;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink-muted">Aperçu sur le site</p>
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
      </div>
      <div className="rounded-xl border border-line bg-sunken p-4">
        <div
          className={`${pole ? `pole-${pole}` : 'pole-neutral'} rounded-xl border border-line bg-panel p-5`}
        >
          <div className="flex items-start justify-between">
            <PoleIconTile pole={pole ?? 'env'} size="lg">
              <Icon size={20} strokeWidth={1.75} />
            </PoleIconTile>
            <span className="font-mono text-[11px] text-ink-subtle">
              {String(position).padStart(2, '0')}
            </span>
          </div>
          <p
            className={`mt-5 text-base font-semibold leading-snug ${title ? 'text-ink' : 'text-ink-subtle'}`}
          >
            {title || 'Titre de la prestation'}
          </p>
          <p
            className={`mt-2 line-clamp-6 text-[13px] leading-relaxed ${text ? 'text-ink-muted' : 'text-ink-subtle'}`}
          >
            {text || 'La description apparaîtra ici.'}
          </p>
        </div>
      </div>
      {english && !(values.titleEn && values.descriptionEn) && (
        <p className="mt-2 text-xs text-ink-subtle">
          Version anglaise incomplète : le site en anglais affiche le texte
          français pour ce qui manque.
        </p>
      )}
    </div>
  );
}

function OfferingForm({
  formId,
  offering,
  pole,
  position,
  onSubmit,
}: {
  formId: string;
  offering: Offering | null;
  pole: PoleKey | null;
  /** Rang de la prestation sur le site (1 = première), pour l'aperçu. */
  position: number;
  onSubmit: (values: OfferingFormValues) => Promise<unknown>;
}) {
  const defaults = offering ? toOfferingFormValues(offering) : EMPTY_OFFERING;
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<OfferingFormValues>({
    resolver: zodResolver(offeringSchema),
    defaultValues: defaults,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const watched = useWatch({ control });
  const values: OfferingFormValues = { ...defaults, ...watched };

  async function submit(next: OfferingFormValues) {
    setFormError(null);
    try {
      await onSubmit(next);
    } catch (error) {
      setFormError(
        applyApiErrors(error, { setError, fields: Object.keys(defaults) }),
      );
    }
  }

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(submit)}
      noValidate
      className="grid gap-6 pb-2 lg:grid-cols-[1.35fr_1fr]"
    >
      <div className="min-w-0 space-y-5">
        {formError && <FormAlert>{formError}</FormAlert>}
        <BilingualField
          label="Titre"
          requiredLocales={['fr']}
          filled={{ fr: Boolean(values.titleFr), en: Boolean(values.titleEn) }}
          errors={{
            fr: errors.titleFr?.message,
            en: errors.titleEn?.message,
          }}
        >
          {(locale) => (
            <Input
              maxLength={200}
              data-autofocus={locale === 'fr' ? true : undefined}
              {...register(locale === 'fr' ? 'titleFr' : 'titleEn')}
            />
          )}
        </BilingualField>
        <BilingualField
          label="Description"
          requiredLocales={['fr']}
          hint="Une à trois phrases : ce que fait EWES, pour qui."
          filled={{
            fr: Boolean(values.descriptionFr),
            en: Boolean(values.descriptionEn),
          }}
          errors={{
            fr: errors.descriptionFr?.message,
            en: errors.descriptionEn?.message,
          }}
        >
          {(locale) => (
            <Textarea
              rows={5}
              className="leading-7"
              {...register(locale === 'fr' ? 'descriptionFr' : 'descriptionEn')}
            />
          )}
        </BilingualField>
        <IconPicker registration={register('icon')} value={values.icon} />
      </div>
      <div className="min-w-0 lg:sticky lg:top-0 lg:self-start">
        <OfferingPreview pole={pole} values={values} position={position} />
      </div>
    </form>
  );
}

/**
 * Fenêtre d'ajout ou de modification d'une prestation. Le formulaire n'est
 * monté qu'à l'ouverture (il repart toujours vierge ou de la prestation
 * ouverte) ; un refus de l'API s'affiche dans la fenêtre, qui reste ouverte.
 */
export function OfferingDialog({
  open,
  onClose,
  offering,
  pole,
  position,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  /** Prestation à modifier ; `null` : nouvelle prestation. */
  offering: Offering | null;
  pole: PoleKey | null;
  position: number;
  /** Enregistre ; rejette avec l'erreur de l'API. La fenêtre se ferme au succès. */
  onSubmit: (values: OfferingFormValues) => Promise<unknown>;
}) {
  const formId = `offering-${useId()}`;
  const [busy, setBusy] = useState(false);

  async function save(values: OfferingFormValues) {
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
      title={offering ? 'Modifier la prestation' : 'Ajouter une prestation'}
      description={
        offering
          ? undefined
          : 'Elle sera ajoutée à la fin de la liste ; vous pourrez ensuite la déplacer.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            {offering ? 'Enregistrer' : 'Ajouter la prestation'}
          </Button>
        </>
      }
    >
      <OfferingForm
        formId={formId}
        offering={offering}
        pole={pole}
        position={position}
        onSubmit={save}
      />
    </Dialog>
  );
}
