/**
 * Kit de composants du portail (blueprint/05_UI_UX_System.md §4). Variantes
 * et états documentés en direct sur `/admin/composants` (développement).
 */
export { Badge, StatusChip, type BadgeTone, type StatusKind } from './badge';
export { BilingualField, type ContentLocale } from './bilingual-field';
export { Button, ButtonLink, IconButton, type ButtonVariant } from './button';
export { Card } from './card';
export {
  DataTable,
  type Column,
  type SortDirection,
  type SortState,
} from './data-table';
export {
  ConfirmProvider,
  Dialog,
  useConfirm,
  type ConfirmOptions,
} from './dialog';
export { Checkbox, Field, Input, Select, Switch, Textarea } from './field';
export { NetworkBanner, OfflineNotice, useOnline } from './network-banner';
export { Pagination } from './pagination';
export { SearchInput, useDebouncedValue } from './search-input';
export { SegmentedControl, type SegmentedOption } from './segmented-control';
export { LoadingRegion, Skeleton, SkeletonText } from './skeleton';
export { EmptyState, ErrorState } from './state';
export { ToastProvider, useToast, type ToastTone } from './toast';
