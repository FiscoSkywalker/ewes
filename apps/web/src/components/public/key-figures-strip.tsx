import {
  cellSpanClass,
  formatFigureValue,
  gridClass,
  type LocalizedFigure,
} from '@/lib/key-figures';

/**
 * Bande des chiffres clés (page À propos) : une cellule par chiffre, dans
 * l'ordre choisi dans le portail. La grille s'adapte au nombre de chiffres
 * (1 à 8) et la dernière cellule d'une ligne incomplète occupe la place
 * restante. Compatible Server Component.
 */
export function KeyFiguresStrip({
  figures,
  locale,
  className = '',
}: {
  figures: LocalizedFigure[];
  locale: string;
  className?: string;
}) {
  if (figures.length === 0) return null;

  return (
    <dl
      className={`${gridClass(figures.length)} overflow-hidden rounded-sheet border border-border bg-surface-elevated ${className}`}
      data-stagger
    >
      {figures.map((figure, index) => (
        <div
          key={`${index}-${figure.label}`}
          className={`-mb-px -mr-px flex flex-col border-b border-r border-border p-7 sm:p-8 ${cellSpanClass(index, figures.length)}`}
        >
          <dt className="order-2 mt-3 font-heading text-base font-semibold leading-tight">
            {figure.label}
          </dt>
          <dd className="order-1 flex items-baseline gap-1 font-heading text-5xl font-bold tracking-tight text-sand">
            {formatFigureValue(figure.value, locale)}
            {figure.suffix && (
              <span className="text-xl text-primary">{figure.suffix}</span>
            )}
          </dd>
          {figure.subtext && (
            <dd className="order-3 mt-2 text-xs leading-5 text-sand/55">
              {figure.subtext}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
