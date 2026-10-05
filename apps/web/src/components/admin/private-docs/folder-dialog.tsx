'use client';

import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { backendJson } from '@/lib/api/backend';
import { applyApiErrors } from '@/lib/admin/form-errors';
import {
  CONFIDENTIALITY,
  invalidateDocs,
  type Confidentiality,
  type FolderIndex,
  type PrivateFolder,
} from '@/lib/admin/private-docs';
import { useSession } from '../session';
import { Button, Dialog, Field, Input, useToast } from '../ui';
import { DialogActions, FormAlert } from './dialog-parts';
import { ConfidentialityPicker, LEVEL_OPTIONS } from './confidentiality-picker';

interface FolderFormValues {
  name: string;
  category: string;
  subCategory: string;
  department: string;
  projectRef: string;
  year: string;
}

const FIELDS = [
  'name',
  'category',
  'subCategory',
  'department',
  'projectRef',
  'year',
] as const;

export type FolderDialogTarget =
  | { mode: 'create'; parent: PrivateFolder | null }
  | { mode: 'edit'; folder: PrivateFolder };

/**
 * Création ou modification d'un dossier : son nom et son classement
 * (catégorie, sous-catégorie, département, projet, année — blueprint/11 §2).
 * La confidentialité n'est proposée qu'à l'Administrateur ; le serveur la
 * refuserait de toute façon à un autre rôle.
 */
