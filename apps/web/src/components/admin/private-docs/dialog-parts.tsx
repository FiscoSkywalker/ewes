import { CircleAlert } from 'lucide-react';

/**
 * Boutons d'un formulaire placé dans une fenêtre : collés au bas de la zone
 * défilante (toujours visibles sur petit écran), empilés pleine largeur sous
 * 640 px avec l'action principale en premier sous le pouce.
 */
export function DialogActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky -bottom-3 z-10 -mx-5 -mb-3 mt-1 flex flex-col-reverse gap-2 rounded-b-2xl border-t border-line bg-raised px-5 py-3.5 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}

/** Refus du serveur qui ne se rattache à aucun champ. */
export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-bad/25 bg-bad-soft px-3.5 py-3 text-[13px] text-ink"
    >
      <CircleAlert
        size={16}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-bad"
      />
      {message}
    </p>
  );
}

/** Encadré d'explication (portée d'un droit, conséquence d'un choix). */
export function Note({
  tone = 'neutral',
  icon: Icon,
  children,
}: {
  tone?: 'neutral' | 'warn' | 'brand';
  icon?: React.ComponentType<{
    size?: number;
    className?: string;
    'aria-hidden'?: boolean | 'true';
  }>;
  children: React.ReactNode;
}) {
  const tones = {
    neutral: 'border-line bg-sunken/60 text-ink-muted',
    warn: 'border-warn/25 bg-warn-soft text-ink',
    brand: 'border-brand/20 bg-brand-soft text-ink',
  } as const;
  const iconTones = {
    neutral: 'text-ink-subtle',
    warn: 'text-warn',
    brand: 'text-brand',
  } as const;
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-relaxed ${tones[tone]}`}
    >
      {Icon && (
        <Icon
          size={15}
          aria-hidden="true"
          className={`mt-px shrink-0 ${iconTones[tone]}`}
        />
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
