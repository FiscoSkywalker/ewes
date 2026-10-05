'use client';

import { useState, type KeyboardEvent } from 'react';
import { Button, Checkbox, Dialog, Field, Input } from '../ui';
import { mediaName, type MediaItem } from '@/lib/admin/media';

/**
 * Adresse saisie -> adresse enregistrée, ou `null` si elle n'est pas
 * reconnue. L'API n'accepte que http(s), mailto, tel et les chemins du site
 * (`/contact`) : on complète ce qui se devine (`www.ewes.cd`, `a@b.cd`) et on
 * refuse le reste plutôt que d'enregistrer un lien que le site supprimerait.
 */
export function normalizeHref(input: string): string | null {
  const value = input.trim();
  if (!value || /\s/.test(value)) return null;
  if (/^(https?:\/\/|mailto:|tel:)\S+$/i.test(value)) return value;
  if (/^\/(?!\/)\S*$/.test(value)) return value;
  if (/^[^\s@/:]+@[^\s@/:]+\.[^\s@/:]{2,}$/.test(value))
    return `mailto:${value}`;
  if (/^[^\s/:@]+\.[^\s/:@.]{2,}(\/\S*)?$/.test(value))
    return `https://${value}`;
  return null;
}

/**
 * Ces fenêtres vivent dans le formulaire de l'article (le `<dialog>` est rendu
 * sur place) : pas de `<form>` imbriqué, et Entrée valide la fenêtre au lieu
 * d'enregistrer l'article.
 */
const enterToSubmit = (submit: () => void) => (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.target instanceof HTMLButtonElement)
    return;
  event.preventDefault();
  submit();
};

export function LinkDialog({
  open,
  initialHref,
  onClose,
  onSave,
  onRemove,
}: {
  open: boolean;
  initialHref: string;
  onClose: () => void;
  onSave: (href: string) => void;
  /** Absent : aucun lien à retirer. */
  onRemove?: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={onRemove ? 'Modifier le lien' : 'Ajouter un lien'}
    >
      <LinkForm
        initialHref={initialHref}
        onClose={onClose}
        onSave={onSave}
        onRemove={onRemove}
      />
    </Dialog>
  );
}

function LinkForm({
  initialHref,
  onClose,
  onSave,
  onRemove,
}: {
  initialHref: string;
  onClose: () => void;
  onSave: (href: string) => void;
  onRemove?: () => void;
}) {
  const [value, setValue] = useState(initialHref);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const href = normalizeHref(value);
    if (!href) {
      setError(
        'Adresse non reconnue. Exemples : https://www.ewes.cd, nom@ewes.cd ou /contact.',
      );
      return;
    }
    onSave(href);
  }

  return (
    <div onKeyDown={enterToSubmit(submit)} className="space-y-4 py-1">
      <Field
        label="Adresse du lien"
        hint="Une adresse web, une adresse e-mail, ou une page du site (/contact)."
        error={error}
      >
        <Input
          data-autofocus
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          autoComplete="off"
          inputMode="url"
          placeholder="https://"
        />
      </Field>
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {onRemove && (
          <Button variant="ghost" onClick={onRemove} className="sm:mr-auto">
            <span className="text-bad">Retirer le lien</span>
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={submit}>Enregistrer</Button>
      </div>
    </div>
  );
}

export interface ImageChoice {
  /** Adresse publique (`/uploads/<nom>`). */
  src: string;
  /** Aperçu : la vignette de la médiathèque. */
  preview: string;
  name: string;
  alt: string;
}

export const choiceFromMedia = (media: MediaItem): ImageChoice => ({
  src: media.url,
  preview: media.thumbUrl,
  name: mediaName(media),
  alt: '',
});

/**
 * Texte alternatif d'une image du corps de l'article : demandé à
 * l'insertion (décrit l'image aux personnes qui ne la voient pas), avec
 * l'option explicite « décorative » plutôt qu'un oubli silencieux.
 */
export function ImageDialog({
  choice,
  editing,
  onClose,
  onSave,
}: {
  choice: ImageChoice | null;
  /** `true` : l'image est déjà dans le texte, on n'en modifie que la description. */
  editing: boolean;
  onClose: () => void;
  onSave: (alt: string) => void;
}) {
  return (
    <Dialog
      open={choice !== null}
      onClose={onClose}
      title={editing ? 'Description de l’image' : 'Insérer l’image'}
    >
      {choice && (
        <ImageForm
          choice={choice}
          editing={editing}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </Dialog>
  );
}

function ImageForm({
  choice,
  editing,
  onClose,
  onSave,
}: {
  choice: ImageChoice;
  editing: boolean;
  onClose: () => void;
  onSave: (alt: string) => void;
}) {
  const [alt, setAlt] = useState(choice.alt);
  const [decorative, setDecorative] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!decorative && !alt.trim()) {
      setError(
        'Décrivez l’image, ou cochez « Image décorative » si elle n’apporte pas d’information.',
      );
      return;
    }
    onSave(decorative ? '' : alt.trim());
  }

  return (
    <div onKeyDown={enterToSubmit(submit)} className="space-y-4 py-1">
      <div className="overflow-hidden rounded-xl border border-line bg-sunken">
        {/* Vignette de la médiathèque, servie par l'API en même origine. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={choice.preview}
          alt=""
          className="max-h-52 w-full object-contain"
        />
        <p className="truncate border-t border-line px-3.5 py-2 text-xs text-ink-muted">
          {choice.name}
        </p>
      </div>
      <Field
        label="Description de l’image"
        required={!decorative}
        hint="Une phrase courte, comme si vous la décriviez à quelqu’un au téléphone."
        error={error}
      >
        <Input
          data-autofocus
          maxLength={300}
          value={alt}
          disabled={decorative}
          onChange={(event) => {
            setAlt(event.target.value);
            setError(null);
          }}
        />
      </Field>
      <Checkbox
        label="Image décorative"
        description="Elle n’apporte pas d’information : les lecteurs d’écran l’ignoreront."
        checked={decorative}
        onChange={(event) => {
          setDecorative(event.target.checked);
          setError(null);
        }}
      />
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={submit}>{editing ? 'Enregistrer' : 'Insérer'}</Button>
      </div>
    </div>
  );
}
