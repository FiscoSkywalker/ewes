'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { FolderInput } from 'lucide-react';
import { backendJson, describeError } from '@/lib/api/backend';
import { applyApiErrors } from '@/lib/admin/form-errors';
import {
  CONFIDENTIALITY,
  CONFIDENTIALITY_LEVELS,
  invalidateDocs,
  isStricter,
  pathTo,
  type Confidentiality,
  type FolderIndex,
  type PrivateDocument,
} from '@/lib/admin/private-docs';
import { useSession } from '../session';
import { Button, Dialog, Field, Input, Textarea, useToast } from '../ui';
import {
  ConfidentialityPicker,
  type ConfidentialityOption,
} from './confidentiality-picker';
import { DialogActions, FormAlert, Note } from './dialog-parts';
import { FolderTree } from './folder-tree';

const patchDocument = (id: string, body: object) =>
  backendJson<PrivateDocument>(`documents-prives/files/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

// --- Modifier ---

/** Nom, description et niveau de confidentialité propre d'un document. */
export function DocumentEditDialog({
  document,
  index,
  onClose,
}: {
  document: PrivateDocument | null;
  index: FolderIndex;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={Boolean(document)}
      onClose={onClose}
      size="lg"
      title="Modifier le document"
      description="Le fichier lui-même ne change pas : pour le remplacer, téléversez la nouvelle version puis archivez l’ancienne."
    >
      {document && (
        <EditForm
          key={document.id}
          document={document}
          index={index}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

interface EditValues {
  name: string;
  description: string;
}

function EditForm({
  document,
  index,
  onClose,
}: {
  document: PrivateDocument;
  index: FolderIndex;
  onClose: () => void;
}) {
  const session = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isAdmin = session.role === 'ADMINISTRATEUR';
  const folder = document.folderId ? index.byId.get(document.folderId) : null;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({
    defaultValues: {
      name: document.name,
      description: document.description ?? '',
    },
  });
  const [override, setOverride] = useState<Confidentiality | ''>(
    document.confidentialityOverride ?? '',
  );
  const [formError, setFormError] = useState<string | null>(null);

  const current = document.confidentialityOverride ?? folder?.confidentiality;
  const choices: ConfidentialityOption[] = folder
    ? [
        {
          value: '',
          label: `Comme le dossier (${CONFIDENTIALITY[folder.confidentiality].label})`,
          hint: 'Le document suit la confidentialité de son dossier.',
        },
        ...CONFIDENTIALITY_LEVELS.map<ConfidentialityOption>((value) => ({
          value,
          label: CONFIDENTIALITY[value].label,
          hint: isStricter(value, folder.confidentiality)
            ? 'Plus strict que le dossier : seules les personnes disposant d’un droit sur ce document y accéderont.'
            : CONFIDENTIALITY[value].hint,
        })),
      ]
    : [];
  const options: ConfidentialityOption[] = folder
    ? choices.map((option) => {
        const next = option.value || folder.confidentiality;
        const lowers = current ? isStricter(current, next) : false;
        return !isAdmin && lowers
          ? {
              ...option,
              disabledReason:
                'Seul un administrateur peut abaisser la confidentialité.',
            }
          : option;
      })
    : [];

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = await patchDocument(document.id, {
        name: values.name.trim(),
        description: values.description.trim() || null,
        ...(override !== (document.confidentialityOverride ?? '') && {
          confidentiality: override || null,
        }),
      });
      await invalidateDocs(queryClient);
      toast.success('Document modifié', { description: saved.name });
      onClose();
    } catch (error) {
      setFormError(
        applyApiErrors(error, { setError, fields: ['name', 'description'] }),
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormAlert message={formError} />
      <Field label="Nom" required error={errors.name?.message}>
        <Input
          {...register('name', {
            validate: (value) =>
              value.trim().length > 0 || 'Donnez un nom au document.',
            maxLength: { value: 200, message: '200 caractères au plus.' },
          })}
          autoComplete="off"
          data-autofocus
        />
      </Field>
      <Field
        label="Description"
        error={errors.description?.message}
        hint="Quelques mots sur le contenu : la recherche les retrouve."
      >
        <Textarea
          {...register('description', {
            maxLength: { value: 2000, message: '2 000 caractères au plus.' },
          })}
          // Non contrôlé (React Hook Form) : le compteur part de la longueur d'origine.
          defaultValue={document.description ?? ''}
          rows={3}
          maxLength={2000}
          showCount
        />
      </Field>
      {folder && (
        <ConfidentialityPicker
          legend="Confidentialité"
          options={options}
          value={override}
          onChange={setOverride}
          disabled={isSubmitting}
        />
      )}
      <DialogActions>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Enregistrer
        </Button>
      </DialogActions>
    </form>
  );
}

// --- Déplacer ---

/** Choix du dossier de destination dans l'arborescence (droit d'écriture requis des deux côtés). */
export function DocumentMoveDialog({
  document,
  index,
  onClose,
}: {
  document: PrivateDocument | null;
  index: FolderIndex;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={Boolean(document)}
      onClose={onClose}
      size="lg"
      title="Déplacer le document"
      description={
        document ? `« ${document.name} » — choisissez son nouveau dossier.` : ''
      }
    >
      {document && (
        <MoveForm
          key={document.id}
          document={document}
          index={index}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

function MoveForm({
  document,
  index,
  onClose,
}: {
  document: PrivateDocument;
  index: FolderIndex;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const target = targetId ? index.byId.get(targetId) : null;
  // Sans surcharge, le document prendra le niveau du dossier d'arrivée : on le dit avant.
  const inherits = document.confidentialityOverride === null;
  const levelChanges =
    inherits && target && target.confidentiality !== document.confidentiality;

  async function move() {
    if (!target) return;
    setSaving(true);
    setFormError(null);
    try {
      await patchDocument(document.id, { folderId: target.id });
      await invalidateDocs(queryClient);
      toast.success('Document déplacé', {
        description: `Vers « ${target.name} »`,
      });
      onClose();
    } catch (error) {
      setFormError(describeError(error).message);
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <FormAlert message={formError} />
      <div className="portal-scroll max-h-[45dvh] min-h-40 overflow-y-auto rounded-xl border border-line bg-panel p-1.5">
        <FolderTree
          label="Dossier de destination"
          index={index}
          selectedId={targetId}
          onSelect={setTargetId}
          defaultExpanded={
            document.folderId
              ? pathTo(index, document.folderId).map((folder) => folder.id)
              : undefined
          }
          disabledReason={(folder) =>
            folder.id === document.folderId
              ? 'dossier actuel'
              : folder.canWrite
                ? null
                : 'lecture seule'
          }
        />
      </div>
      <div aria-live="polite">
        {target && (
          <Note tone={levelChanges ? 'warn' : 'brand'} icon={FolderInput}>
            Destination :{' '}
            <strong className="font-semibold text-ink">
              {pathTo(index, target.id)
                .map((folder) => folder.name)
                .join(' › ')}
            </strong>
            {levelChanges && (
              <>
                . Le document deviendra «{' '}
                {CONFIDENTIALITY[target.confidentiality].label} », comme ce
                dossier, et sera visible des personnes qui y ont accès.
              </>
            )}
          </Note>
        )}
      </div>
      <DialogActions>
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button onClick={move} loading={saving} disabled={!target}>
          Déplacer ici
        </Button>
      </DialogActions>
    </div>
  );
}
