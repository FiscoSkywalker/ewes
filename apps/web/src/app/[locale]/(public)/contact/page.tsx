import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ContactBlock } from '@/components/public/contact-block';
import { SectionHeading } from '@/components/public/section-heading';

/**
 * Page Contact (blueprint/15_Public_Site_Pages.md) — page statique ; en-tête
 * clair puis le même bloc Contact que l'Accueil (coordonnées + formulaire).
 * Seuls le formulaire et le décor topographique sont des composants client
 * isolés (blueprint/16_Rendering_State_Strategy.md §2/§4).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ContactPage');
  return { title: t('eyebrow'), description: t('description') };
}

export default async function ContactPage() {
  const t = await getTranslations('ContactPage');

  return (
    <div className="text-sand">
      <div className="px-6 pb-16 pt-28 md:px-16 md:pt-36">
        <div className="mx-auto w-full max-w-[1440px]">
          <SectionHeading
            eyebrow={t('eyebrow')}
            title={t('title')}
            description={t('description')}
          />
        </div>
      </div>
      <ContactBlock showHeading={false} />
    </div>
  );
}
