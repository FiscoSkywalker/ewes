'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { backendJson } from '@/lib/api/backend';
import {
  downloadDocument,
  invalidateDocs,
  type PrivateDocument,
} from '@/lib/admin/private-docs';
import { useConfirm, useToast } from '../ui';

/**
 * Actions sur un document, communes à l'explorateur, à la recherche et aux
 * archives. Chaque action attend la réponse du serveur avant d'annoncer quoi
 * que ce soit : c'est lui qui vérifie le droit, à chaque fois.
 */
export function useDocumentActions() {
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const download = useCallback(
    async (document: PrivateDocument) => {
      setDownloadingId(document.id);
      try {
        await downloadDocument(document);
      } catch (error) {
        // Droit retiré entre-temps, fichier manquant… : le refus est dit, rien n'est simulé.
        toast.error(error);
        void invalidateDocs(queryClient);
      } finally {
        setDownloadingId(null);
      }
    },
    [toast, queryClient],
  );

  const setStatus = useCallback(
    async (document: PrivateDocument, action: 'archive' | 'restore') => {
      await backendJson(`documents-prives/files/${document.id}/${action}`, {
        method: 'POST',
      });
      await invalidateDocs(queryClient);
    },
    [queryClient],
  );

  const restore = useCallback(
    async (document: PrivateDocument): Promise<boolean> => {
      try {
        await setStatus(document, 'restore');
        toast.success('Document restauré', {
          description: document.folderName
            ? `De retour dans « ${document.folderName} »`
            : document.name,
        });
        return true;
      } catch (error) {
        toast.error(error);
        return false;
      }
    },
    [setStatus, toast],
  );

  const archive = useCallback(
    async (document: PrivateDocument): Promise<boolean> => {
      const done = await confirm({
        title: `Archiver « ${document.name} » ?`,
        description:
          'Le document quitte son dossier et rejoint les Archives. Il reste consultable par les personnes qui y ont accès, et peut être restauré à tout moment.',
        confirmLabel: 'Archiver',
        onConfirm: () => setStatus(document, 'archive'),
      });
      if (done) {
        toast.success('Document archivé', {
          description: document.name,
          action: { label: 'Annuler', onClick: () => void restore(document) },
        });
      }
      return done;
    },
    [confirm, setStatus, toast, restore],
  );

  const remove = useCallback(
    async (document: PrivateDocument): Promise<boolean> => {
      const done = await confirm({
        title: `Supprimer « ${document.name} » ?`,
        description:
          'Plus personne ne pourra le consulter ni le télécharger, et il ne pourra pas être rétabli depuis le portail. La suppression est inscrite au journal d’audit.',
        tone: 'danger',
        confirmLabel: 'Supprimer définitivement',
        onConfirm: async () => {
          await backendJson(`documents-prives/files/${document.id}`, {
            method: 'DELETE',
          });
          await invalidateDocs(queryClient);
        },
      });
      if (done)
        toast.success('Document supprimé', { description: document.name });
      return done;
    },
    [confirm, queryClient, toast],
  );

  return { download, downloadingId, archive, restore, remove };
}

export type DocumentActions = ReturnType<typeof useDocumentActions>;
