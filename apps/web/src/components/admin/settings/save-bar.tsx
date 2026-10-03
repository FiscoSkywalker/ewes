'use client';

import { Check, RotateCcw } from 'lucide-react';
import { relativeTime } from '@/lib/admin/format';
import { cx } from '@/lib/admin/cx';
import { Button } from '../ui';

interface SaveBarProps {
  /** Le formulaire diffère de ce qui est enregistré. */
  dirty: boolean;
  saving: boolean;
  /** Date du dernier enregistrement ; `null` : jamais enregistré (valeurs d'origine). */
  savedAt: string | null;
  /** Rétablit les valeurs enregistrées. */
  onReset: () => void;
  /** Conséquence d'un enregistrement, rappelée près du bouton (« visible aussitôt sur le site »). */
  consequence?: string;
}

/**
 * Barre d'enregistrement des écrans de réglages, collée en bas de la zone
 * visible : on ne cherche jamais le bouton après avoir modifié un champ
 * lointain. L'état est écrit (jamais seulement une couleur) et annoncé aux
 * lecteurs d'écran ; « Enregistrer » ne s'active que s'il y a quelque chose à
 * enregistrer.
 */
export function SaveBar({
  dirty,
  saving,
  savedAt,
  onReset,
  consequence,
}: SaveBarProps) {
  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line-strong bg-raised/90 px-4 py-3 shadow-pop backdrop-blur-md supports-[backdrop-filter]:bg-raised/75">
      <p
        role="status"
        className="flex min-w-0 flex-1 basis-56 items-start gap-2.5 text-[13px]"
      >
        <span
          aria-hidden="true"
          className={cx(
            'mt-px grid size-5 shrink-0 place-items-center rounded-full',
            dirty ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok',
          )}
        >
          {dirty ? (
            <span className="size-2 rounded-full bg-warn" />
          ) : (
            <Check size={12} strokeWidth={3} />
          )}
        </span>
        <span className="min-w-0">
          <span className="block font-medium text-ink">
            {dirty ? 'Modifications non enregistrées' : 'Tout est enregistré'}
          </span>
          <span className="block text-xs leading-snug text-ink-subtle">
            {dirty
              ? (consequence ?? 'Enregistrez pour appliquer vos changements.')
              : savedAt
                ? `Dernière modification ${relativeTime(savedAt)}.`
                : 'Valeurs d’origine : rien n’a encore été personnalisé.'}
          </span>
        </span>
      </p>
      <div className="ml-auto flex items-center gap-2">
        {dirty && (
          <Button
            variant="ghost"
            icon={RotateCcw}
            onClick={onReset}
            disabled={saving}
          >
            Annuler
          </Button>
        )}
        <Button type="submit" loading={saving} disabled={!dirty}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
