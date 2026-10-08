import { join } from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** Base de l'API NestJS (déjà utilisée par les routes BFF et les lectures serveur). */
const API_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api/v1';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Image Docker (apps/web/Dockerfile) : sortie « standalone », qui n'embarque que
 * les fichiers utiles à l'exécution. Activée par variable pour ne rien changer au
 * développement ni au build local (sous Windows elle exige des liens symboliques).
 */
const isStandalone = process.env.NEXT_OUTPUT === 'standalone';

/**
 * Politique de contenu (blueprint/10_Security.md §3). Les scripts et styles
 * « inline » restent admis : Next en injecte pour l'hydratation, et un CSP à
 * jeton (nonce) obligerait chaque page à être rendue à la demande, ce qui ruine
 * le SSG/ISR du site public. Le reste est verrouillé : tout vient de la même
 * origine, aucun plugin, aucun cadrage du site, formulaires vers lui seul.
 * `blob:` : aperçu PDF et photo de profil du portail, fabriqués côté client.
 * `unsafe-eval` et `ws:` ne servent qu'au serveur de développement.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isProduction ? '' : ' ws: wss:'}`,
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  // HTTPS uniquement (Nginx fait la redirection HTTP -> HTTPS) ; sans
  // includeSubDomains ni preload tant que le domaine définitif n'est pas arrêté.
  ...(isProduction
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }]
    : []),
];

const nextConfig: NextConfig = {
  // Ne pas annoncer « Next.js » dans chaque réponse.
  poweredByHeader: false,
  ...(isStandalone && {
    output: 'standalone' as const,
    // Monorepo npm : les dépendances sont installées à la racine du dépôt.
    outputFileTracingRoot: join(process.cwd(), '../../'),
  }),
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Images téléversées depuis le portail : servies par l'API, exposées en
  // même origine (`/uploads/<fichier>`) pour que next/image et le cache les
  // traitent comme des ressources locales.
  async rewrites() {
    return [
      { source: '/uploads/:name', destination: `${API_URL}/media/:name` },
      // PDF des documents publics, téléchargés en même origine.
      {
        source: '/files/:name',
        destination: `${API_URL}/documents-publics/files/:name`,
      },
    ];
  },
  // Nécessaire pour la scène WebGL de la page d'Accueil (three.js/R3F/drei).
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
};

export default withNextIntl(nextConfig);
