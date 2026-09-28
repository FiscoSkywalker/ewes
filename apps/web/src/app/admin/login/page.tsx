'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? 'Connexion impossible.');
        return;
      }

      router.replace('/admin');
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6"
      >
        <h1 className="text-lg font-semibold text-(--color-text)">
          Portail EWES — Connexion
        </h1>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm text-(--color-text-muted)">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-text)"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="text-sm text-(--color-text-muted)"
          >
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-text)"
          />
        </div>

        {error && <p className="text-sm text-(--color-danger)">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-(--radius-control) bg-(--color-primary) px-3 py-2 text-sm font-medium text-(--color-primary-foreground) disabled:opacity-60"
        >
          {pending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
