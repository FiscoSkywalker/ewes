'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Inbox, Reply, TriangleAlert } from 'lucide-react';
import { applyApiErrors } from '@/lib/admin/form-errors';
import {
  mailSchema,
  toMailFormValues,
  type MailFormValues,
  type MailOverview,
} from '@/lib/admin/settings';
import { Badge, Field, Input, Switch } from '../ui';
import { FormAlert } from '../content/form-parts';
import { SaveBar } from './save-bar';
import { SettingsSection } from './settings-section';

interface MailFormProps {
  overview: MailOverview;
  /** Enregistre ; rejette avec l'erreur de l'API, affichée champ par champ. */
  onSubmit: (values: MailFormValues) => Promise<unknown>;
}

/**
 * Qui reçoit les messages du formulaire de contact, et l'expéditeur
 * reçoit-il un accusé de réception. Le destinataire saisi ici l'emporte sur
 * celui du serveur ; laissé vide, c'est celui du serveur qui s'applique. Dans
 * tous les cas le message reste enregistré dans le portail : l'e-mail n'est
 * jamais l'unique source de vérité (blueprint/13 §5).
 */
export function MailForm({ overview, onSubmit }: MailFormProps) {
  const defaults = toMailFormValues(overview);
  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<MailFormValues>({
    resolver: zodResolver(mailSchema),
    defaultValues: defaults,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const watched = useWatch({ control });
  const typed = (watched.contactRecipientEmail ?? '').trim();
  const { recipient } = overview;

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  async function submit(next: MailFormValues) {
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

  const unreachable = typed === '' && recipient.source === 'none';

  return (
    <form
      onSubmit={handleSubmit(submit)}
      noValidate
      aria-label="Réglages des messages de contact"
      className="space-y-5"
    >
      {formError && <FormAlert>{formError}</FormAlert>}

      <SettingsSection
        icon={Inbox}
        tone="env"
        title="Messages de contact"
        description="Qui est prévenu par e-mail quand un visiteur écrit depuis le site."
      >
        <div className="space-y-5">
          <Field
            label="Destinataire des messages"
            error={errors.contactRecipientEmail?.message}
            hint={
              typed
                ? 'Chaque nouveau message sera envoyé à cette adresse.'
                : recipient.source === 'environment'
                  ? `Laissé vide : l’adresse définie sur le serveur (${recipient.address}) est utilisée.`
                  : 'Laissé vide, aucune adresse n’est utilisée tant que le serveur n’en définit pas.'
            }
          >
            <Input
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder={recipient.address ?? 'equipe@ewes.cd'}
              {...register('contactRecipientEmail')}
            />
          </Field>

          {unreachable ? (
            <p
              role="note"
              className="flex items-start gap-2.5 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-[13px] leading-relaxed text-warn"
            >
              <TriangleAlert
                size={17}
                aria-hidden="true"
                className="mt-px shrink-0"
              />
              <span>
                Aucun destinataire n’est défini : les messages sont bien
                enregistrés dans le portail, mais personne n’est prévenu par
                e-mail. Pensez à relever régulièrement{' '}
                <strong className="font-semibold">Messages de contact</strong>.
              </span>
            </p>
          ) : (
            <p className="flex flex-wrap items-center gap-2 text-xs text-ink-subtle">
              Actuellement :
              <span className="font-medium text-ink">
                {recipient.address ?? 'aucun'}
              </span>
              {recipient.source === 'settings' && (
                <Badge tone="brand">Défini ici</Badge>
              )}
              {recipient.source === 'environment' && (
                <Badge>Hérité du serveur</Badge>
              )}
            </p>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Reply}
        title="Accusé de réception"
        description="Le courriel de confirmation reçu par la personne qui vous écrit."
      >
        <Switch
          label="Envoyer un accusé de réception"
          description="L’expéditeur reçoit un e-mail l’assurant que son message est bien arrivé et lui indiquant le délai de réponse. Limité à 3 par adresse et par heure."
          {...register('contactAutoReply')}
        />
      </SettingsSection>

      <SaveBar
        dirty={isDirty}
        saving={isSubmitting}
        savedAt={overview.updatedAt}
        onReset={() => {
          reset(defaults);
          setFormError(null);
        }}
        consequence="Appliqué dès le prochain message reçu."
      />
    </form>
  );
}
