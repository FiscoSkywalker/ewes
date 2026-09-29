'use client';

import { useState, useEffect } from 'react';

export interface ScrollState {
  progress: number;
  velocity: number;
  sectionIndex: number;
}

export function useScrollProgress(): ScrollState {
  const [scrollState, setScrollState] = useState<ScrollState>({
    progress: 0,
    velocity: 0,
    sectionIndex: 0,
  });

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let lastTime = performance.now();

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        maxScroll > 0 ? Math.min(Math.max(scrollY / maxScroll, 0), 1) : 0;

      const currentTime = performance.now();
      const deltaY = scrollY - lastScrollY;
      const deltaTime = Math.max(currentTime - lastTime, 1);
      const velocity = deltaY / deltaTime;

      lastScrollY = scrollY;
      lastTime = currentTime;

      // Resolve the active editorial section from its real position. This remains
      // accurate when content height changes across languages and breakpoints.
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>('[data-section-index]'),
      );
      let sectionIndex = 0;
      const activationLine = window.innerHeight * 0.42;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= activationLine) {
          sectionIndex = Number(section.dataset.sectionIndex ?? 0);
        }
      });

      setScrollState({
        progress,
        velocity,
        sectionIndex,
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollState;
}
