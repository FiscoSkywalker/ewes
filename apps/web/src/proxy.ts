import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { REFRESH_TOKEN_COOKIE } from './lib/auth/cookie-names';

const intlMiddleware = createMiddleware(routing);
const ADMIN_LOGIN_PATH = '/admin/login';
/** Pages publiques du portail : connexion et activation d'un compte invité (le lien de l'e-mail tient lieu de preuve). */
const ADMIN_PUBLIC_PATHS = new Set([ADMIN_LOGIN_PATH, '/admin/invitation']);

/**
 * Point d'entrée unique du proxy Next.js (une seule instance autorisée —
 * voir la doc "middleware to proxy" de Next 16). `/admin/**` n'est pas
 * localisé (outil interne francophone, blueprint/06_Application_Architecture.md
 * §2) : on lui applique la garde de session plutôt que le routing next-intl.
 *
 * Garde de premier niveau (blueprint/10_Security.md §5,
 * blueprint/16_Rendering_State_Strategy.md §3) : vérifie uniquement la
 * présence du cookie de session, jamais sa validité (pas de vérification de
 * signature JWT ici, volontairement — runtime Edge). L'autorisation réelle
 * (rôle, expiration, révocation) est retranchée à chaque appel API par les
 * guards NestJS ; un contournement de ce proxy seul ne suffit jamais à
 * accéder à une ressource protégée.
 */
export default function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return adminSessionGuard(request);
  }

  return intlMiddleware(request);
}

function adminSessionGuard(request: NextRequest) {
  if (ADMIN_PUBLIC_PATHS.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(REFRESH_TOKEN_COOKIE);
  if (!hasSession) {
    // Mémorise la page demandée pour y revenir après connexion (validée côté
    // page de connexion par `safeAdminRedirect`).
    const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
    const { pathname, search } = request.nextUrl;
    if (pathname !== '/admin')
      loginUrl.searchParams.set('next', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
