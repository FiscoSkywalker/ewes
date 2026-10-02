import { adminFetch } from './admin-fetch';

/** Erreur de l'API au format du contrat d'erreur (`{ code, message, details }`). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: unknown[] = [],
    /** Identifiant de corrélation de l'API, à communiquer au support. */
    readonly requestId?: string,
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
      typeof body?.requestId === 'string' ? body.requestId : undefined,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/**
 * Erreurs de validation par champ (`details: [{ field, messages }]`,
 * blueprint/08_API_Specification.md §2), prêtes à afficher sous chaque champ.
 */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const result: Record<string, string> = {};
  for (const detail of error.details) {
    const { field, messages } = (detail ?? {}) as {
      field?: unknown;
      messages?: unknown;
    };
    if (typeof field !== 'string' || !Array.isArray(messages)) continue;
    const first = messages.find((m): m is string => typeof m === 'string');
    if (first && !result[field]) result[field] = first;
  }
  return result;
}

export interface ErrorDescription {
  title: string;
  message: string;
  /** Une nouvelle tentative a des chances d'aboutir (réseau, serveur). */
  retryable: boolean;
  requestId?: string;
}

/**
 * Message compréhensible par un utilisateur non technique, choisi d'après le
 * statut et le code — jamais d'après le texte de l'erreur (blueprint/08 §2).
 */
export function describeError(error: unknown): ErrorDescription {
  if (!(error instanceof ApiError)) {
    return {
      title: 'Une erreur inattendue est survenue',
      message:
        'Réessayez. Si le problème persiste, contactez l’administrateur du portail.',
      retryable: true,
    };
  }
  const { status, requestId } = error;
  if (status === 0) {
    return {
      title: 'Connexion impossible',
      message: 'Vérifiez votre connexion internet, puis réessayez.',
      retryable: true,
    };
  }
  if (status === 401) {
    return {
      title: 'Session expirée',
      message: 'Reconnectez-vous pour continuer.',
      retryable: false,
      requestId,
    };
  }
  if (status === 403) {
    return {
      title: 'Action non autorisée',
      message: 'Vos droits ne permettent pas cette action.',
      retryable: false,
      requestId,
    };
  }
  if (status === 404) {
    return {
      title: 'Élément introuvable',
      message: 'Il a peut-être été supprimé ou déplacé.',
      retryable: false,
      requestId,
    };
  }
  if (status === 429) {
    return {
      title: 'Trop de demandes',
      message: 'Patientez quelques instants avant de réessayer.',
      retryable: true,
      requestId,
    };
  }
  if (status >= 500) {
    return {
      title: 'Le serveur rencontre un problème',
      message:
        'Réessayez dans un instant. Vos données déjà enregistrées ne sont pas affectées.',
      retryable: true,
      requestId,
    };
  }
  // 400, 409… : le message de l'API est rédigé pour l'utilisateur.
  return {
    title: 'Action impossible',
    message: error.message,
    retryable: false,
    requestId,
  };
}
