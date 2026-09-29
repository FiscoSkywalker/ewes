'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { routing } from '@/i18n/routing';
import { usePathname, useRouter } from '@/i18n/navigation';

const LANGUAGE_LABELS: Record<string, string> = {
  fr: 'Français',
  en: 'English',
};

interface LanguageSelectorProps {
  compact?: boolean;
}

/**
 * Sélecteur de langue persistant (blueprint/05_UI_UX_System.md §6). Reprend
 * l'identité visuelle du prototype, mais bascule réellement la locale via
 * next-intl (contrairement à la maquette d'origine, qui ne faisait que
 * mémoriser un choix non appliqué) — même mécanique que `locale-switcher.tsx`.
 */
export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const chooseLanguage = (nextLocale: string) => {
    setOpen(false);
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full border border-sand/14 px-3 text-[10px] font-bold tracking-[0.12em] text-sand/75 transition-colors hover:border-primary/45 hover:text-primary"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Langue préférée : ${LANGUAGE_LABELS[locale]}`}
      >
        <Languages size={13} />
        <span>{locale.toUpperCase()}</span>
        {!compact && (
          <span className="hidden 2xl:inline">{LANGUAGE_LABELS[locale]}</span>
        )}
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        role="listbox"
        aria-label="Choisir la langue"
        className={`absolute right-0 top-[calc(100%+10px)] min-w-[168px] overflow-hidden border border-sand/12 bg-surface-elevated py-1 shadow-[0_18px_50px_rgba(33,71,87,.18)] transition-all duration-200 ${
          open
            ? 'visible translate-y-0 opacity-100'
            : 'invisible -translate-y-2 opacity-0'
        }`}
      >
        {routing.locales.map((code) => {
          const active = locale === code;
          return (
            <button
              key={code}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => chooseLanguage(code)}
              className="flex w-full items-center justify-between gap-5 px-4 py-3 text-left transition-colors hover:bg-background/70"
            >
              <span>
                <span className="block text-[10px] font-bold tracking-[0.15em] text-primary">
                  {code.toUpperCase()}
                </span>
                <span className="mt-0.5 block text-xs font-medium text-sand">
                  {LANGUAGE_LABELS[code]}
                </span>
              </span>
              {active && <Check size={14} className="text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
