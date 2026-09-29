'use client';

import { useState, useEffect } from 'react';

export interface DeviceProfile {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  dpr: number;
  particleMultiplier: number;
}

export function useResponsive(): DeviceProfile {
  const [profile, setProfile] = useState<DeviceProfile>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouch: false,
    dpr: 1,
    particleMultiplier: 1,
  });

  useEffect(() => {
    const updateProfile = () => {
      const width = window.innerWidth;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
      const particleMultiplier = isMobile ? 0.35 : isTablet ? 0.65 : 1.0;

      setProfile({
        isMobile,
        isTablet,
        isDesktop,
        isTouch,
        dpr,
        particleMultiplier,
      });
    };

    updateProfile();
    window.addEventListener('resize', updateProfile);
    return () => window.removeEventListener('resize', updateProfile);
  }, []);

  return profile;
}
