'use client';

import { useState, useEffect } from 'react';

export interface DeviceProfile {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  /** Densité de pixels des canvas WebGL (plafonnée, voir plus bas). */
  dpr: number;
  particleMultiplier: number;
}

const DEFAULT_PROFILE: DeviceProfile = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isTouch: false,
  dpr: 1,
  particleMultiplier: 1,
};

function readProfile(): DeviceProfile {
  const width = window.innerWidth;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  return {
    isMobile,
    isTablet,
    isDesktop: width >= 1024,
    isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    // Les scènes WebGL couvrent toute la section : au-delà de 1,5 le coût
    // GPU (pixels à ombrer) explose pour un gain de netteté imperceptible
    // sous les voiles de lecture.
    dpr: Math.min(window.devicePixelRatio || 1, 1.5),
    particleMultiplier: isMobile ? 0.35 : isTablet ? 0.65 : 1.0,
  };
}

function sameProfile(a: DeviceProfile, b: DeviceProfile) {
  return (Object.keys(a) as (keyof DeviceProfile)[]).every(
    (key) => a[key] === b[key],
  );
}

/**
 * Profil d'appareil de l'Accueil. Ne déclenche un re-rendu que si une valeur
 * change réellement : sur mobile, la barre d'adresse qui se replie pendant
 * le défilement émet des `resize` en rafale (hauteur seule) — les relayer
 * re-rendait toute la page à chaque frame de défilement.
 */
export function useResponsive(): DeviceProfile {
  const [profile, setProfile] = useState<DeviceProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    const updateProfile = () => {
      const next = readProfile();
      setProfile((current) => (sameProfile(current, next) ? current : next));
    };

    updateProfile();
    window.addEventListener('resize', updateProfile);
    return () => window.removeEventListener('resize', updateProfile);
  }, []);

  return profile;
}
