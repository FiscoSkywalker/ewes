import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** Base de l'API NestJS (déjà utilisée par les routes BFF et les lectures serveur). */
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const nextConfig: NextConfig = {
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
