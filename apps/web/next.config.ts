import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Nécessaire pour la scène WebGL de la page d'Accueil (three.js/R3F/drei).
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
};

export default withNextIntl(nextConfig);
