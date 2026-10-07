'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Server, ShieldCheck } from 'lucide-react';
import { applyApiErrors } from '@/lib/admin/form-errors';
import {
  legalSchema,
  toLegalFormValues,
  type LegalFormValues,
  type LegalSettings,
} from '@/lib/admin/settings';
import { Field, Input, Textarea } from '../ui';
import { FormAlert } from '../content/form-parts';
import { SaveBar } from './save-bar';
import { SettingsSection } from './settings-section';

interface LegalFormProps {
  settings: LegalSettings;
  /** Enregistre ; rejette avec l'erreur de l'API, affichée champ par champ. */
  onSubmit: (values: LegalFormValues) => Promise<unknown>;
}

/**
 * Informations qui alimentent les pages légales du site (mentions légales,
 * politique de confidentialité). Aucune n'est devinée : une mention laissée
 * vide n'est simplement pas affichée. Un enregistrement est visible sur le
 * site aussitôt, ce que la barre d'enregistrement rappelle.
 */
export function LegalForm({ settings, onSubmit }: LegalFormProps) {
  const defaults = toLegalFormValues(settings);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<LegalFormValues>({
    resolver: zodResolver(legalSchema),
    defaultValues: defaults,
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  async function submit(next: LegalFormValues) {
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
      aria-label="Informations légales"
      className="space-y-5"
    >
      {formError && <FormAlert>{formError}</FormAlert>}

      <SettingsSection
        icon={Building2}
        title="Identité de l’entreprise"
        description="Affichée dans les mentions légales, avec la raison sociale, l’adresse, le téléphone et l’e-mail de l’onglet Général."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Représentant légal"
            error={errors.legalRepresentative?.message}
            hint="Nom de la personne qui répond du contenu publié sur le site."
          >
            <Input autoComplete="off" {...register('legalRepresentative')} />
          </Field>
          <Field
            label="Capital social"
            error={errors.legalCapital?.message}
            hint="Tel qu’il doit s’afficher, monnaie comprise."
          >
            <Input
              autoComplete="off"
              placeholder="10 000 USD"
              {...register('legalCapital')}
            />
          </Field>
          <Field
            label="Registre du commerce (RCCM)"
            error={errors.legalRccm?.message}
            hint="Numéro d’inscription au Registre du Commerce et du Crédit Mobilier."
          >
            <Input
              autoComplete="off"
              placeholder="CD/LSH/RCCM/…"
              {...register('legalRccm')}
            />
          </Field>
          <Field
            label="Identification nationale"
            error={errors.legalIdNat?.message}
          >
            <Input autoComplete="off" {...register('legalIdNat')} />
          </Field>
          <Field label="Numéro d’impôt (NIF)" error={errors.legalNif?.message}>
            <Input autoComplete="off" {...register('legalNif')} />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Server}
        tone="ing"
        title="Hébergement du site"
        description="Le fournisseur chez qui le site et ses données sont installés. À renseigner dès que l’hébergement est choisi."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Hébergeur" error={errors.hostingName?.message}>
            <Input autoComplete="off" {...register('hostingName')} />
          </Field>
          <Field
            label="Adresse et pays de l’hébergeur"
            error={errors.hostingAddress?.message}
          >
            <Textarea rows={2} {...register('hostingAddress')} />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={ShieldCheck}
        tone="env"
        title="Protection des données personnelles"
        description="Utilisées dans la politique de confidentialité, pour que les visiteurs sachent à qui s’adresser."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="E-mail pour exercer ses droits"
            error={errors.privacyEmail?.message}
            hint="Vide : l’e-mail public de l’onglet Général est utilisé."
          >
            <Input
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="donnees@ewes.cd"
              {...register('privacyEmail')}
            />
          </Field>
          <Field
            label="Récépissé de déclaration à l’APD"
            error={errors.apdReceipt?.message}
            hint="Référence remise par l’Autorité de protection des données après la déclaration du traitement. Affichée seulement si renseignée."
          >
            <Input autoComplete="off" {...register('apdReceipt')} />
          </Field>
        </div>
      </SettingsSection>

      <SaveBar
        dirty={isDirty}
        saving={isSubmitting}
        savedAt={settings.updatedAt}
        onReset={() => {
          reset(defaults);
          setFormError(null);
        }}
        consequence="Visible aussitôt dans les pages légales du site."
      />
    </form>
  );
}
