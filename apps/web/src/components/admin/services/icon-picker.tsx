'use client';

import { CircleDashed } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { SERVICE_ICONS } from '@/lib/service-icons';

const FOCUS =
  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand';

const TILE =
  'grid h-11 place-items-center rounded-lg border border-line bg-panel text-ink-muted transition-colors hover:border-line-strong hover:text-ink peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand';

/**
 * Choix du pictogramme d'une prestation parmi ceux que le site sait dessiner
 * (`lib/service-icons.ts`, partagé avec le site public). Des boutons radio
 * natifs : flèches, Tab et lecteurs d'écran fonctionnent sans code en plus ;
 * chaque pastille porte un libellé texte, jamais seulement un dessin.
 */
export function IconPicker({
  registration,
  value,
}: {
  registration: UseFormRegisterReturn;
  /** Clé courante (`''` : automatique), pour annoncer le choix en toutes lettres. */
  value: string;
}) {
  const current = value ? SERVICE_ICONS[value] : null;
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-[13px] font-medium text-ink">
        Pictogramme
      </legend>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
        <label className="relative">
          <input
            type="radio"
            value=""
            className="peer sr-only"
            {...registration}
          />
          <span className={`${TILE} ${FOCUS}`} title="Automatique">
            <CircleDashed size={19} aria-hidden="true" />
            <span className="sr-only">Automatique</span>
          </span>
        </label>
        {Object.entries(SERVICE_ICONS).map(([key, { label, Icon }]) => (
          <label key={key} className="relative">
            <input
              type="radio"
              value={key}
              className="peer sr-only"
              {...registration}
            />
            <span className={`${TILE} ${FOCUS}`} title={label}>
              <Icon size={19} strokeWidth={1.75} aria-hidden="true" />
              <span className="sr-only">{label}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-subtle" aria-live="polite">
        {current
          ? `Choisi : ${current.label}.`
          : 'Automatique : le site choisit un pictogramme par défaut.'}
      </p>
    </fieldset>
  );
}
