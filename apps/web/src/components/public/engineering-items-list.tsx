'use client';

import { useTranslations } from 'next-intl';
import { serviceIcon } from '@/lib/service-icons';
import { Box, CheckCircle2, Compass, Ruler } from 'lucide-react';

interface EngineeringItem {
  title: string;
  text: string;
  /** Clé du pictogramme choisi dans le portail. */
  icon?: string | null;
}

const ICONS = [Box, CheckCircle2, Ruler, Compass];

/**
 * Volets du pôle Travaux d'ingénierie (chapitre de l'Accueil) : ceux du
 * portail (`offerings`), sinon les textes d'origine des messages.
 */
export function EngineeringItemsList({
  offerings,
}: {
  offerings?: EngineeringItem[];
}) {
  const t = useTranslations('Engineering');
  const items = offerings ?? (t.raw('items') as EngineeringItem[]);

  return (
    <div className="pointer-events-auto mt-10 border-y border-sand/20">
      <div className="flex items-center gap-2 py-5 text-xs font-bold uppercase tracking-[0.14em] text-pole">
        <Compass size={14} />
        {t('sectionLabel')}
      </div>

      <div className="grid grid-cols-1 text-xs sm:grid-cols-2" data-stagger>
        {items.map(({ title, text, icon }, index) => {
          const Icon = serviceIcon(icon) ?? ICONS[index] ?? Compass;
          return (
            <div
              key={title}
              className="border-t border-sand/20 py-5 sm:odd:pr-7 sm:even:border-l sm:even:pl-7"
            >
              <Icon size={16} className="text-pole" />
              <strong className="mt-3 block font-heading text-lg font-semibold text-sand">
                {title}
              </strong>
              <span className="mt-1 block text-[11px] leading-5 text-sand/52">
                {text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
