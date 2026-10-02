'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  CornerDownLeft,
  ExternalLink,
  LogOut,
  Moon,
  Plus,
  Search,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { normalizeText } from '@/lib/admin/format';
import type { SearchEntry } from '@/lib/admin/navigation';
import { useTheme } from '../theme-provider';

interface Command {
  id: string;
  label: string;
  hint?: string;
  section: string;
  icon: LucideIcon;
  /** Rubrique et mots-clés, normalisés : correspondance forte. */
  keywords: string;
  /** Description normalisée : correspondance faible. */
  details: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  entries: SearchEntry[];
  onLogout: () => void;
}

/**
 * Palette de commandes (Ctrl K / ⌘ K) : aller à n'importe quel écran ou
 * lancer une action sans parcourir les menus. Les entrées proviennent de la
 * navigation déjà filtrée par rôle — rien n'y apparaît que l'utilisateur ne
 * pourrait ouvrir.
 */
export function CommandPalette(props: CommandPaletteProps) {
  if (!props.open) return null;
  return <PaletteDialog {...props} />;
}

function score(command: Command, terms: string[]): number {
  if (!terms.length) return 1;
  const label = normalizeText(command.label);
  let total = 0;
  for (const term of terms) {
    if (label.startsWith(term)) total += 6;
    else if (label.split(/\s+/).some((word) => word.startsWith(term)))
      total += 4;
    else if (label.includes(term)) total += 3;
    else if (command.keywords.includes(term)) total += 2;
    else if (command.details.includes(term)) total += 1;
    else return 0;
  }
  return total;
}

