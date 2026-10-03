'use client';

import { useState } from 'react';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { SOCIAL_FIELDS, type GeneralFormValues } from '@/lib/admin/settings';
import { hoursRows, isOpenAt } from '@/lib/office-hours';
import { Card, SegmentedControl } from '../ui';

type Locale = 'fr' | 'en';

const TEXTS: Record<
  Locale,
  {
    reach: string;
    open: string;
    closed: string;
    closedDay: string;
    hours: string;
  }
> = {
  fr: {
    reach: 'Nous joindre',
    open: 'Bureaux ouverts',
    closed: 'Bureaux fermés',
    closedDay: 'Fermé',
    hours: 'Horaires',
  },
  en: {
    reach: 'Get in touch',
    open: 'Office open',
    closed: 'Office closed',
    closedDay: 'Closed',
    hours: 'Opening hours',
  },
};

/** Fuseau du siège : fixe (Lubumbashi), il n'est pas modifiable depuis le portail. */
const OFFICE_TIME_ZONE = 'Africa/Lubumbashi';

/**
 * Aperçu en direct du bloc « Nous joindre » du pied de page et de l'état des
 * bureaux, d'après ce qui est saisi (même règles que le site : l'adresse
 * anglaise vide retombe sur le français, un réseau vide n'apparaît pas). Les
 * couleurs sont celles du pied de page du site (fond nuit), pas du thème du
 * portail : c'est ce que le visiteur verra. Simplifié : la mise en page exacte
 * se voit sur le site.
 */
export function ContactPreview({ values }: { values: GeneralFormValues }) {
  const [locale, setLocale] = useState<Locale>('fr');
  const text = TEXTS[locale];
  const address = (locale === 'en' && values.addressEn) || values.addressFr;
  const socials = SOCIAL_FIELDS.filter((network) => values[network.field]);
  const hours = {
    days: values.officeDays,
    opensAt: values.opensAt,
    closesAt: values.closesAt,
    timeZone: OFFICE_TIME_ZONE,
  };
  const valid =
    /^\d\d:\d\d$/.test(values.opensAt) && /^\d\d:\d\d$/.test(values.closesAt);
  const open = valid && isOpenAt(hours);
  const rows = valid ? hoursRows(hours, locale) : [];

  const empty = 'text-[#7f979f]';

  return (
    <Card
      title="Aperçu sur le site"
      description="Le pied de page, tel que le verront les visiteurs."
      actions={
        <SegmentedControl<Locale>
          label="Langue de l’aperçu"
          size="sm"
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'fr', label: 'FR' },
            { value: 'en', label: 'EN' },
          ]}
        />
      }
    >
      <div
        role="group"
        aria-label="Aperçu du pied de page du site"
        className="overflow-hidden rounded-xl bg-[#06161b] p-5 text-[13px] text-[#a3b8bf]"
      >
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#e4eef0]">
          {text.reach}
        </p>
        <ul className="grid gap-2.5">
          <li className="flex items-start gap-2.5">
            <Phone
              size={14}
              aria-hidden="true"
              className="mt-1 shrink-0 text-[#5ad1a1]"
            />
            <span className={values.phone ? '' : empty}>
              {values.phone || 'Numéro de téléphone'}
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Mail
              size={14}
              aria-hidden="true"
              className="mt-1 shrink-0 text-[#5ad1a1]"
            />
            <span className={values.email ? 'break-all' : empty}>
              {values.email || 'Adresse e-mail'}
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <MapPin
              size={14}
              aria-hidden="true"
              className="mt-1 shrink-0 text-[#5ad1a1]"
            />
            <span className={address ? 'leading-5' : empty}>
              {address || 'Adresse du siège'}
            </span>
          </li>
        </ul>

        {socials.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {socials.map((network) => (
              <li
                key={network.id}
                className="rounded-full border border-[#e4eef0]/20 px-3 py-1 text-xs text-[#e4eef0]"
              >
                {network.label}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 border-t border-[#e4eef0]/12 pt-4">
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-[#e4eef0]">
            <Clock size={13} aria-hidden="true" className="text-[#5ad1a1]" />
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${open ? 'bg-[#5ad1a1]' : 'bg-[#eba36f]'}`}
            />
            {open ? text.open : text.closed}
            <span className="font-mono text-[10.5px] font-normal text-[#a3b8bf]">
              · {text.hours}
            </span>
          </p>
          {rows.length > 0 ? (
            <dl className="mt-2.5 grid gap-1.5 text-xs">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-4">
                  <dt>{row.label}</dt>
                  <dd className="tabular-nums">
                    {row.value ?? text.closedDay}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className={`mt-2.5 text-xs ${empty}`}>
              Horaires non renseignés.
            </p>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-subtle">
        L’état « ouvert » suit l’heure de Lubumbashi, à l’instant présent.
      </p>
    </Card>
  );
}
