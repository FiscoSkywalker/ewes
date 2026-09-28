let refreshPromise: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  refreshPromise ??= fetch('/api/auth/refresh', { method: 'POST' })
    .then((res) => res.ok)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

/**
 * Fetch client pour les routes BFF du portail admin (`/api/...`). Sur un 401,
 * tente une seule rotation silencieuse du jeton (`/api/auth/refresh`) avant
 * d'abandonner — l'appelant (TanStack Query) traite alors l'échec comme non
 * authentifié et redirige vers `/admin/login`.
 */
export async function adminFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status !== 401) {
    return response;
  }

  const refreshed = await tryRefresh();
  if (!refreshed) {
    return response;
  }

  return fetch(input, init);
}
