import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Le portail d'administration et l'espace documentaire privé (/admin/**)
 * ne sont pas localisés (outil interne, francophone) et sont donc exclus
 * du routing de langue — voir blueprint/06_Application_Architecture.md §2.
 * La protection d'accès (authentification) de /admin/** sera ajoutée en
 * Phase 04 (blueprint/21_Backlog_and_Session_Handoff.md).
 */
export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|admin|_next|_vercel|.*\\..*).*)'],
};
