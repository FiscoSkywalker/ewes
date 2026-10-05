'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { describeError } from '@/lib/api/backend';
import {
  invalidateDocs,
  privateFileProblem,
  uploadPrivateFile,
} from '@/lib/admin/private-docs';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error';

export interface PrivateUploadItem {
  key: number;
  file: File;
  /** Dossier de destination, figé au moment du dépôt (on peut naviguer pendant l'envoi). */
  folderId: string;
  folderName: string;
  status: UploadStatus;
  /** Part envoyée, de 0 à 1. */
  progress: number;
  /** Raison du refus ou de l'échec, rédigée pour l'utilisateur. */
  error?: string;
  /** Une nouvelle tentative a un sens (réseau, serveur) — pas pour un fichier refusé. */
  retryable?: boolean;
}

/** Peu d'envois simultanés : la bande passante se partage, et l'API limite le débit. */
const CONCURRENCY = 2;

/**
 * File de téléversement vers l'espace documentaire (`POST
 * /documents-prives/files`, une requête par fichier). Chaque fichier est
 * contrôlé avant envoi, puis suivi séparément avec son avancement réel : un
 * refus n'arrête pas les autres, un échec réseau se relance fichier par fichier.
 */
export function usePrivateUpload() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<PrivateUploadItem[]>([]);
  // Fichiers déjà partis : l'effet de démarrage ne doit jamais en envoyer un deux fois.
  const started = useRef(new Set<number>());
  const nextKey = useRef(1);

  const patch = useCallback(
    (key: number, change: Partial<PrivateUploadItem>) => {
      setItems((current) =>
        current.map((item) =>
          item.key === key ? { ...item, ...change } : item,
        ),
      );
    },
    [],
  );

  const send = useCallback(
    async (item: PrivateUploadItem) => {
      try {
        await uploadPrivateFile(
          () => {
            const data = new FormData();
            data.append('folderId', item.folderId);
            data.append('file', item.file);
            return data;
          },
          (progress) => patch(item.key, { progress }),
        );
        patch(item.key, { status: 'done', progress: 1 });
        void invalidateDocs(queryClient);
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

  const add = useCallback(
    (files: File[], folder: { id: string; name: string }) => {
      const added = files.map<PrivateUploadItem>((file) => {
        const problem = privateFileProblem(file);
        return {
          key: nextKey.current++,
          file,
          folderId: folder.id,
          folderName: folder.name,
          status: problem ? 'error' : 'queued',
          progress: 0,
          error: problem ?? undefined,
        };
      });
      setItems((current) => [...current, ...added]);
    },
    [],
  );

  const retry = useCallback(
    (key: number) => {
      started.current.delete(key);
      patch(key, {
        status: 'queued',
        progress: 0,
        error: undefined,
        retryable: undefined,
      });
    },
    [patch],
  );

  const dismiss = useCallback((key: number) => {
    setItems((current) => current.filter((item) => item.key !== key));
  }, []);

  /** Ferme le suivi : retire tout ce qui est terminé, garde ce qui est en cours. */
  const clearFinished = useCallback(() => {
    setItems((current) =>
      current.filter(
        (item) => item.status === 'queued' || item.status === 'uploading',
      ),
    );
  }, []);

  const busy = items.some(
    (item) => item.status === 'queued' || item.status === 'uploading',
  );

  return { items, add, retry, dismiss, clearFinished, busy };
}
