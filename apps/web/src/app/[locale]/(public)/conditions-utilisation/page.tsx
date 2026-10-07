import type { Metadata } from 'next';
import { LegalPage, legalMetadata } from '@/components/public/legal-page';

/** Document légal (blueprint/15_Public_Site_Pages.md) : contenu dans `lib/legal/`. */
type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = ({ params }: Props): Promise<Metadata> =>
  legalMetadata('conditions-utilisation', params);

export default function ConditionsUtilisationPage({ params }: Props) {
  return <LegalPage slug="conditions-utilisation" params={params} />;
}
