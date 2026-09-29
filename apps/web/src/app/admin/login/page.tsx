import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/public/brand-logo';
import { safeAdminRedirect } from '@/lib/auth/safe-redirect';
import { CardDecor } from './card-decor';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Connexion | Portail EWES',
  // Page privée : ne pas l'indexer.
  robots: { index: false, follow: false },
};

/**
 * Page de connexion du portail (blueprint/14_Admin_Backoffice.md). Composition
 * serveur ; seul le formulaire (`LoginForm`) est un composant client
 * (blueprint/16_Rendering_State_Strategy.md §4). Volontairement minimale :
 * le paysage brumeux du site public en plein cadre (mêmes nuages qui
 * dérivent que le hero) et une seule carte au centre.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo = safeAdminRedirect(next);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-5 py-10 text-sand md:h-dvh md:min-h-0 md:py-6">
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src="/assets/images/ewes-hero-cinematic.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hero-cinematic-image object-cover"
        />
        <div className="hero-cloud hero-cloud-one" />
        <div className="hero-cloud hero-cloud-two" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(213,228,234,.55),rgba(213,228,234,.82)_70%)]" />
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="relative flex min-h-[640px] flex-col justify-center rounded-sheet border border-white/70 bg-surface-elevated/80 px-8 pb-40 pt-16 shadow-[0_30px_90px_rgba(23,60,77,.22)] backdrop-blur-xl sm:px-10 md:h-[min(640px,calc(100dvh-6.5rem))] md:min-h-0 md:[@media(max-height:820px)]:pb-24 md:[@media(max-height:820px)]:pt-10">
          <CardDecor />
          <div className="relative">
            <div className="mb-10 flex justify-center md:[@media(max-height:820px)]:mb-6">
              <BrandLogo
                priority
                className="h-24 md:[@media(max-height:820px)]:h-16"
              />
            </div>
            <h1 className="sr-only">Connexion au portail EWES</h1>
            <LoginForm redirectTo={redirectTo} />
          </div>
        </div>

        <Link
          href="/"
          className="mx-auto mt-6 flex w-fit md:mt-4 items-center gap-2 text-sm font-medium text-sand/65 transition-colors hover:text-sand"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Retour au site
        </Link>
      </div>
    </main>
  );
}