export function FolderDialog({
  target,
  index,
  onClose,
  onSaved,
}: {
  target: FolderDialogTarget | null;
  index: FolderIndex;
  onClose: () => void;
  onSaved?: (folder: PrivateFolder) => void;
}) {
  return (
    <Dialog
      open={Boolean(target)}
      onClose={onClose}
      size="lg"
      title={
        target?.mode === 'edit'
          ? 'Modifier le dossier'
          : target?.parent
            ? `Nouveau sous-dossier dans « ${target.parent.name} »`
            : 'Nouveau dossier'
      }
      description={
        target?.mode === 'edit'
          ? 'Le classement aide à retrouver les documents par la recherche.'
          : target?.parent
            ? 'Les personnes qui ont accès au dossier parent y auront accès aussi.'
            : 'Un dossier de premier niveau n’est visible de personne tant que vous n’avez pas attribué de droit d’accès.'
      }
    >
      {target && (
        <FolderForm
          // Une autre cible repart d'un formulaire vierge.
          key={target.mode === 'edit' ? target.folder.id : 'create'}
          target={target}
          index={index}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Dialog>
  );
}

function FolderForm({
  target,
  index,
  onClose,
  onSaved,
}: {
  target: FolderDialogTarget;
  index: FolderIndex;
  onClose: () => void;
  onSaved?: (folder: PrivateFolder) => void;
}) {
  const session = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const categoriesId = useId();
  const isAdmin = session.role === 'ADMINISTRATEUR';
  const editing = target.mode === 'edit' ? target.folder : null;
  const parent = target.mode === 'create' ? target.parent : null;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FolderFormValues>({
    defaultValues: {
      name: editing?.name ?? '',
      // Un sous-dossier reprend par défaut le classement de son parent.
      category: editing?.category ?? parent?.category ?? '',
      subCategory: editing?.subCategory ?? parent?.subCategory ?? '',
      department: editing?.department ?? parent?.department ?? '',
      projectRef: editing?.projectRef ?? parent?.projectRef ?? '',
      year: (editing?.year ?? parent?.year)?.toString() ?? '',
    },
  });
  const [level, setLevel] = useState<Confidentiality>(
    editing?.confidentiality ?? parent?.confidentiality ?? 'RESTREINT',
  );
  const [formError, setFormError] = useState<string | null>(null);

  const categories = [
    ...new Set([...index.byId.values()].map((folder) => folder.category)),
  ].sort((a, b) => a.localeCompare(b, 'fr'));

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const optional = (value: string) =>
      value.trim() || (editing ? null : undefined);
    const body = {
      name: values.name.trim(),
      category: values.category.trim(),
      subCategory: optional(values.subCategory),
      department: optional(values.department),
      projectRef: optional(values.projectRef),
      year: values.year ? Number(values.year) : editing ? null : undefined,
      ...(isAdmin &&
        (!editing || level !== editing.confidentiality) && {
          confidentiality: level,
        }),
      ...(parent && { parentId: parent.id }),
    };
    try {
      const saved = await backendJson<PrivateFolder>(
        editing
          ? `documents-prives/folders/${editing.id}`
          : 'documents-prives/folders',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      await invalidateDocs(queryClient);
      toast.success(editing ? 'Dossier modifié' : 'Dossier créé', {
        description: saved.name,
      });
      onSaved?.(saved);
      onClose();
    } catch (error) {
      setFormError(applyApiErrors(error, { setError, fields: FIELDS }));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormAlert message={formError} />

      <Field label="Nom du dossier" required error={errors.name?.message}>
        <Input
          {...register('name', {
            required: 'Donnez un nom au dossier.',
            validate: (value) =>
              value.trim().length > 0 || 'Donnez un nom au dossier.',
            maxLength: { value: 200, message: '200 caractères au plus.' },
          })}
          placeholder="Ex. Déclarations fiscales 2025"
          autoComplete="off"
          data-autofocus
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Catégorie"
          required
          error={errors.category?.message}
          hint="Administratif, Juridique, Fiscal, Technique, RH…"
        >
          <Input
            {...register('category', {
              required: 'Indiquez une catégorie.',
              validate: (value) =>
                value.trim().length > 0 || 'Indiquez une catégorie.',
              maxLength: { value: 100, message: '100 caractères au plus.' },
            })}
            list={categoriesId}
            autoComplete="off"
          />
          <datalist id={categoriesId}>
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </Field>
        <Field label="Sous-catégorie" error={errors.subCategory?.message}>
          <Input
            {...register('subCategory', {
              maxLength: { value: 100, message: '100 caractères au plus.' },
            })}
            autoComplete="off"
          />
        </Field>
        <Field label="Département" error={errors.department?.message}>
          <Input
            {...register('department', {
              maxLength: { value: 100, message: '100 caractères au plus.' },
            })}
            autoComplete="off"
          />
        </Field>
        <Field
          label="Projet"
          error={errors.projectRef?.message}
          hint="Référence ou nom du projet concerné."
        >
          <Input
            {...register('projectRef', {
              maxLength: { value: 100, message: '100 caractères au plus.' },
            })}
            autoComplete="off"
          />
        </Field>
        <Field label="Année" error={errors.year?.message}>
          <Input
            {...register('year', {
              validate: (value) =>
                value === '' ||
                (/^\d{4}$/.test(value) &&
                  Number(value) >= 1900 &&
                  Number(value) <= 2100) ||
                'Une année sur quatre chiffres, entre 1900 et 2100.',
            })}
            inputMode="numeric"
            maxLength={4}
            placeholder="2025"
            autoComplete="off"
            className="sm:max-w-32"
          />
        </Field>
      </div>

      {isAdmin ? (
        <ConfidentialityPicker
          legend="Confidentialité du dossier"
          options={LEVEL_OPTIONS}
          value={level}
          onChange={(value) => value && setLevel(value)}
          disabled={isSubmitting}
          help="S’applique à tous les documents du dossier qui n’ont pas de niveau propre."
        />
      ) : (
        <p className="rounded-xl border border-line bg-sunken/60 px-3.5 py-3 text-xs leading-relaxed text-ink-muted">
          Confidentialité :{' '}
          <strong className="font-semibold text-ink">
            {CONFIDENTIALITY[level].label}
          </strong>
          {editing ? '' : ' (celle du dossier parent)'}. Seul un administrateur
          peut la modifier.
        </p>
      )}

      <DialogActions>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {editing ? 'Enregistrer' : 'Créer le dossier'}
        </Button>
      </DialogActions>
    </form>
  );
}
