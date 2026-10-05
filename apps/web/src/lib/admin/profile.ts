import { z } from 'zod';
import { backendJson } from '@/lib/api/backend';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './users';
import type { Role } from './roles';

/** `GET /me` et réponses de `PATCH /me`, `PUT`/`DELETE /me/avatar`. */
export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  /** Identifiant de la photo actuelle, `null` sans photo ; change à chaque nouvelle photo. */
  avatarVersion: string | null;
}

export interface AccountSession {
  id: string;
  /** « Chrome sur Windows » (formulé par l'API, jamais l'en-tête brut). */
  device: string;
  ipAddress: string | null;
  lastActiveAt: string;
  expiresAt: string;
  /** L'appareil utilisé en ce moment. */
  current: boolean;
}

/** `GET /me/account`. */
export interface Account {
  createdAt: string;
  passwordChangedAt: string | null;
  sessions: AccountSession[];
}

export const accountKey = ['profile', 'account'] as const;

/** Photo enregistrée : carré de ce côté (px), comme l'API. */
export const AVATAR_OUTPUT_SIZE = 512;

/** Types d'image que l'API accepte ; elle juge de toute façon sur le contenu. */
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Photo source : plus large que la limite de l'API (5 Mo), car seule la version recadrée part. */
export const AVATAR_MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/** Mêmes limites que l'API (`UpdateProfileDto`) ; l'API revérifie tout. */
export const nameSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Le nom est obligatoire.')
    .max(120, '120 caractères au plus.'),
});

export type NameFormValues = z.infer<typeof nameSchema>;

/** Mêmes règles que l'API (`ChangePasswordDto`) : la longueur prime, pas de règle de composition. */
export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Saisissez votre mot de passe actuel.'),
    newPassword: z
      .string()
      .min(
        PASSWORD_MIN_LENGTH,
        `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
      )
      .max(
        PASSWORD_MAX_LENGTH,
        `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`,
      ),
    confirmation: z.string().min(1, 'Confirmez le nouveau mot de passe.'),
  })
  .refine((values) => values.newPassword === values.confirmation, {
    path: ['confirmation'],
    message: 'Les deux mots de passe ne correspondent pas.',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'Le nouveau mot de passe doit être différent de l’actuel.',
  });

export type PasswordFormValues = z.infer<typeof passwordSchema>;

export const EMPTY_PASSWORD_FORM: PasswordFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmation: '',
};

export const updateName = (values: NameFormValues) =>
  backendJson<Profile>('me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });

export const changePassword = (values: PasswordFormValues) =>
  backendJson<{ passwordChangedAt: string; sessionsClosed: number }>(
    'me/password',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    },
  );

export function uploadAvatar(image: Blob) {
  const body = new FormData();
  body.append('file', image, 'avatar.webp');
  return backendJson<Profile>('me/avatar', { method: 'PUT', body });
}

export const removeAvatar = () =>
  backendJson<Profile>('me/avatar', { method: 'DELETE' });

export const closeSession = (id: string) =>
  backendJson<void>(`me/sessions/${id}`, { method: 'DELETE' });

export const closeOtherSessions = () =>
  backendJson<{ closed: number }>('me/sessions/revoke-others', {
    method: 'POST',
  });
