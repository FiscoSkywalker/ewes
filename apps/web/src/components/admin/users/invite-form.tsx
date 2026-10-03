'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  CircleCheck,
  KeyRound,
  Mail,
  Send,
  UserPlus,
} from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { applyApiErrors } from '@/lib/admin/form-errors';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import {
  EMPTY_INVITE,
  INVITATION_VALID_DAYS,
  ROLE_PROFILES,
  inviteSchema,
  type InviteFormValues,
  type InviteResult,
} from '@/lib/admin/users';
import { FormAlert } from '../content/form-parts';
import { Button, ButtonLink, Card, Field, Input } from '../ui';
import { ActivationLink } from './activation-link';
import { RolePicker } from './role-picker';
import { RoleScope } from './role-scope';

const FIELDS = Object.keys(EMPTY_INVITE);

/**
 * Invitation d'un nouveau compte : qui (nom, e-mail) et avec quel rôle. Le
 * compte n'existe qu'une fois l'invitation acceptée ; la personne choisit
 * elle-même son mot de passe (l'administrateur ne le voit jamais). La
 * validation du navigateur est un confort : l'API revérifie tout.
 */
export function InviteForm() {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<InviteResult | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: EMPTY_INVITE,
  });
  const role = useWatch({ control, name: 'role' }) ?? EMPTY_INVITE.role;

  async function submit(values: InviteFormValues) {
    setFormError(null);
    try {
      const result = await backendJson<InviteResult>(
        'admin/users/invitations',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(values),
        },
      );
      await invalidatePortalData(queryClient);
      setSent(result);
    } catch (error) {
      setFormError(
        applyApiErrors(error, {
          setError,
          fields: FIELDS,
          codes: {
            USER_EMAIL_TAKEN: 'email',
            INVITATION_PENDING: 'email',
          },
        }),
      );
    }
  }

  if (sent) {
    return (
      <SentConfirmation
        result={sent}
        onAnother={() => {
          setSent(null);
          reset(EMPTY_INVITE);
        }}
      />
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        className="space-y-6"
        aria-label="Invitation d’un utilisateur"
      >
        {formError && <FormAlert>{formError}</FormAlert>}

        <Card
          title="Qui invitez-vous ?"
          description="Le nom s’affichera dans le portail et dans le journal d’audit."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Nom complet"
              required
              error={errors.fullName?.message}
            >
              <Input
                maxLength={120}
                autoComplete="off"
                autoFocus
                placeholder="Grâce Mutombo"
                {...register('fullName')}
              />
            </Field>
            <Field
              label="Adresse e-mail"
              required
              error={errors.email?.message}
              hint="C’est à cette adresse que l’invitation est envoyée."
            >
              <Input
                type="email"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="prenom.nom@exemple.com"
                {...register('email')}
              />
            </Field>
          </div>
        </Card>

        <Card
          title="Rôle"
          description="Définit ce que la personne peut faire dans le portail. Vous pourrez le modifier plus tard."
        >
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <RolePicker
                legend="Choisissez un rôle"
                value={field.value}
                onChange={field.onChange}
                error={errors.role?.message}
              />
            )}
          />
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <ButtonLink href="/admin/utilisateurs" variant="ghost">
            Annuler
          </ButtonLink>
          <Button type="submit" icon={Send} loading={isSubmitting}>
            Envoyer l’invitation
          </Button>
        </div>
      </form>

      <aside className="space-y-6 lg:sticky lg:top-6" aria-label="Aide">
        <Card
          title={`Ce que pourra faire un ${ROLE_PROFILES[role].label.toLowerCase()}`}
          description="Rappel de la portée du rôle choisi."
        >
          <RoleScope role={role} />
        </Card>
        <Card title="Comment ça se passe">
          <ol className="space-y-4">
            {[
              {
                icon: Mail,
                title: 'Elle reçoit un e-mail',
                text: 'Avec un lien personnel, à usage unique.',
              },
              {
                icon: KeyRound,
                title: 'Elle choisit son mot de passe',
                text: 'Vous ne le voyez jamais, et personne d’autre non plus.',
              },
              {
                icon: CircleCheck,
                title: 'Son compte est activé',
                text: `Le lien est valable ${INVITATION_VALID_DAYS} jours ; vous pouvez le renvoyer ou le retirer à tout moment.`,
              },
            ].map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                  <step.icon size={15} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[13px] font-medium text-ink">
                    <span className="sr-only">Étape {index + 1} : </span>
                    {step.title}
                  </p>
                  <p className="text-xs leading-relaxed text-ink-subtle">
                    {step.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </aside>
    </div>
  );
}

function SentConfirmation({
  result,
  onAnother,
}: {
  result: InviteResult;
  onAnother: () => void;
}) {
  const { invitation } = result;
  return (
    <div className="mx-auto max-w-2xl">
      <Card padding="none">
        <div className="space-y-6 p-6 sm:p-8" role="status">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ok-soft text-ok">
              <CircleCheck size={24} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                Invitation envoyée à {invitation.fullName}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                Un e-mail part vers{' '}
                <strong className="font-medium text-ink [overflow-wrap:anywhere]">
                  {invitation.email}
                </strong>
                . Le compte{' '}
                <strong className="font-medium text-ink">
                  {ROLE_PROFILES[invitation.role].label}
                </strong>{' '}
                sera créé dès qu’elle aura choisi son mot de passe.
              </p>
            </div>
          </div>

          <ActivationLink url={result.activationUrl} />

          <p className="text-xs leading-relaxed text-ink-subtle">
            Vous pouvez suivre l’envoi dans le{' '}
            <Link
              href="/admin/emails"
              className="font-medium text-brand underline underline-offset-2"
            >
              suivi des e-mails
            </Link>
            .
          </p>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5">
            <Button variant="secondary" icon={UserPlus} onClick={onAnother}>
              Inviter une autre personne
            </Button>
            <ButtonLink href="/admin/utilisateurs" iconRight={ArrowRight}>
              Voir les comptes
            </ButtonLink>
          </div>
        </div>
      </Card>
    </div>
  );
}
