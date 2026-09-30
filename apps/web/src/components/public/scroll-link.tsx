'use client';

import type { MouseEvent, ReactNode } from 'react';
import { scrollToElement } from '@/lib/smooth-scroll';

interface ScrollLinkProps {
  /** Identifiant de la section cible, sans `#`. */
  target: string;
  className?: string;
  children: ReactNode;
}

/**
 * Lien d'ancre interne défilant via Lenis (un saut natif vers `#id` casse le
 * lissage). Reste un vrai `<a href="#id">` : fonctionne sans JavaScript.
 */
export function ScrollLink({ target, className, children }: ScrollLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const element = document.getElementById(target);
    if (!element) return;
    event.preventDefault();
    scrollToElement(element, { offset: -96 });
  };

  return (
    <a href={`#${target}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
