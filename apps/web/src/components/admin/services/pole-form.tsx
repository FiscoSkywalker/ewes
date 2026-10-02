'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import { applyApiErrors } from '@/lib/admin/form-errors';
import { poleSchema, type PoleFormValues } from '@/lib/admin/services';
import { POLE_ACCENT_NAMES, POLE_CODES, type PoleKey } from '@/lib/poles';
import { BilingualField, Button, Card, Input, Textarea } from '../ui';
import { FormAlert } from '../content/form-parts';
import { PoleTag } from './pole-mark';

/**
 * Présentation d'un pôle (nom, accroche, texte), en français et en anglais :
 * React Hook Form + Zod (blueprint/16 §5).
 */
export function PoleForm({
  defaults,
  onSubmit,
}: {
  defaults: PoleFormValues;
  /** Enregistre ; rejette avec l'erreur de l'API, affichée champ par champ. */
  onSubmit: (values: PoleFormValues) => Promise<unknown>;
}) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PoleFormValues>({
    resolver: zodResolver(poleSchema),
    defaultValues: defaults,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const watched = useWatch({ control });
  const values: PoleFormValues = { ...defaults, ...watched };

  async function submit(next: PoleFormValues) {
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

  return (
    <form
      onSubmit={handleSubmit(submit)}
      noValidate
      className="space-y-6"
      aria-label="Présentation du pôle"
    >
      {formError && <FormAlert>{formError}</FormAlert>}

      <Card
        title="Présentation"
        description="Ce que les visiteurs lisent à côté du visuel, en français et en anglais."
      >
        <div className="space-y-6">
          <BilingualField
            label="Nom du pôle"
            requiredLocales={['fr']}
            filled={{ fr: Boolean(values.nameFr), en: Boolean(values.nameEn) }}
            errors={{
              fr: errors.nameFr?.message,
              en: errors.nameEn?.message,
            }}
          >
            {(locale) => (
              <Input
                maxLength={200}
                {...register(locale === 'fr' ? 'nameFr' : 'nameEn')}
              />
            )}
          </BilingualField>

          <BilingualField
            label="Accroche"
            requiredLocales={[]}
            hint="La phrase en couleur sous le nom : la promesse du pôle."
            filled={{
              fr: Boolean(values.taglineFr),
              en: Boolean(values.taglineEn),
            }}
            errors={{
              fr: errors.taglineFr?.message,
              en: errors.taglineEn?.message,
            }}
          >
            {(locale) => (
              <Input
                maxLength={200}
                {...register(locale === 'fr' ? 'taglineFr' : 'taglineEn')}
              />
            )}
          </BilingualField>

          <BilingualField
            label="Présentation"
            requiredLocales={['fr']}
            hint="Deux à quatre phrases : le domaine, les clients, la méthode."
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
                rows={6}
                className="leading-7"
                {...register(
                  locale === 'fr' ? 'descriptionFr' : 'descriptionEn',
                )}
              />
            )}
          </BilingualField>
        </div>
        <div className="mt-6 flex justify-end border-t border-line pt-4">
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Enregistrer la présentation
          </Button>
        </div>
      </Card>
    </form>
  );
}

/**
 * Identité du pôle (code, couleur d'accent, adresse), en lecture seule : elle
 * relie le pôle à son chapitre du site et ne se modifie pas.
 */
export function PoleIdentityCard({
  pole,
  slug,
}: {
  pole: PoleKey | null;
  slug: string;
}) {
  return (
    <Card title="Identité du pôle">
      <dl className="grid gap-x-6 gap-y-4 text-[13px] sm:grid-cols-3">
        <div>
          <dt className="text-xs text-ink-subtle">Code</dt>
          <dd className="mt-1.5">
            {pole ? (
              <PoleTag pole={pole} />
            ) : (
              <span className="text-ink-muted">Aucun</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-subtle">Couleur d’accent</dt>
          <dd className="mt-1.5 font-medium text-ink">
            {pole ? POLE_ACCENT_NAMES[pole] : 'Neutre'}
            {pole && (
              <span className="ml-1 font-normal text-ink-subtle">
                ({POLE_CODES[pole]})
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-subtle">Adresse du pôle</dt>
          <dd className="mt-1.5 break-all font-mono text-xs text-ink">
            {slug}
          </dd>
        </div>
      </dl>
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-subtle">
        <Lock size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
        {pole
          ? 'L’adresse, le code et la couleur relient ce pôle à son chapitre du site : ils sont fixes, pour que le pôle se reconnaisse partout.'
          : 'Ce service n’a pas de chapitre sur le site : seuls les pôles Environnement, Eau et Travaux d’ingénierie y sont affichés.'}
      </p>
    </Card>
  );
}
