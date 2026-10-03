'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { cx, focusRing } from '@/lib/admin/cx';
import { MAX_SPECIALTIES, SPECIALTY_MAX_LENGTH } from '@/lib/admin/experts';
import { Input } from '../ui';

/**
 * Saisie de spécialités en pastilles : Entrée ou virgule ajoute, la croix
 * retire, un collage de plusieurs séparés par une virgule les ajoute toutes.
 * Doublons (casse ignorée) et vides écartés ; l'API revérifie et nettoie.
 * À placer dans un `BilingualField` (le champ de saisie en reprend le libellé).
 */
export function SpecialtiesInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const full = value.length >= MAX_SPECIALTIES;

  function add(raw: string) {
    const known = new Set(value.map((item) => item.toLocaleLowerCase('fr')));
    const next = [...value];
    for (const part of raw.split(/[,;\n]/)) {
      const item = part
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, SPECIALTY_MAX_LENGTH);
      const key = item.toLocaleLowerCase('fr');
      if (!item || known.has(key) || next.length >= MAX_SPECIALTIES) continue;
      known.add(key);
      next.push(item);
    }
    onChange(next);
    setDraft('');
  }

  return (
    <div className="space-y-2.5">
      <Input
        value={draft}
        disabled={full}
        maxLength={SPECIALTY_MAX_LENGTH * 4}
        placeholder={
          full
            ? `${MAX_SPECIALTIES} spécialités au plus`
            : (placeholder ?? 'Saisissez, puis Entrée ou virgule')
        }
        onChange={(event) => {
          const next = event.target.value;
          // Une virgule valide ce qui précède, comme Entrée.
          if (/[,;]/.test(next)) add(next);
          else setDraft(next);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            // Entrée ajoute la pastille ; elle n'envoie pas le formulaire.
            event.preventDefault();
            add(draft);
          } else if (event.key === 'Backspace' && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
      />
      {value.length > 0 && (
        <ul role="list" className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <li
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-brand-soft py-1 pl-3 pr-1 text-[12.5px] font-medium text-brand"
            >
              {item}
              <button
                type="button"
                aria-label={`Retirer « ${item} »`}
                onClick={() =>
                  onChange(value.filter((other) => other !== item))
                }
                className={cx(
                  'grid size-5 place-items-center rounded-full hover:bg-brand/15',
                  focusRing,
                )}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink-subtle" aria-live="polite">
        {value.length} / {MAX_SPECIALTIES}
        {full ? ' — retirez-en une pour en ajouter.' : ''}
      </p>
    </div>
  );
}
