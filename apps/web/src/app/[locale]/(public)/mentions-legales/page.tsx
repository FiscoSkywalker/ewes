import type { Metadata } from 'next';
import { LegalPage, legalMetadata } from '@/components/public/legal-page';

/** Document légal (blueprint/15_Public_Site_Pages.md) : contenu dans `lib/legal/`. */
type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = ({ params }: Props): Promise<Metadata> =>
  legalMetadata('mentions-legales', params);

export default function MentionsLegalesPage({ params }: Props) {
  return <LegalPage slug="mentions-legales" params={params} />;
}
