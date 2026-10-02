'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';
import { useToast } from './toast';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

/** Connexion réseau du navigateur (toujours « en ligne » au rendu serveur). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/**
 * Bannière hors connexion (blueprint/05_UI_UX_System.md §4) : prévient que
 * les données peuvent dater et que les enregistrements échoueront ; annonce
 * le retour du réseau (les données se rechargent alors d'elles-mêmes).
 */
export function NetworkBanner() {
  const online = useOnline();
  const toast = useToast();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
    } else if (wasOffline.current) {
      wasOffline.current = false;
      toast.success('Connexion rétablie', {
        description: 'Les données affichées sont mises à jour.',
      });
    }
  }, [online, toast]);

  if (online) return null;
  return <OfflineNotice />;
}

/** Contenu de la bannière hors connexion (affiché seul dans le catalogue). */
export function OfflineNotice() {
  return (
    <div
      role="alert"
      className="animate-fade-in flex items-center gap-3 border-b border-warn/25 bg-warn-soft px-4 py-2.5 text-[13px] text-ink sm:px-6"
    >
      <WifiOff size={16} aria-hidden="true" className="shrink-0 text-warn" />
      <p>
        <strong className="font-semibold">Vous êtes hors connexion.</strong>{' '}
        <span className="text-ink-muted">
          Les informations affichées peuvent ne plus être à jour et les
          enregistrements échoueront jusqu’au retour du réseau.
        </span>
      </p>
    </div>
  );
}
