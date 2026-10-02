'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { backendJson, describeError } from '@/lib/api/backend';
import { imageProblem, type MediaItem } from '@/lib/admin/media';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error';

export interface UploadItem {
  key: number;
  file: File;
  status: UploadStatus;
  /** Raison du refus ou de l'échec, rédigée pour l'utilisateur. */
  error?: string;
  /** Une nouvelle tentative a un sens (réseau, serveur) — pas pour un fichier refusé. */
  retryable?: boolean;
}

/** Envois simultanés : assez pour aller vite, peu pour rester sous la limite de débit de l'API. */
const CONCURRENCY = 2;

/**
 * File d'envoi des images vers la médiathèque (`POST /admin/media`, une
 * requête par image). Chaque fichier est contrôlé avant envoi (type, poids),
 * puis son sort est suivi séparément : un refus n'arrête pas les autres, et un
 * échec réseau se relance fichier par fichier.
 */
export function useMediaUpload() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<UploadItem[]>([]);
  // Fichiers déjà partis : l'effet de démarrage ne doit jamais en envoyer un deux fois.
  const started = useRef(new Set<number>());
  const nextKey = useRef(1);

  const patch = useCallback((key: number, change: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...change } : item)),
    );
  }, []);

  const send = useCallback(
    async (item: UploadItem) => {
      try {
        const data = new FormData();
        data.append('file', item.file);
        await backendJson<MediaItem>('admin/media', {
          method: 'POST',
          body: data,
        });
        patch(item.key, { status: 'done' });
        void queryClient.invalidateQueries({ queryKey: ['media'] });
      } catch (error) {
        const info = describeError(error);
        patch(item.key, {
          status: 'error',
          error: info.message,
          retryable: info.retryable,
        });
      }
    },
    [patch, queryClient],
  );

  useEffect(() => {
    const running = items.filter((i) => i.status === 'uploading').length;
    const next = items
      .filter((i) => i.status === 'queued' && !started.current.has(i.key))
      .slice(0, Math.max(0, CONCURRENCY - running));
    for (const item of next) {
      started.current.add(item.key);
      patch(item.key, { status: 'uploading' });
      void send(item);
    }
  }, [items, patch, send]);

  const add = useCallback((files: File[]) => {
    const added = files.map<UploadItem>((file) => {
      const problem = imageProblem(file);
      return {
        key: nextKey.current++,
        file,
        status: problem ? 'error' : 'queued',
        error: problem ?? undefined,
      };
    });
    setItems((current) => [...current, ...added]);
  }, []);

  const retry = useCallback(
    (key: number) => {
      started.current.delete(key);
      patch(key, { status: 'queued', error: undefined, retryable: undefined });
    },
    [patch],
  );

  const dismiss = useCallback((key: number) => {
    setItems((current) => current.filter((item) => item.key !== key));
  }, []);

  /** Ferme le suivi : retire tout ce qui est terminé (réussi ou refusé), garde ce qui est en cours. */
  const clearAll = useCallback(() => {
    setItems((current) =>
      current.filter(
        (item) => item.status === 'queued' || item.status === 'uploading',
      ),
    );
  }, []);

  return { items, add, retry, dismiss, clearAll };
}
