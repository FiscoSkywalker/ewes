import { adminFetch } from './admin-fetch';

/** Erreur de l'API au format du contrat d'erreur (`{ code, message, details }`). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Réponse paginée des listes de l'API (`{ data, meta }`). */
export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

/**
 * Appel JSON à l'API NestJS depuis le portail, via le proxy BFF
 * `/api/backend/...` (le jeton reste dans un cookie httpOnly). `path` est le
 * chemin de l'API sans préfixe, ex. `admin/contacts?status=NOUVEAU`.
 */
export async function backendJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await adminFetch(`/api/backend/${path}`, init);
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Connexion au serveur impossible.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.code ?? 'UNKNOWN_ERROR',
      body?.message ?? 'Une erreur est survenue.',
      Array.isArray(body?.details) ? body.details : [],
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
