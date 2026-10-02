'use client';

import { useEffect, useRef } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { CircleAlert } from 'lucide-react';
import { slugify } from '@/lib/admin/public-documents';
import { Card, Field, Input } from '../ui';

/** Bandeau d'erreur en tête de formulaire (refus de l'API qui n'est rattaché à aucun champ). */
export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-bad"
    >
      <CircleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
      {children}
    </div>
  );
}

/**
 * Création : le slug suit le titre tant que la personne ne l'a pas modifié
 * elle-même (`edited` = champ « sale » du formulaire).
 */
export function useAutoSlug({
  enabled,
  edited,
  title,
  setSlug,
}: {
  enabled: boolean;
  edited: boolean;
  title: string;
  setSlug: (slug: string) => void;
}) {
  // Rappel gardé en référence : sa nouvelle identité à chaque rendu ne relance pas l'effet.
  const setSlugRef = useRef(setSlug);
  useEffect(() => {
    setSlugRef.current = setSlug;
  });
  useEffect(() => {
    if (enabled && !edited) setSlugRef.current(slugify(title));
  }, [enabled, edited, title]);
}

/** Carte « Adresse » : le slug, figé dès qu'un contenu a été publié (liens partagés). */
export function SlugCard({
  registration,
  error,
  locked,
  mode,
}: {
  registration: UseFormRegisterReturn;
  error?: string;
  locked: boolean;
  mode: 'create' | 'edit';
}) {
  return (
    <Card title="Adresse">
      <Field
        label="Slug"
        required
        error={error}
        hint={
          locked
            ? 'Ce contenu est publié : son adresse ne peut plus changer (des liens y renvoient peut-être).'
            : mode === 'create'
              ? 'Généré à partir du titre ; modifiable tant que le contenu n’est pas publié. Il ne pourra plus changer ensuite.'
              : 'Modifiable tant que le contenu n’a jamais été publié.'
        }
      >
        <Input
          maxLength={120}
          spellCheck={false}
          disabled={locked}
          className="font-mono text-[13px]"
          {...registration}
        />
      </Field>
    </Card>
  );
}
