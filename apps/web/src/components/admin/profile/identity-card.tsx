'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Lock, UserRound } from 'lucide-react';
import { applyApiErrors } from '@/lib/admin/form-errors';
import {
  nameSchema,
  updateName,
  type NameFormValues,
} from '@/lib/admin/profile';
import { FormAlert } from '../content/form-parts';
import { SettingsSection } from '../settings/settings-section';
import { applyProfile, type Session } from '../session';
import { Button, Field, Input, useToast } from '../ui';

/**
 * Nom et adresse e-mail. Le nom se modifie ici ; l'adresse est l'identifiant
 * de connexion : la changer demande de prouver qu'on en est le propriétaire,
 * ce que le portail ne sait pas encore faire — elle est donc affichée, pas
 * modifiable, et un administrateur peut la corriger si besoin.
 */
export function IdentityCard({ session }: { session: Session }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { fullName: session.fullName },
  });

  async function submit(values: NameFormValues) {
    setFormError(null);
    try {
      const saved = await updateName(values);
      applyProfile(queryClient, saved);
      reset({ fullName: saved.fullName });
      toast.success('Nom mis à jour');
    } catch (error) {
      setFormError(applyApiErrors(error, { setError, fields: ['fullName'] }));
    }
  }

  return (
    <SettingsSection
      icon={UserRound}
      title="Informations personnelles"
      description="Votre nom s’affiche dans le portail, dans le journal d’audit et dans les droits d’accès que l’on vous attribue."
    >
      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        aria-label="Informations personnelles"
        className="space-y-5"
      >
        {formError && <FormAlert>{formError}</FormAlert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nom complet" required error={errors.fullName?.message}>
            <Input
              autoComplete="name"
              maxLength={120}
              {...register('fullName')}
            />
          </Field>
          <Field
            label={
              <span className="inline-flex items-center gap-1.5">
                Adresse e-mail
                <Lock
                  size={12}
                  aria-hidden="true"
                  className="text-ink-subtle"
                />
              </span>
            }
            required
            hint="C’est votre identifiant de connexion. Pour la changer, demandez-le à un administrateur."
          >
            <Input value={session.email} readOnly disabled />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          {isDirty && (
            <Button
              variant="ghost"
              onClick={() => reset({ fullName: session.fullName })}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
          )}
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Enregistrer
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
