'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Home, KeyRound } from 'lucide-react';
import { backendJson, describeError } from '@/lib/api/backend';
import { cx, focusRing } from '@/lib/admin/cx';
import {
  CONFIDENTIALITY,
  deepDocumentCount,
  invalidateDocs,
  isStricter,
  pathTo,
  subtreeIds,
  type FolderIndex,
  type PrivateFolder,
} from '@/lib/admin/private-docs';
import { Button, Dialog, useToast } from '../ui';
import { DialogActions, FormAlert, Note } from './dialog-parts';
import { FolderTree } from './folder-tree';

/**
 * Déplacement d'un dossier, avec tout son contenu, sous un autre dossier ou au
 * premier niveau. Réservé à l'Administrateur (le serveur le refuse à tout autre
 * rôle) : les droits d'accès suivent l'arborescence, donc déplacer un dossier
 * change qui peut le voir — la fenêtre le dit avant de confirmer.
 */
export function FolderMoveDialog({
  folder,
  index,
  onClose,
}: {
  folder: PrivateFolder | null;
  index: FolderIndex;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={Boolean(folder)}
      onClose={onClose}
      size="lg"
      title="Déplacer le dossier"
      description={
        folder ? `« ${folder.name} » — choisissez son nouvel emplacement.` : ''
      }
    >
      {folder && (
        <MoveForm
          key={folder.id}
          folder={folder}
          index={index}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

function MoveForm({
  folder,
  index,
  onClose,
}: {
  folder: PrivateFolder;
  index: FolderIndex;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  // `undefined` : rien de choisi ; `null` : le premier niveau.
  const [targetId, setTargetId] = useState<string | null | undefined>(
    undefined,
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const subtree = subtreeIds(index, folder.id);
  const current =
    folder.parentId && index.byId.has(folder.parentId) ? folder.parentId : null;
  const target = targetId ? (index.byId.get(targetId) ?? null) : null;
  const previous = current ? (index.byId.get(current) ?? null) : null;
  const documents = deepDocumentCount(index, folder.id);
  const folders = subtree.size - 1;

  async function move() {
    if (targetId === undefined) return;
    setSaving(true);
    setFormError(null);
    try {
      await backendJson(`documents-prives/folders/${folder.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: targetId }),
      });
      await invalidateDocs(queryClient);
      toast.success('Dossier déplacé', {
        description: target ? `Vers « ${target.name} »` : 'Au premier niveau',
      });
      onClose();
    } catch (error) {
      setFormError(describeError(error).message);
      setSaving(false);
    }
  }

  const chosen = targetId !== undefined;
  return (
    <div className="flex flex-col gap-4">
      <FormAlert message={formError} />
      <div className="portal-scroll max-h-[45dvh] min-h-40 overflow-y-auto rounded-xl border border-line bg-panel p-1.5">
        <button
          type="button"
          onClick={() => setTargetId(null)}
          disabled={current === null}
          aria-pressed={targetId === null}
          className={cx(
            'mb-0.5 flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[13px] transition-colors lg:min-h-9',
            focusRing,
            targetId === null
              ? 'bg-brand-soft font-semibold text-brand'
              : 'text-ink hover:bg-ink/5 disabled:opacity-50 disabled:hover:bg-transparent',
          )}
        >
          <Home size={15} aria-hidden="true" />
          Premier niveau
          {current === null && (
            <span className="ml-auto text-xs text-ink-subtle">
              emplacement actuel
            </span>
          )}
        </button>
        <FolderTree
          label="Nouvel emplacement"
          index={index}
          selectedId={target?.id ?? null}
          onSelect={setTargetId}
          defaultExpanded={
            folder.parentId
              ? pathTo(index, folder.parentId).map((item) => item.id)
              : undefined
          }
          disabledReason={(item) =>
            item.id === folder.id
              ? 'dossier à déplacer'
              : subtree.has(item.id)
                ? 'sous-dossier'
                : item.id === current
                  ? 'emplacement actuel'
                  : null
          }
        />
      </div>
      <div aria-live="polite" className="flex flex-col gap-3">
        {chosen && (
          <Note tone="warn" icon={KeyRound}>
            <span>
              Destination :{' '}
              <strong className="font-semibold text-ink">
                {target
                  ? pathTo(index, target.id)
                      .map((item) => item.name)
                      .join(' › ')
                  : 'premier niveau'}
              </strong>
              . Les droits d’accès suivent l’arborescence : le dossier
              {folders > 0 &&
                `, ses ${folders} sous-dossier${folders > 1 ? 's' : ''}`}
              {` et ses ${documents} document${documents > 1 ? 's' : ''} `}
              {target
                ? `deviennent visibles des personnes qui ont accès à « ${target.name} »`
                : 'ne seront plus couverts par aucun dossier parent'}
              {previous
                ? `, et ne le sont plus de celles qui n’y accédaient que par « ${previous.name} »`
                : ''}
              . Les droits attribués directement à ce dossier ne changent pas.
            </span>
          </Note>
        )}
        {target &&
          isStricter(folder.confidentiality, target.confidentiality) && (
            <Note tone="warn">
              Ce dossier est plus confidentiel (
              {CONFIDENTIALITY[folder.confidentiality].label}) que sa
              destination ({CONFIDENTIALITY[target.confidentiality].label}) :
              vérifiez que les personnes qui y ont accès doivent bien voir son
              contenu.
            </Note>
          )}
      </div>
      <DialogActions>
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button onClick={move} loading={saving} disabled={!chosen}>
          Déplacer ici
        </Button>
      </DialogActions>
    </div>
  );
}
