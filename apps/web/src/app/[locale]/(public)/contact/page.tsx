import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Mail, Phone } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import { ContactForm } from '@/components/public/contact-form';

/**
 * Page Contact (blueprint/15_Public_Site_Pages.md) — page statique, seul le
 * formulaire est un composant client isolé (`ContactForm`), conformément à
 * blueprint/16_Rendering_State_Strategy.md §2/§4.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ContactPage');
  return { title: t('eyebrow'), description: t('description') };
}

export default async function ContactPage() {
  const t = await getTranslations('ContactPage');

  return (
    <div className="px-6 py-16 text-sand md:px-16 md:py-24">
      <SectionHeading
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />

      <div className="mx-auto mt-12 grid max-w-4xl gap-8 border border-primary/25 bg-surface-elevated p-6 md:grid-cols-[1fr_1.4fr] md:p-10">
        <div>
          <div className="mb-1 font-mono text-xs uppercase tracking-wider text-primary">
            {t('quickContactTitle')}
          </div>
          <div className="mt-6 space-y-3 font-mono text-xs text-sand/65">
            <a
              href="tel:+243818153110"
              className="flex items-center gap-2 transition-colors hover:text-primary"
            >
              <Phone size={14} className="text-primary" />
              +243 81 81 53 110
            </a>
            <a
              href="mailto:contact@ewes.cd"
              className="flex items-center gap-2 transition-colors hover:text-primary"
            >
              <Mail size={14} className="text-primary" />
              contact@ewes.cd
            </a>
          </div>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
