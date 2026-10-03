'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  TriangleAlert,
} from 'lucide-react';

const inputClasses =
  'h-12 w-full rounded-control border border-border bg-surface-elevated pl-11 pr-4 text-sm text-sand outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/15 aria-invalid:border-danger aria-invalid:focus:ring-danger/15';

/**
 * Messages affichés selon le statut renvoyé par le BFF. Le 401 reste
 * volontairement générique (jamais « e-mail inconnu » vs « mot de passe
 * erroné ») pour ne pas permettre l'énumération de comptes
 * (blueprint/10_Security.md §4).
 */
function messageForStatus(
  status: number,
  apiMessage?: string,
  code?: string,
): string {
  // Verrouillage : le message dit combien de temps attendre (même texte pour toute adresse).
  if (code === 'LOGIN_LOCKED' && apiMessage) return apiMessage;
  if (status === 429) {
    return 'Trop de tentatives. Patientez quelques instants avant de réessayer.';
  }
  if (status >= 500) {
    return 'Le service de connexion est momentanément indisponible. Réessayez dans un instant.';
  }
  return apiMessage ?? 'Connexion impossible. Vérifiez vos identifiants.';
}

interface LoginFormProps {
  /** Destination après connexion, déjà validée côté serveur (`safeAdminRedirect`). */
  redirectTo: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState('CapsLock'));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(messageForStatus(res.status, data?.message, data?.code));
        setPending(false);
        return;
      }

      // `pending` reste vrai jusqu'à la navigation : pas de flash du formulaire.
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError(
        'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.',
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={pending}>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-sand">
          Adresse e-mail
        </label>
        <div className="relative">
          <Mail
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            required
            autoFocus
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
            className={inputClasses}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-sand">
          Mot de passe
        </label>
        <div className="relative">
          <KeyRound
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={handleKey}
            onKeyUp={handleKey}
            onBlur={() => setCapsLock(false)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
            className={`${inputClasses} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={
              showPassword
                ? 'Masquer le mot de passe'
                : 'Afficher le mot de passe'
            }
            aria-pressed={showPassword}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface hover:text-sand focus-visible:outline-2 focus-visible:outline-primary"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {capsLock && (
          <p className="flex items-center gap-1.5 text-xs text-warning">
            <TriangleAlert size={13} aria-hidden="true" />
            Verrouillage majuscules activé.
          </p>
        )}
      </div>

      {error && (
        <div
          id="login-error"
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
            Connexion en cours…
          </>
        ) : (
          <>
            Se connecter
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
