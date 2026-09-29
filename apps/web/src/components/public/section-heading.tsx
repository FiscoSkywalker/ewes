import type { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: 'left' | 'center';
  /** `night` : sur fond nuit (sections d'impact). */
  tone?: 'light' | 'night';
  className?: string;
}

/**
 * En-tête de section réutilisé sur toutes les pages publiques
 * (blueprint/05_UI_UX_System.md §4). Le titre est révélé ligne par ligne au
 * défilement (`data-split`, voir `ScrollAnimations`) ; la couleur de
 * l'eyebrow suit le pôle de la section (`--pole`).
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  tone = 'light',
  className = '',
}: SectionHeadingProps) {
  const night = tone === 'night';

  return (
    <div
      className={`${align === 'center' ? 'mx-auto text-center' : ''} ${className}`}
    >
      <div
        className={`eyebrow mb-5 ${align === 'center' ? 'justify-center' : ''}`}
        data-reveal
      >
        {eyebrow}
      </div>
      <h2
        className={`section-title text-4xl sm:text-5xl lg:text-7xl ${night ? 'text-on-night' : 'text-sand'}`}
        data-split
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-6 max-w-2xl text-sm leading-7 sm:text-base ${night ? 'text-on-night-muted' : 'text-sand/72'} ${align === 'center' ? 'mx-auto' : ''}`}
          data-reveal
        >
          {description}
        </p>
      )}
    </div>
  );
}
