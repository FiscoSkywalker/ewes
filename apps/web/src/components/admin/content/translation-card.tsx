'use client';

import { Languages } from 'lucide-react';
import { Card } from '../ui';

/** Un texte rédigé en français et sa version anglaise (éventuellement absente). */
export type TranslationPair = [
  label: string,
  fr: string | null,
  en: string | null,
];

/**
 * Avancement de la version anglaise : seuls comptent les textes déjà rédigés
 * en français. Sans version anglaise, le site en anglais affiche le français.
 */
export function TranslationCard({ pairs }: { pairs: TranslationPair[] }) {
  const filled = (text: string | null) => text !== null && text.trim() !== '';
  const expected = pairs.filter(([, fr]) => filled(fr));
  const done = expected.filter(([, , en]) => filled(en));
  const missing = expected.filter(([, , en]) => !filled(en));
  const percent = expected.length
    ? Math.round((done.length / expected.length) * 100)
    : 0;

  return (
    <Card title="Version anglaise">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <Languages size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">
            {done.length} texte{done.length > 1 ? 's' : ''} sur{' '}
            {expected.length} traduit{done.length > 1 ? 's' : ''}
          </p>
          <div
            role="progressbar"
            aria-label="Avancement de la traduction"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-subtle">
        {missing.length > 0
          ? `À traduire : ${missing.map(([label]) => label.toLowerCase()).join(', ')}. Sans version anglaise, le site en anglais affiche le texte français.`
          : 'Toutes les versions anglaises sont renseignées.'}
      </p>
    </Card>
  );
}
