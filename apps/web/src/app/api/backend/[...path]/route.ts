import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { clientContextHeaders } from '@/lib/api/client-context';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/cookies';

const API_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api/v1';

/** Un segment de chemin ne peut ni remonter (`..`) ni changer d'hôte. */
const SAFE_SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;

const FORWARDED_REQUEST_HEADERS = ['accept', 'content-type', 'idempotency-key'];
const FORWARDED_RESPONSE_HEADERS = [
  'cache-control',
  'content-disposition',
  'content-length',
  'content-type',
  'x-content-type-options',
];
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function error(status: number, code: string, message: string) {
  return NextResponse.json({ code, message, details: [] }, { status });
}

/**
 * Défense en profondeur contre le CSRF, en plus de `SameSite=Lax` des cookies
 * de session : une mutation doit venir d'une page de ce même site.
 */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get('host');
  } catch {
    return false;
  }
}

/**
 * Proxy BFF générique du portail vers l'API NestJS : `/api/backend/<chemin>`
 * → `${API_URL}/<chemin>`, avec le jeton d'accès lu dans le cookie httpOnly
 * (jamais exposé au JavaScript du navigateur, blueprint/10_Security.md §4).
 *
 * Ce proxy n'autorise rien par lui-même : rôle, droits documentaires et
 * expiration du jeton sont vérifiés par les guards NestJS à chaque appel. Un
 * 401 remonte tel quel au client, qui tente alors une seule rotation du
 * jeton (`src/lib/api/admin-fetch.ts`).
 */
async function forward(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (!path.length || !path.every((segment) => SAFE_SEGMENT.test(segment))) {
    return error(400, 'BAD_REQUEST', 'Chemin invalide.');
  }
  if (MUTATING_METHODS.has(request.method) && !isSameOrigin(request)) {
    return error(403, 'FORBIDDEN', 'Origine de la requête non autorisée.');
  }

  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return error(401, 'UNAUTHORIZED', 'Non authentifié.');
  }

  const headers = new Headers({
    ...(await clientContextHeaders()),
    Authorization: `Bearer ${accessToken}`,
  });
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
    cache: 'no-store',
    redirect: 'manual',
    // Corps transmis en flux (téléversements jusqu'à 25 Mo sans tampon).
    ...(hasBody && { body: request.body, duplex: 'half' }),
  };

  let upstream: Response;
  try {
    upstream = await fetch(
      `${API_URL}/${path.join('/')}${request.nextUrl.search}`,
      init,
    );
  } catch {
    return error(
      502,
      'UPSTREAM_UNAVAILABLE',
      'Le serveur est momentanément injoignable. Réessayez dans un instant.',
    );
  }

  const responseHeaders = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  if (!responseHeaders.has('cache-control')) {
    responseHeaders.set('cache-control', 'private, no-store');
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export {
  forward as GET,
  forward as POST,
  forward as PUT,
  forward as PATCH,
  forward as DELETE,
};
