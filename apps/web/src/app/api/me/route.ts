import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clientContextHeaders } from '@/lib/api/client-context';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/cookies';

const API_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api/v1';

/**
 * Proxy BFF vers `GET /me` (NestJS) : le jeton d'accès (cookie httpOnly)
 * n'est jamais lu par le JavaScript client, seul ce handler serveur y accède
 * pour construire l'en-tête `Authorization`.
 */
export async function GET() {
  const jar = await cookies();
  const accessToken = jar.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Non authentifié.', details: [] },
      { status: 401 },
    );
  }

  const apiRes = await fetch(`${API_URL}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(await clientContextHeaders()),
    },
  });
  const data = await apiRes.json().catch(() => null);

  return NextResponse.json(data, { status: apiRes.status });
}
