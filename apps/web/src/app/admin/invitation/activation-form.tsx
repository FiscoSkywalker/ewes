'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogIn,
  MailX,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { ApiError, fieldErrors } from '@/lib/api/backend';
import { homePathFor, isRole, type Role } from '@/lib/admin/roles';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  ROLE_PROFILES,
  passwordGauge,
} from '@/lib/admin/users';

/** Mêmes classes que la connexion : les deux écrans sont de la même famille. */
const inputClasses =
  'h-12 w-full rounded-control border border-border bg-surface-elevated pl-11 pr-12 text-sm text-sand outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/15 aria-invalid:border-danger aria-invalid:focus:ring-danger/15';

const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

interface Preview {
  email: string;
  fullName: string;
  role: Role;
}

type Phase =
  | { name: 'loading' }
  | { name: 'ready'; token: string; preview: Preview }
  | { name: 'blocked'; reason: BlockReason };

type BlockReason = 'invalid' | 'expired' | 'used' | 'network';

async function post(body: object) {
  const response = await fetch('/api/auth/invitation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

export function ActivationForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const token = window.location.hash.slice(1);
    // Hors de l'effet synchrone : pas de mise à jour d'état en cascade au montage.
    void (async () => {
      if (!TOKEN_FORMAT.test(token)) {
        if (!cancelled) setPhase({ name: 'blocked', reason: 'invalid' });
        return;
      }
      try {
        const { response, data } = await post({ action: 'inspect', token });
        if (cancelled) return;
        if (response.ok && isRole(data?.role)) {
          setPhase({
            name: 'ready',
            token,
            preview: {
              email: data.email,
              fullName: data.fullName,
              role: data.role,
            },
          });
        } else if (data?.code === 'INVITATION_EXPIRED') {
          setPhase({ name: 'blocked', reason: 'expired' });
        } else if (data?.code === 'INVITATION_USED') {
          setPhase({ name: 'blocked', reason: 'used' });
        } else if (response.status >= 500 || response.status === 429) {
          setPhase({ name: 'blocked', reason: 'network' });
        } else {
          setPhase({ name: 'blocked', reason: 'invalid' });
        }
      } catch {
        if (!cancelled) setPhase({ name: 'blocked', reason: 'network' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase.name === 'loading') {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 py-16 text-sm text-muted"
      >
        <Loader2
          size={22}
          className="animate-spin text-primary"
          aria-hidden="true"
        />
        Vérification de votre invitation…
      </div>
    );
  }

  if (phase.name === 'blocked') return <Blocked reason={phase.reason} />;

  return (
    <Ready
      token={phase.token}
      preview={phase.preview}
      onDone={(role) => {
        router.replace(homePathFor(role));
        router.refresh();
      }}
    />
  );
}

const BLOCKED: Record<
  BlockReason,
  { icon: typeof MailX; title: string; text: string; login: boolean }
> = {
  invalid: {
    icon: MailX,
    title: 'Ce lien n’est pas valide',
    text: 'Il est peut-être incomplet, ou l’invitation a été retirée. Ouvrez le lien tel qu’il figure dans l’e-mail, ou demandez-en un nouveau à un administrateur.',
    login: false,
  },
  expired: {
    icon: Clock,
    title: 'Ce lien a expiré',
    text: 'Les invitations sont valables 7 jours. Demandez à un administrateur de vous en envoyer une nouvelle.',
    login: false,
  },
  used: {
    icon: ShieldCheck,
    title: 'Votre compte est déjà activé',
    text: 'Ce lien a déjà servi à choisir un mot de passe. Connectez-vous avec votre adresse e-mail.',
    login: true,
  },
  network: {
    icon: TriangleAlert,
    title: 'Service momentanément indisponible',
    text: 'Votre invitation n’est pas perdue : rechargez cette page dans un instant.',
    login: false,
  },
};

function Blocked({ reason }: { reason: BlockReason }) {
  const info = BLOCKED[reason];
  const Icon = info.icon;
  return (
    <div className="space-y-5 text-center" role="status">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon size={26} aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-sand">{info.title}</h2>
        <p className="text-sm leading-relaxed text-muted">{info.text}</p>
      </div>
      {info.login && (
        <Link
          href="/admin/login"
          className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary text-sm font-semibold text-primary-foreground shadow-[0_10px_28px_rgba(57,113,135,.28)] transition hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <LogIn size={17} aria-hidden="true" />
          Aller à la connexion
        </Link>
      )}
      {reason === 'network' && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-12 w-full items-center justify-center rounded-control border border-border bg-surface-elevated text-sm font-semibold text-sand transition hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Recharger la page
        </button>
      )}
    </div>
  );
}

function Ready({
  token,
  preview,
  onDone,
}: {
  token: string;
  preview: Preview;
  onDone: (role: Role) => void;
}) {
  const ids = useId();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const gauge = passwordGauge(password);
  const tooShort = password.length < PASSWORD_MIN_LENGTH;
  const mismatch = confirmation !== '' && confirmation !== password;
  // Trop court : c'est la jauge qui le dit (en rouge une fois la saisie quittée), pas un second message.
  const shownTooShort = touched && tooShort;
  const shownPasswordError = passwordError;
  const confirmError =
    (submitted && confirmation === ''
      ? 'Confirmez votre mot de passe.'
      : null) ??
    (mismatch ? 'Les deux mots de passe ne correspondent pas.' : null);
  const profile = ROLE_PROFILES[preview.role];
  const firstName = preview.fullName.trim().split(/\s+/)[0];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setTouched(true);
    setSubmitted(true);
    setError(null);
    setPasswordError(null);
    if (tooShort || password !== confirmation) return;

    setPending(true);
    try {
      const { response, data } = await post({
        action: 'accept',
        token,
        password,
      });
      if (response.ok && isRole(data?.user?.role)) {
        // `pending` reste vrai jusqu'à la navigation : pas de flash du formulaire.
        onDone(data.user.role);
        return;
      }
      const apiError = new ApiError(
        response.status,
        data?.code ?? 'UNKNOWN_ERROR',
        data?.message ?? '',
        Array.isArray(data?.details) ? data.details : [],
      );
      const placed = fieldErrors(apiError).password;
      if (placed) setPasswordError(placed);
      else if (response.status === 429) {
        setError(
          'Trop de tentatives. Patientez un instant avant de réessayer.',
        );
      } else if (response.status >= 500) {
        setError(
          'Le service est momentanément indisponible. Réessayez dans un instant.',
        );
      } else {
        setError(
          data?.message ??
            'Impossible d’activer le compte. Rechargez la page et réessayez.',
        );
      }
    } catch {
      setError(
        'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.',
      );
    }
    setPending(false);
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-5"
      aria-busy={pending}
    >
      <div className="space-y-1.5 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-sand">
          Bienvenue, {firstName}
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Choisissez un mot de passe pour activer votre compte.
        </p>
      </div>

      <dl className="space-y-3 rounded-control border border-border bg-surface/70 px-4 py-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Adresse e-mail</dt>
          <dd className="mt-0.5 break-words font-medium text-sand [overflow-wrap:anywhere]">
            {preview.email}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Rôle</dt>
          <dd className="mt-0.5 font-medium text-sand">{profile.label}</dd>
        </div>
      </dl>

      <div className="space-y-1.5">
        <label
          htmlFor={`${ids}-password`}
          className="text-sm font-medium text-sand"
        >
          Mot de passe
        </label>
        <div className="relative">
          <KeyRound
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            id={`${ids}-password`}
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            autoFocus
            required
            maxLength={PASSWORD_MAX_LENGTH}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setPasswordError(null);
            }}
            onKeyDown={(event) =>
              setCapsLock(event.getModifierState('CapsLock'))
            }
            onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
            onBlur={() => {
              setCapsLock(false);
              if (password !== '') setTouched(true);
            }}
            aria-invalid={
              shownPasswordError || shownTooShort ? true : undefined
            }
            aria-describedby={`${ids}-gauge${shownPasswordError ? ` ${ids}-password-error` : ''}`}
            className={inputClasses}
          />
          <button
            type="button"
            onClick={() => setShow((visible) => !visible)}
            aria-label={
              show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
            }
            aria-pressed={show}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface hover:text-sand focus-visible:outline-2 focus-visible:outline-primary"
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        {/* Jauge de longueur : segments + mot, jamais la couleur seule. */}
        <div id={`${ids}-gauge`} className="pt-1">
          <div className="flex gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((segment) => (
              <span
                key={segment}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  segment <= gauge.level
                    ? gauge.tone === 'bad'
                      ? 'bg-danger'
                      : gauge.tone === 'warn'
                        ? 'bg-warning'
                        : 'bg-success'
                    : 'bg-border'
                }`}
              />
            ))}
          </div>
          <p
            className={`mt-1.5 flex min-h-5 items-center gap-1.5 text-xs ${
              shownTooShort ? 'font-medium text-danger' : 'text-muted'
            }`}
            aria-live="polite"
          >
            {password === '' ? (
              <>
                Au moins {PASSWORD_MIN_LENGTH} caractères. Une phrase de
                plusieurs mots convient très bien.
              </>
            ) : tooShort ? (
              <>
                {gauge.label} : encore {PASSWORD_MIN_LENGTH - password.length}{' '}
                caractère{PASSWORD_MIN_LENGTH - password.length > 1 ? 's' : ''}.
              </>
            ) : (
              <>
                <Check size={13} className="text-success" aria-hidden="true" />
                {gauge.label}
              </>
            )}
          </p>
        </div>
        {shownPasswordError && (
          <p
            id={`${ids}-password-error`}
            className="flex items-center gap-1.5 text-xs font-medium text-danger"
          >
            <AlertCircle size={13} aria-hidden="true" />
            {shownPasswordError}
          </p>
        )}
        {capsLock && (
          <p className="flex items-center gap-1.5 text-xs text-warning">
            <TriangleAlert size={13} aria-hidden="true" />
            Verrouillage majuscules activé.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={`${ids}-confirmation`}
          className="text-sm font-medium text-sand"
        >
          Confirmer le mot de passe
        </label>
        <div className="relative">
          <KeyRound
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            id={`${ids}-confirmation`}
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            required
            maxLength={PASSWORD_MAX_LENGTH}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            aria-invalid={confirmError ? true : undefined}
            aria-describedby={
              confirmError ? `${ids}-confirmation-error` : undefined
            }
            className={inputClasses}
          />
        </div>
        {confirmError && (
          <p
            id={`${ids}-confirmation-error`}
            className="flex items-center gap-1.5 text-xs font-medium text-danger"
          >
            <AlertCircle size={13} aria-hidden="true" />
            {confirmError}
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-control border border-danger/25 bg-danger/8 px-4 py-3 text-sm text-danger"
        >
          <AlertCircle
            size={17}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <p>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="group flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary text-sm font-semibold text-primary-foreground shadow-[0_10px_28px_rgba(57,113,135,.28)] transition hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? (
          <>
            <Loader2 size={17} className="animate-spin" aria-hidden="true" />
            Activation en cours…
          </>
        ) : (
          <>
            Activer mon compte
            <ArrowRight
              size={17}
              className="transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </>
        )}
      </button>
    </form>
  );
}
