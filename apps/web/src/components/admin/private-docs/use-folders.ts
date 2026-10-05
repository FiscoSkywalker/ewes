'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { backendJson } from '@/lib/api/backend';
import {
  FOLDERS_KEY,
  indexFolders,
  type PrivateFolder,
} from '@/lib/admin/private-docs';

const EMPTY: PrivateFolder[] = [];

/**
 * Arborescence visible par le compte connecté (`GET /documents-prives/folders`,
 * déjà limitée à ses droits par le serveur), indexée pour l'arbre, le fil
 * d'Ariane et les sélecteurs de dossier.
 */
export function useFolders() {
  const query = useQuery({
    queryKey: FOLDERS_KEY,
    queryFn: () =>
      backendJson<{ data: PrivateFolder[] }>('documents-prives/folders'),
    staleTime: 30_000,
  });
  const folders = query.data?.data ?? EMPTY;
  const index = useMemo(() => indexFolders(folders), [folders]);
  return { ...query, folders, index };
}
