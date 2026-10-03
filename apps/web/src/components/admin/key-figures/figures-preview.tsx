'use client';

import { useState } from 'react';
import { EyeOff } from 'lucide-react';
import { cx } from '@/lib/admin/cx';
import { localize, type KeyFigure } from '@/lib/admin/key-figures';
import {
  cellSpanClass,
  formatFigureValue,
  gridClass,
  type LocalizedFigure,
} from '@/lib/key-figures';
import { Card, SegmentedControl } from '../ui';

type Locale = 'fr' | 'en';

/** Un chiffre tel que le site le dessine : grande valeur, suffixe en couleur, libellé, précision. */
export function FigureTile({
  figure,
  locale,
  className,
}: {
  figure: LocalizedFigure;
  locale: Locale;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-col p-5 sm:p-6', className)}>
      <p className="order-1 flex items-baseline gap-1 text-[34px] font-bold leading-none tracking-tight text-ink">
        {formatFigureValue(figure.value, locale)}
        {figure.suffix && (
          <span className="text-base font-semibold text-brand">
            {figure.suffix}
          </span>
        )}
      </p>
      <p className="order-2 mt-2.5 text-[13.5px] font-semibold leading-snug text-ink">
        {figure.label}
      </p>
      {figure.subtext && (
        <p className="order-3 mt-1.5 text-xs leading-relaxed text-ink-subtle">
          {figure.subtext}
        </p>
      )}
    </div>
  );
}

/**
 * Aperçu de la bande de chiffres de la page À propos, FR/EN : seuls les
 * chiffres visibles, dans l'ordre choisi, avec la même grille que le site
 * (`lib/key-figures.ts`). Simplifié : la typographie exacte se voit sur le site.
 */
export function FiguresPreview({ figures }: { figures: KeyFigure[] }) {
  const [locale, setLocale] = useState<Locale>('fr');
  const visible = figures.filter((figure) => figure.isVisible);
  const hidden = figures.length - visible.length;

  return (
    <Card
      title="Aperçu"
      description="Comme les visiteurs voient la bande de chiffres sur la page À propos."
      actions={
        <SegmentedControl<Locale>
          label="Langue de l’aperçu"
          size="sm"
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'fr', label: 'FR' },
            { value: 'en', label: 'EN' },
          ]}
        />
      }
    >
      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-ink-muted">
          Aucun chiffre visible : la page À propos n’affiche pas cette bande.
        </p>
      ) : (
        <div
          role="group"
          aria-label="Aperçu de la bande de chiffres clés"
          className={cx(
            gridClass(visible.length),
            'overflow-hidden rounded-xl border border-line bg-sunken/40',
          )}
        >
          {visible.map((figure, index) => (
            <FigureTile
              key={figure.id}
              figure={localize(figure, locale)}
              locale={locale}
              className={cx(
                '-mb-px -mr-px border-b border-r border-line',
                cellSpanClass(index, visible.length),
              )}
            />
          ))}
        </div>
      )}
      {hidden > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-subtle">
          <EyeOff size={13} aria-hidden="true" />
          {hidden === 1
            ? '1 chiffre masqué n’apparaît pas.'
            : `${hidden} chiffres masqués n’apparaissent pas.`}
        </p>
      )}
    </Card>
  );
}