function PaletteDialog({ onClose, entries, onLogout }: CommandPaletteProps) {
  const router = useRouter();
  const { resolved, setPreference } = useTheme();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      onClose();
      router.push(href);
    };
    const list: Command[] = [];
    for (const entry of entries) {
      list.push({
        id: entry.id,
        label: entry.label,
        hint: entry.quickAction ? entry.section : entry.description,
        section: entry.quickAction ? 'Actions rapides' : entry.section,
        icon: entry.quickAction ? Plus : entry.icon,
        keywords: normalizeText([entry.section, ...entry.keywords].join(' ')),
        details: normalizeText(entry.description ?? ''),
        run: go(entry.href),
      });
    }
    const nextTheme = resolved === 'dark' ? 'light' : 'dark';
    list.push(
      {
        id: 'theme',
        label:
          nextTheme === 'dark'
            ? 'Passer en thème sombre'
            : 'Passer en thème clair',
        section: 'Préférences',
        icon: nextTheme === 'dark' ? Moon : Sun,
        keywords: normalizeText(
          'apparence theme mode sombre clair dark light nuit',
        ),
        details: '',
        run: () => {
          onClose();
          setPreference(nextTheme, {
            x: window.innerWidth / 2,
            y: window.innerHeight * 0.2,
          });
        },
      },
      {
        id: 'site',
        label: 'Voir le site public',
        section: 'Préférences',
        icon: ExternalLink,
        keywords: normalizeText('site public vitrine ouvrir'),
        details: '',
        run: () => {
          onClose();
          window.open('/', '_blank', 'noopener');
        },
      },
      {
        id: 'logout',
        label: 'Se déconnecter',
        section: 'Préférences',
        icon: LogOut,
        keywords: normalizeText('deconnexion quitter logout sortir'),
        details: '',
        run: () => {
          onClose();
          onLogout();
        },
      },
    );
    return list;
  }, [entries, resolved, router, onClose, onLogout, setPreference]);

  const results = useMemo(() => {
    const terms = normalizeText(query).split(/\s+/).filter(Boolean);
    const ranked = commands
      .map((command, order) => ({
        command,
        order,
        score: score(command, terms),
      }))
      .filter((r) => r.score > 0);
    if (terms.length)
      ranked.sort((a, b) => b.score - a.score || a.order - b.order);
    else {
      // Sans saisie : actions rapides d'abord, puis l'ordre du menu.
      ranked.sort(
        (a, b) =>
          Number(b.command.section === 'Actions rapides') -
            Number(a.command.section === 'Actions rapides') ||
          a.order - b.order,
      );
    }
    return ranked.map((r) => r.command);
  }, [commands, query]);

  // Sections dans l'ordre d'apparition des résultats.
  const sections = useMemo(() => {
    const map = new Map<string, { command: Command; index: number }[]>();
    results.forEach((command, index) => {
      const bucket = map.get(command.section) ?? [];
      bucket.push({ command, index });
      map.set(command.section, bucket);
    });
    return [...map.entries()];
  }, [results]);

  // Index affiché = ordre de parcours des sections.
  const flat = useMemo(
    () => sections.flatMap(([, items]) => items.map((i) => i.command)),
    [sections],
  );

  const safeIndex = Math.min(activeIndex, Math.max(flat.length - 1, 0));
  const active = flat[safeIndex];

  useEffect(() => {
    inputRef.current?.focus();
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [safeIndex, query]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((safeIndex + 1) % Math.max(flat.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((safeIndex - 1 + flat.length) % Math.max(flat.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      active?.run();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'Tab') {
      // Le focus reste dans la palette (fenêtre modale).
      event.preventDefault();
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-start justify-center px-3 pt-[10vh] sm:pt-[14vh]">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-[#041014]/45 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Palette de commandes"
        onKeyDown={onKeyDown}
        className="animate-pop-in relative flex max-h-[min(560px,75vh)] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl border border-line bg-raised shadow-pop [transform-origin:top_center]"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search
            size={18}
            aria-hidden="true"
            className="shrink-0 text-ink-subtle"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={active ? `cmd-${active.id}` : undefined}
            aria-autocomplete="list"
            placeholder="Rechercher un écran, une action…"
            className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-subtle"
          />
          <kbd className="hidden rounded-md border border-line-strong px-1.5 py-0.5 font-mono text-[10px] text-ink-subtle sm:block">
            Échap
          </kbd>
        </div>

        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Résultats"
          className="portal-scroll min-h-0 flex-1 overflow-y-auto p-2"
        >
          {flat.length === 0 && (
            <li className="px-4 py-12 text-center text-sm text-ink-muted">
              Aucun résultat pour « {query} ».
            </li>
          )}
          {sections.map(([section, items]) => (
            <li key={section} role="presentation">
              <p className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                {section}
              </p>
              <ul role="presentation">
                {items.map(({ command }) => {
                  const selected = command === active;
                  const Icon = command.icon;
                  return (
                    <li
                      key={command.id}
                      id={`cmd-${command.id}`}
                      role="option"
                      aria-selected={selected}
                      onMouseMove={() => setActiveIndex(flat.indexOf(command))}
                      onClick={command.run}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                        selected ? 'bg-brand-soft' : ''
                      }`}
                    >
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-lg border transition-colors ${
                          selected
                            ? 'border-transparent bg-brand text-on-brand'
                            : 'border-line bg-sunken text-ink-muted'
                        }`}
                      >
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-ink">
                          {command.label}
                        </span>
                        {command.hint && (
                          <span className="block truncate text-xs text-ink-subtle">
                            {command.hint}
                          </span>
                        )}
                      </span>
                      {selected && (
                        <CornerDownLeft
                          size={15}
                          aria-hidden="true"
                          className="shrink-0 text-brand"
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>

        <footer className="hidden items-center gap-4 border-t border-line bg-sunken/60 px-4 py-2.5 text-[11px] text-ink-subtle sm:flex">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> naviguer
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd> ouvrir
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <Kbd>[</Kbd> replier le menu
          </span>
        </footer>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="grid h-5 min-w-5 place-items-center rounded border border-line-strong bg-raised px-1 font-mono text-[10px] text-ink-muted">
      {children}
    </kbd>
  );
}
