'use client';

import { useState, type ComponentProps } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Eye, EyeOff, KeyRound, TriangleAlert } from 'lucide-react';
import { applyApiErrors } from '@/lib/admin/form-errors';
import { cx } from '@/lib/admin/cx';
import { relativeTime } from '@/lib/admin/format';
import {
  EMPTY_PASSWORD_FORM,
  accountKey,
  changePassword,
  passwordSchema,
  type PasswordFormValues,
} from '@/lib/admin/profile';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordGauge,
} from '@/lib/admin/users';
import { FormAlert } from '../content/form-parts';
import { SettingsSection } from '../settings/settings-section';
import { Button, Field, Input, useToast } from '../ui';

const FIELDS = ['currentPassword', 'newPassword', 'confirmation'] as const;

const SEGMENT_TONES = {
  bad: 'bg-bad',
  warn: 'bg-warn',
  ok: 'bg-ok',
} as const;

/** Champ mot de passe avec bouton « afficher » : il se relie au `Field` qui l'entoure. */
function PasswordInput({
  revealed,
  onToggle,
  ...props
}: ComponentProps<typeof Input> & {
  revealed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <Input
        {...props}
        type={revealed ? 'text' : 'password'}
        maxLength={PASSWORD_MAX_LENGTH}
        className="pr-11!"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={
          revealed ? 'Masquer les mots de passe' : 'Afficher les mots de passe'
        }
        aria-pressed={revealed}
        className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
      >
        {revealed ? (
          <EyeOff size={16} aria-hidden="true" />
        ) : (
          <Eye size={16} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

/**
 * Jauge de longueur : segments et mot, jamais la couleur seule. Elle ne juge
 * que la longueur (la règle réellement appliquée) et ne prétend pas mesurer
 * la robustesse.
 */
function PasswordGauge({ value }: { value: string }) {
  const gauge = passwordGauge(value);
  return (
    <div className="pt-1" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={cx(
              'h-1.5 flex-1 rounded-full transition-colors',
              segment <= gauge.level
                ? SEGMENT_TONES[gauge.tone]
                : 'bg-line-strong',
            )}
          />
        ))}
      </div>
      <p className="mt-1.5 flex min-h-5 items-center gap-1.5 text-xs text-ink-subtle">
        {value === '' ? (
          <>
            Au moins {PASSWORD_MIN_LENGTH} caractères. Une phrase de plusieurs
            mots convient très bien.
          </>
        ) : value.length < PASSWORD_MIN_LENGTH ? (
          <>
            {gauge.label} : encore {PASSWORD_MIN_LENGTH - value.length}{' '}
            caractère{PASSWORD_MIN_LENGTH - value.length > 1 ? 's' : ''}.
          </>
        ) : (
          <>
            <Check size={13} aria-hidden="true" className="text-ok" />
            {gauge.label}
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Changement de mot de passe. L'actuel est redemandé : une session ouverte ne
 * suffit pas. Les règles (longueur, différent de l'actuel) sont vérifiées ici
 * pour guider, et revérifiées par l'API, dont les refus s'affichent sous les
 * champs. Un changement ferme les autres appareils — dit avant, confirmé après.
 */
export function PasswordForm({
  passwordChangedAt,
}: {
  passwordChangedAt: string | null | undefined;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [revealed, setRevealed] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: EMPTY_PASSWORD_FORM,
  });
  const newPassword = useWatch({ control, name: 'newPassword' }) ?? '';
  const toggle = () => setRevealed((value) => !value);

  async function submit(values: PasswordFormValues) {
    setFormError(null);
    try {
      const done = await changePassword(values);
      reset(EMPTY_PASSWORD_FORM);
      setRevealed(false);
      await queryClient.invalidateQueries({ queryKey: accountKey });
      const closed = done.sessionsClosed;
      toast.success('Mot de passe modifié', {
        description:
          closed > 0
            ? `${closed} autre${closed > 1 ? 's' : ''} appareil${closed > 1 ? 's ont été déconnectés' : ' a été déconnecté'}.`
            : 'Vous restez connecté sur cet appareil.',
      });
    } catch (error) {
      setFormError(applyApiErrors(error, { setError, fields: FIELDS }));
    }
  }

  return (
    <SettingsSection
      icon={KeyRound}
      tone="ing"
      title="Mot de passe"
      description={
        passwordChangedAt
          ? `Modifié ${relativeTime(passwordChangedAt)}. Un changement déconnecte vos autres appareils.`
          : 'Jamais modifié depuis l’activation du compte. Un changement déconnecte vos autres appareils.'
      }
    >
      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        aria-label="Changer le mot de passe"
        className="space-y-5"
      >
        {formError && <FormAlert>{formError}</FormAlert>}

        <Field
          label="Mot de passe actuel"
          required
          error={errors.currentPassword?.message}
          className="sm:max-w-[calc(50%-0.625rem)]"
        >
          <PasswordInput
            autoComplete="current-password"
            revealed={revealed}
            onToggle={toggle}
            {...register('currentPassword')}
          />
        </Field>

        <div className="grid items-start gap-5 sm:grid-cols-2">
          <div className="space-y-1">
            <Field
              label="Nouveau mot de passe"
              required
              error={errors.newPassword?.message}
            >
              <PasswordInput
                autoComplete="new-password"
                revealed={revealed}
                onToggle={toggle}
                onKeyDown={(event) =>
                  setCapsLock(event.getModifierState('CapsLock'))
                }
                onKeyUp={(event) =>
                  setCapsLock(event.getModifierState('CapsLock'))
                }
                {...register('newPassword', {
                  onBlur: () => setCapsLock(false),
                })}
              />
            </Field>
            <PasswordGauge value={newPassword} />
            {capsLock && (
              <p className="flex items-center gap-1.5 text-xs text-warn">
                <TriangleAlert size={13} aria-hidden="true" />
                Verrouillage majuscules activé.
              </p>
            )}
          </div>
          <Field
            label="Confirmer le nouveau mot de passe"
            required
            error={errors.confirmation?.message}
          >
            <PasswordInput
              autoComplete="new-password"
              revealed={revealed}
              onToggle={toggle}
              {...register('confirmation')}
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          {isDirty && (
            <Button
              variant="ghost"
              onClick={() => {
                reset(EMPTY_PASSWORD_FORM);
                setFormError(null);
              }}
              disabled={isSubmitting}
            >
              Effacer
            </Button>
          )}
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Changer le mot de passe
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
