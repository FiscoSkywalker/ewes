import type { NextFunction, Request, Response } from 'express';

/**
 * En-têtes de sécurité des réponses de l'API (blueprint/10_Security.md §3),
 * sans dépendance : l'API ne sert que du JSON et des fichiers, jamais une page.
 * Limité à `/api/v1` : l'interface Swagger (développement seulement) charge ses
 * propres scripts et ne doit pas recevoir cette politique.
 */
export function securityHeaders(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (request.path.startsWith('/api/v1')) {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'",
    );
  }
  next();
}
