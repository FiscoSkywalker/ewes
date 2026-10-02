import { Clock } from 'lucide-react';
import { Badge, StatusChip } from '../ui';
import type { ContentStatus } from '@/lib/admin/public-documents';

/** Parution programmée : publié, mais la date de publication n'est pas encore atteinte. */
export function isScheduled(status: ContentStatus, publishedAt: string | null) {
  return (
    status === 'PUBLISHED' &&
    publishedAt !== null &&
    new Date(publishedAt).getTime() > Date.now()
  );
}

/** Statut d'un contenu éditorial ; « Programmé » tant que la date de parution est future. */
export function PublicationBadge({
  status,
  publishedAt,
  feminine = false,
}: {
  status: ContentStatus;
  publishedAt: string | null;
  feminine?: boolean;
}) {
  return isScheduled(status, publishedAt) ? (
    <Badge tone="brand" icon={Clock}>
      Programmé{feminine ? 'e' : ''}
    </Badge>
  ) : (
    <StatusChip kind="content" value={status} feminine={feminine} />
  );
}
