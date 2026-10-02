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

const SESSION_EXPIRED = {
  code: 'TOKEN_INVALID',
  message: 'Session expirée, merci de vous reconnecter.',
  details: [],
};

/** Rotation silencieuse appelée par `src/lib/api/admin-fetch.ts` sur un 401. */
export async function POST() {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json(SESSION_EXPIRED, { status: 401 });
  }

  const apiRes = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await clientContextHeaders()),
    },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await apiRes.json().catch(() => null);

  if (!apiRes.ok || !data) {
    jar.delete(ACCESS_TOKEN_COOKIE);
    jar.delete(REFRESH_TOKEN_COOKIE);
    return NextResponse.json(data ?? SESSION_EXPIRED, {
      status: apiRes.status || 401,
    });
  }

  const options = authCookieOptions();
  jar.set(ACCESS_TOKEN_COOKIE, data.accessToken, options);
  jar.set(REFRESH_TOKEN_COOKIE, data.refreshToken, options);

  return NextResponse.json({ ok: true });
}
