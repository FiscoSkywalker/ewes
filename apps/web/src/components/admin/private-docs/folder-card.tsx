import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cx, focusRing } from '@/lib/admin/cx';
import { plural } from '@/lib/admin/format';
import {
  deepDocumentCount,
  folderHref,
  type FolderIndex,
  type PrivateFolder,
} from '@/lib/admin/private-docs';
import { StatusChip } from '../ui';
import { FolderIcon } from './file-icon';

/** « 2 sous-dossiers · 14 documents » (documents des sous-dossiers compris). */
export function folderSummary(index: FolderIndex, folder: PrivateFolder) {
  const subfolders = index.children.get(folder.id)?.length ?? 0;
  const documents = deepDocumentCount(index, folder.id);
  const parts = [
    subfolders > 0 ? plural(subfolders, 'sous-dossier') : null,
    documents > 0 ? plural(documents, 'document') : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Vide';
}

/**
 * Carte de dossier : toute la carte est le lien (cible large au doigt). La
 * confidentialité est rappelée dès qu'elle n'est pas le niveau courant.
 */
export function FolderCard({
  folder,
  index,
  href = folderHref(folder.id),
}: {
  folder: PrivateFolder;
  index: FolderIndex;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(
        'group flex h-full min-h-[4.5rem] items-center gap-3.5 rounded-2xl border border-line bg-panel p-3.5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-panel active:translate-y-0 active:bg-sunken motion-reduce:hover:translate-y-0',
        focusRing,
      )}
    >
      <FolderIcon confidentiality={folder.confidentiality} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold text-ink">
          {folder.name}
        </span>
        <span className="mt-0.5 block truncate text-xs text-ink-subtle">
          {folderSummary(index, folder)}
        </span>
        {folder.confidentiality !== 'PUBLIC_INTERNE' && (
          <StatusChip
            kind="confidentiality"
            value={folder.confidentiality}
            className="mt-2"
          />
        )}
      </span>
      <ChevronRight
        size={18}
        aria-hidden="true"
        className="shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-brand motion-reduce:transition-none"
      />
    </Link>
  );
}
