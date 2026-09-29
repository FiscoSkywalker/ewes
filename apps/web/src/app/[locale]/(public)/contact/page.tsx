import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MapPin, Mail, Phone } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import { ContactForm } from '@/components/public/contact-form';
import { EWES_CONTACT } from '@/data/contact';

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
  const tFooter = await getTranslations('Footer');

  return (
    <div className="px-6 pb-16 pt-28 text-sand md:px-16 md:pb-24 md:pt-36">
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
              href={EWES_CONTACT.phoneHref}
              className="flex items-center gap-2 transition-colors hover:text-primary"
            >
              <Phone size={14} className="text-primary" />
              {EWES_CONTACT.phoneDisplay}
            </a>
            <a
              href={`mailto:${EWES_CONTACT.email}`}
              className="flex items-center gap-2 break-all transition-colors hover:text-primary"
            >
              <Mail size={14} className="text-primary" />
              {EWES_CONTACT.email}
            </a>
            <p className="flex items-start gap-2 font-sans leading-5">
              <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
              {tFooter('address')}
            </p>
          </div>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
