import {
  File,
  FileSpreadsheet,
  FileText,
  FileType,
  Folder,
  FolderLock,
  Image as ImageIcon,
  Presentation,
  type LucideIcon,
} from 'lucide-react';
import { cx } from '@/lib/admin/cx';
import {
  fileTypeOf,
  type Confidentiality,
  type FileFamily,
} from '@/lib/admin/private-docs';

const FAMILIES: Record<FileFamily, { icon: LucideIcon; tile: string }> = {
  pdf: { icon: FileText, tile: 'bg-bad-soft text-bad' },
  word: { icon: FileType, tile: 'bg-brand-soft text-brand' },
  excel: { icon: FileSpreadsheet, tile: 'bg-ok-soft text-ok' },
  powerpoint: { icon: Presentation, tile: 'bg-ing-soft text-ing' },
  image: { icon: ImageIcon, tile: 'bg-env-soft text-env' },
};

const SIZES = {
  sm: { tile: 'size-9 rounded-lg', icon: 17 },
  md: { tile: 'size-11 rounded-xl', icon: 20 },
  lg: { tile: 'size-14 rounded-2xl', icon: 26 },
} as const;

/**
 * Pastille du type de fichier. Décorative : le type est toujours écrit à
 * côté (« PDF · 2,4 Mo »), la teinte aide seulement à balayer une liste.
 */
export function FileIcon({
  mimeType,
  size = 'md',
  className,
}: {
  mimeType: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const family = fileTypeOf(mimeType)?.family;
  const style = family ? FAMILIES[family] : null;
  const Icon = style?.icon ?? File;
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid shrink-0 place-items-center',
        SIZES[size].tile,
        style?.tile ?? 'bg-sunken text-ink-subtle',
        className,
      )}
    >
      <Icon size={SIZES[size].icon} strokeWidth={1.75} />
    </span>
  );
}

/** Pastille de dossier ; cadenas pour un dossier restreint ou confidentiel (doublé d'un libellé ailleurs). */
export function FolderIcon({
  confidentiality,
  size = 'md',
  className,
}: {
  confidentiality?: Confidentiality;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const locked = confidentiality === 'CONFIDENTIEL';
  const Icon = locked ? FolderLock : Folder;
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid shrink-0 place-items-center bg-brand-soft text-brand',
        SIZES[size].tile,
        className,
      )}
    >
      <Icon
        size={SIZES[size].icon}
        strokeWidth={1.75}
        className="fill-brand/15"
      />
    </span>
  );
}
