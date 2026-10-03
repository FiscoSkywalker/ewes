import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clientContextHeaders } from '@/lib/api/client-context';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  authCookieOptions,
} from '@/lib/auth/cookies';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const BAD_REQUEST = {
  code: 'BAD_REQUEST',
  message: 'Requête invalide.',
  details: [],
};

/**
 * Proxy BFF de la page d'activation d'un compte invité (`/admin/invitation`),
 * sans session préalable : `inspect` lit l'invitation, `accept` crée le
 * compte puis pose les cookies httpOnly de session — comme la connexion, les
 * jetons ne transitent jamais côté navigateur (blueprint/10_Security.md §4).
 */
export async function POST(request: Request) {
  // Défense en profondeur contre le CSRF, en plus de `SameSite=Lax`.
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get('host')) {
        return NextResponse.json(
          {
            code: 'FORBIDDEN',
            message: 'Origine de la requête non autorisée.',
            details: [],
          },
          { status: 403 },
        );
      }
    } catch {
      return NextResponse.json(BAD_REQUEST, { status: 400 });
    }
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (
    (action !== 'inspect' && action !== 'accept') ||
    typeof body?.token !== 'string' ||
    (action === 'accept' && typeof body?.password !== 'string')
  ) {
    return NextResponse.json(BAD_REQUEST, { status: 400 });
  }

  let apiRes: Response;
  try {
    apiRes = await fetch(`${API_URL}/auth/invitations/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await clientContextHeaders()),
      },
      body: JSON.stringify(
        action === 'accept'
          ? { token: body.token, password: body.password }
          : { token: body.token },
      ),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      {
        code: 'UPSTREAM_UNAVAILABLE',
        message:
          'Le serveur est momentanément injoignable. Réessayez dans un instant.',
        details: [],
      },
      { status: 502 },
    );
  }
  const data = await apiRes.json().catch(() => null);

  if (!apiRes.ok || !data) {
    return NextResponse.json(
      data ?? {
        code: 'UPSTREAM_ERROR',
        message: 'Service indisponible.',
        details: [],
      },
      { status: apiRes.status || 502 },
    );
  }

  if (action === 'inspect') return NextResponse.json(data);

  const jar = await cookies();
  const options = authCookieOptions();
  jar.set(ACCESS_TOKEN_COOKIE, data.accessToken, options);
  jar.set(REFRESH_TOKEN_COOKIE, data.refreshToken, options);
  return NextResponse.json({ user: data.user });
}
