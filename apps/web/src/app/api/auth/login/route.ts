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

/**
 * Proxy BFF vers `POST /auth/login` (NestJS) : les jetons ne transitent
 * jamais côté client, ils sont posés en cookies httpOnly ici même
 * (blueprint/10_Security.md §4 — pas de jeton exposé au JS du navigateur).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json(
      {
        code: 'BAD_REQUEST',
        message: 'E-mail et mot de passe requis.',
        details: [],
      },
      { status: 400 },
    );
  }

  const jar = await cookies();
  // La session que ce navigateur détient encore est fermée par l'API une fois la
  // nouvelle ouverte : une reconnexion ne laisse pas d'appareil fantôme.
  const replacesRefreshToken = jar.get(REFRESH_TOKEN_COOKIE)?.value;

  const apiRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await clientContextHeaders()),
    },
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      replacesRefreshToken,
    }),
  });
  const data = await apiRes.json().catch(() => null);

  if (!apiRes.ok || !data) {
    return NextResponse.json(
      data ?? {
        code: 'UPSTREAM_ERROR',
        message: "Service d'authentification indisponible.",
        details: [],
      },
      { status: apiRes.status || 502 },
    );
  }

  const options = authCookieOptions();
  jar.set(ACCESS_TOKEN_COOKIE, data.accessToken, options);
  jar.set(REFRESH_TOKEN_COOKIE, data.refreshToken, options);

  return NextResponse.json({ user: data.user });
}
