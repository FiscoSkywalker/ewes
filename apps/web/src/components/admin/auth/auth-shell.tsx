import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/public/brand-logo';
import { CardDecor } from './card-decor';

/**
 * Cadre des pages d'authentification du portail (connexion, activation d'un
 * compte invité) : le paysage brumeux du site public en plein cadre (mêmes
 * nuages qui dérivent que le hero) et une seule carte au centre. Composition
 * serveur ; seuls les formulaires placés dedans sont des composants client.
 *
 * `fixedHeight` : carte de hauteur fixe sur ordinateur (connexion, deux
 * champs). Sans, la carte grandit avec son contenu (activation : mot de
 * passe, confirmation, jauge) et la page défile si l'écran est court.
 */
export function AuthShell({
  title,
  fixedHeight = false,
  children,
}: {
  /** Titre de niveau 1, lu par les technologies d'assistance. */
  title: string;
  fixedHeight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main
      className={`relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background scheme-light px-5 py-10 text-sand ${
        fixedHeight ? 'md:h-dvh md:min-h-0 md:py-6' : ''
      }`}
    >
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src="/assets/images/ewes-hero-cinematic.webp"
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
        <div
          className={`relative flex flex-col justify-center rounded-sheet border border-white/70 bg-surface-elevated/80 px-8 shadow-[0_30px_90px_rgba(23,60,77,.22)] backdrop-blur-xl sm:px-10 ${
            fixedHeight
              ? 'min-h-[640px] pb-40 pt-16 md:h-[min(640px,calc(100dvh-6.5rem))] md:min-h-0 md:[@media(max-height:820px)]:pb-24 md:[@media(max-height:820px)]:pt-10'
              : 'pb-24 pt-12'
          }`}
        >
          <CardDecor />
          <div className="relative">
            <div
              className={`flex justify-center ${
                fixedHeight
                  ? 'mb-10 md:[@media(max-height:820px)]:mb-6'
                  : 'mb-7'
              }`}
            >
              <BrandLogo
                priority
                className={
                  fixedHeight
                    ? 'h-24 md:[@media(max-height:820px)]:h-16'
                    : 'h-16'
                }
              />
            </div>
            <h1 className="sr-only">{title}</h1>
            {children}
          </div>
        </div>

        <Link
          href="/"
          className={`mx-auto mt-6 flex w-fit items-center gap-2 text-sm font-medium text-sand/65 transition-colors hover:text-sand ${
            fixedHeight ? 'md:mt-4' : ''
          }`}
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Retour au site
        </Link>
      </div>
    </main>
  );
}
