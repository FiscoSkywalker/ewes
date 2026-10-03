import { useId, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '@/lib/admin/cx';

interface SettingsSectionProps {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  /** Teinte du pictogramme (rappel des pôles du portail). */
  tone?: 'brand' | 'env' | 'ing';
  children: ReactNode;
}

const TONES = {
  brand: 'bg-brand-soft text-brand',
  env: 'bg-env-soft text-env',
  ing: 'bg-ing-soft text-ing',
} as const;

/**
 * Bloc de réglages : un pictogramme, un titre, une phrase qui dit à quoi il
 * sert et où cela se voit, puis les champs. Chaque bloc est une région
 * nommée (navigation par les repères des lecteurs d'écran).
 */
export function SettingsSection({
  icon: Icon,
  title,
  description,
  tone = 'brand',
  children,
}: SettingsSectionProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-2xl border border-line bg-panel"
    >
      <header className="flex items-start gap-3.5 border-b border-line px-5 py-4">
        <span
          aria-hidden="true"
          className={cx(
            'grid size-9 shrink-0 place-items-center rounded-xl',
            TONES[tone],
          )}
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <h2 id={titleId} className="text-sm font-semibold text-ink">
            {title}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-subtle">
            {description}
          </p>
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
