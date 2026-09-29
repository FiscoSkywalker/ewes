import type { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
}

/**
 * En-tête de section réutilisé sur toutes les pages publiques
 * (blueprint/05_UI_UX_System.md §4) — identité visuelle du prototype
 * immersif portée sur l'ensemble du site, pas seulement l'Accueil.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className = '',
}: SectionHeadingProps) {
  return (
    <div
      className={`${align === 'center' ? 'mx-auto text-center' : ''} ${className}`}
      data-reveal
    >
      <div
        className={`eyebrow mb-5 ${align === 'center' ? 'justify-center' : ''}`}
      >
        {eyebrow}
      </div>
      <h2 className="section-title text-4xl text-sand sm:text-5xl lg:text-7xl">
        {title}
      </h2>
      {description && (
        <p className="mt-6 max-w-2xl text-sm leading-7 text-sand/72 sm:text-base">
          {description}
        </p>
      )}
    </div>
  );
}
