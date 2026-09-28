export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './cookie-names';

interface CookieOptions {
  httpOnly: boolean;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge: number;
}

/**
 * Options communes des cookies httpOnly de session (portail admin, BFF
 * `app/api/auth/*`). `maxAge` couvre la durée de vie du jeton de
 * rafraîchissement, pas celle du jeton d'accès qu'il accompagne : voir
 * `src/lib/api/admin-fetch.ts` pour la rotation silencieuse sur 401.
 */
export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Number(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS ?? 604_800),
  };
}
