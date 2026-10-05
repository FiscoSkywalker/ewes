'use client';

import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronRight, Folder, FolderLock, FolderOpen } from 'lucide-react';
import { cx } from '@/lib/admin/cx';
import {
  pathTo,
  type FolderIndex,
  type PrivateFolder,
} from '@/lib/admin/private-docs';

interface VisibleNode {
  folder: PrivateFolder;
  level: number;
  hasChildren: boolean;
  expanded: boolean;
  parentId: string | null;
}

export interface FolderTreeProps {
  /** Nom accessible de l'arbre (« Dossiers », « Dossier de destination »). */
  label: string;
  index: FolderIndex;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Information alignée à droite (nombre de documents, de droits…). */
  meta?: (folder: PrivateFolder) => ReactNode;
  /** Raison pour laquelle un dossier ne peut pas être choisi (affichée) ; `null` s'il peut l'être. */
  disabledReason?: (folder: PrivateFolder) => string | null;
  /** Dossiers ouverts au départ, en plus du chemin vers la sélection. */
  defaultExpanded?: Iterable<string>;
  className?: string;
}

/**
 * Arborescence de dossiers (motif ARIA « tree ») : une seule tabulation pour y
 * entrer, flèches haut/bas pour parcourir, droite/gauche pour ouvrir, fermer
 * ou remonter, Entrée pour choisir. Lignes de 44 px au doigt, 36 px à la souris.
 */
export function FolderTree({
  label,
  index,
  selectedId,
  onSelect,
  meta,
  disabledReason,
  defaultExpanded,
  className,
}: FolderTreeProps) {
  const ancestorsOf = (id: string | null) =>
    id
      ? pathTo(index, id)
          .slice(0, -1)
          .map((folder) => folder.id)
      : [];

  const [expanded, setExpanded] = useState(
    () => new Set([...(defaultExpanded ?? []), ...ancestorsOf(selectedId)]),
  );
  // La sélection change ailleurs (grille, fil d'Ariane) : son chemin s'ouvre.
  const [lastSelected, setLastSelected] = useState(selectedId);
  if (selectedId !== lastSelected) {
    setLastSelected(selectedId);
    const missing = ancestorsOf(selectedId).filter((id) => !expanded.has(id));
    if (missing.length > 0) setExpanded(new Set([...expanded, ...missing]));
  }

  const [focusId, setFocusId] = useState<string | null>(selectedId);
  const treeRef = useRef<HTMLUListElement>(null);

  const visible: VisibleNode[] = [];
  const walk = (parentId: string | null, level: number) => {
    for (const folder of index.children.get(parentId) ?? []) {
      const hasChildren = (index.children.get(folder.id)?.length ?? 0) > 0;
      const isExpanded = hasChildren && expanded.has(folder.id);
      visible.push({
        folder,
        level,
        hasChildren,
        expanded: isExpanded,
        parentId,
      });
      if (isExpanded) walk(folder.id, level + 1);
    }
  };
  walk(null, 1);

  // Une seule ligne dans l'ordre de tabulation : celle qui a le focus, sinon la sélection, sinon la première.
  const tabbableId =
    visible.find((node) => node.folder.id === focusId)?.folder.id ??
    visible.find((node) => node.folder.id === selectedId)?.folder.id ??
    visible[0]?.folder.id;

  const focusRow = (id: string) => {
    setFocusId(id);
    treeRef.current
      ?.querySelector<HTMLElement>(`[data-folder="${id}"]`)
      ?.focus();
  };

  const toggle = (id: string, open?: boolean) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (open ?? !next.has(id)) next.add(id);
      else next.delete(id);
      return next;
    });

  function onKeyDown(event: KeyboardEvent<HTMLElement>, node: VisibleNode) {
    const position = visible.findIndex((n) => n.folder.id === node.folder.id);
    switch (event.key) {
      case 'ArrowDown':
        if (visible[position + 1]) focusRow(visible[position + 1].folder.id);
        break;
      case 'ArrowUp':
        if (visible[position - 1]) focusRow(visible[position - 1].folder.id);
        break;
      case 'ArrowRight':
        if (node.hasChildren && !node.expanded) toggle(node.folder.id, true);
        else if (node.expanded) focusRow(visible[position + 1].folder.id);
        break;
      case 'ArrowLeft':
        if (node.expanded) toggle(node.folder.id, false);
        else if (node.parentId) focusRow(node.parentId);
        break;
      case 'Home':
        focusRow(visible[0].folder.id);
        break;
      case 'End':
        focusRow(visible[visible.length - 1].folder.id);
        break;
      case 'Enter':
      case ' ':
        if (!disabledReason?.(node.folder)) onSelect(node.folder.id);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <ul
      ref={treeRef}
      role="tree"
      aria-label={label}
      className={cx('flex flex-col gap-0.5', className)}
    >
      {visible.map((node) => {
        const { folder } = node;
        const selected = folder.id === selectedId;
        const reason = disabledReason?.(folder) ?? null;
        const Icon =
          folder.confidentiality === 'CONFIDENTIEL'
            ? FolderLock
            : node.expanded
              ? FolderOpen
              : Folder;
        return (
          <li
            key={folder.id}
            role="treeitem"
            data-folder={folder.id}
            aria-level={node.level}
            aria-selected={selected}
            aria-expanded={node.hasChildren ? node.expanded : undefined}
            aria-disabled={reason ? true : undefined}
            tabIndex={folder.id === tabbableId ? 0 : -1}
            onFocus={() => setFocusId(folder.id)}
            onKeyDown={(event) => onKeyDown(event, node)}
            onClick={() => {
              if (!reason) onSelect(folder.id);
            }}
            style={{ paddingLeft: `${(node.level - 1) * 16 + 4}px` }}
            className={cx(
              'group flex min-h-11 cursor-pointer items-center gap-1 rounded-lg pr-2.5 text-[13px] outline-none transition-colors lg:min-h-9',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
              selected
                ? 'bg-brand-soft font-semibold text-brand'
                : reason
                  ? 'cursor-not-allowed text-ink-subtle'
                  : 'text-ink hover:bg-ink/5',
            )}
          >
            {node.hasChildren ? (
              <span
                // Hors de l'ordre de tabulation : les flèches du clavier font ce travail.
                aria-hidden="true"
                onClick={(event) => {
                  event.stopPropagation();
                  toggle(folder.id);
                }}
                className="grid size-8 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-ink/10 hover:text-ink lg:size-6"
              >
                <ChevronRight
                  size={15}
                  className={cx(
                    'transition-transform duration-200 motion-reduce:transition-none',
                    node.expanded && 'rotate-90',
                  )}
                />
              </span>
            ) : (
              <span aria-hidden="true" className="size-8 shrink-0 lg:size-6" />
            )}
            <Icon
              size={16}
              aria-hidden="true"
              className={cx(
                'shrink-0',
                selected
                  ? 'fill-brand/20'
                  : 'text-ink-subtle group-hover:text-ink-muted',
              )}
            />
            <span className="ml-1.5 min-w-0 flex-1 truncate">
              {folder.name}
              {reason && (
                <span className="ml-2 text-xs font-normal">· {reason}</span>
              )}
            </span>
            {meta && (
              <span className="ml-2 shrink-0 text-xs font-normal tabular-nums text-ink-subtle">
                {meta(folder)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
