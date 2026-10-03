'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Clock } from 'lucide-react';
import { hoursOf } from '@/lib/site-settings';
import {
  hoursRows,
  isOpenAt,
  officeTimeLabel,
  type OfficeHours,
} from '@/lib/office-hours';
import { useSiteSettings } from './site-settings-provider';

interface LocalTime {
  label: string;
  open: boolean;
}

/** Heure et état d'ouverture à Lubumbashi, quel que soit le fuseau du visiteur. */
function readLocalTime(hours: OfficeHours, locale: string): LocalTime {
  const now = new Date();
  return {
    label: officeTimeLabel(hours.timeZone, locale, now),
    open: isOpenAt(hours, now),
  };
}

/** Heure locale du siège, rafraîchie toutes les 15 s (null avant le montage). */
function useOfficeTime() {
  const locale = useLocale();
  const settings = useSiteSettings();
  const [time, setTime] = useState<LocalTime | null>(null);

  useEffect(() => {
    const hours = hoursOf(settings);
    const tick = () => setTime(readLocalTime(hours, locale));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [locale, settings]);

  return time;
}

/**
 * Version compacte (bloc Contact de l'Accueil) : pastille d'état et heure
 * locale sur une ligne, pour fonds nuit.
 */
export function OfficeStatusInline() {
  const t = useTranslations('ContactPage.status');
  const time = useOfficeTime();

  return (
    <p
      className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-on-night/15 bg-night/40 px-4 py-2 text-xs text-on-night backdrop-blur-sm transition-opacity duration-500 ${
        time ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${time?.open ? 'pulse-dot bg-malachite-bright' : 'bg-copper-bright'}`}
        aria-hidden="true"
      />
      <span className="font-semibold">
        {time?.open ? t('open') : t('closed')}
      </span>
      <span className="font-mono text-[11px] tabular-nums text-on-night-muted">
        {time?.label ?? '--:--'} · {t('label')}
      </span>
    </p>
  );
}

/**
 * Carte « Lubumbashi, maintenant » de la page Contact : heure locale du siège
 * et état des bureaux, utile aux partenaires étrangers. Composant client
 * isolé ; l'heure n'est calculée qu'après le montage pour éviter tout écart
 * d'hydratation entre le serveur et le navigateur.
 */
export function OfficeStatus() {
  const t = useTranslations('ContactPage.status');
  const locale = useLocale();
  const time = useOfficeTime();

  const settings = useSiteSettings();
  const rows = hoursRows(hoursOf(settings), locale);

  return (
    <div className="tone-night relative overflow-hidden rounded-sheet bg-night p-7 text-on-night shadow-[0_40px_80px_-40px_rgba(6,22,27,0.7)] sm:p-9">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_100%_0%,rgba(90,209,161,.16),transparent_70%),radial-gradient(60%_60%_at_0%_100%,rgba(140,195,214,.14),transparent_70%)]" />

      <div className="relative">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-on-night-muted">
          <Clock size={13} className="text-malachite-bright" />
          {t('label')}
        </p>

        <p
          className="mt-5 font-heading text-6xl font-bold tabular-nums tracking-tight sm:text-7xl"
          aria-live="off"
        >
          {time?.label ?? '--:--'}
        </p>

        <p
          className={`mt-4 inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-opacity ${
            time ? 'opacity-100' : 'opacity-0'
          } ${
            time?.open
              ? 'border-malachite-bright/40 text-malachite-bright'
              : 'border-copper-bright/40 text-copper-bright'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${time?.open ? 'pulse-dot bg-malachite-bright' : 'bg-copper-bright'}`}
          />
          {time?.open ? t('open') : t('closed')}
        </p>

        <dl className="mt-8 grid gap-3 border-t border-on-night/12 pt-6 text-sm">
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-night-muted">
            {t('hoursTitle')}
          </dt>
          {rows.map((row) => (
            <dd key={row.label} className="flex justify-between gap-4">
              <span>{row.label}</span>
              <span className="tabular-nums text-on-night-muted">
                {row.value ?? t('closedDay')}
              </span>
            </dd>
          ))}
        </dl>

        <p className="mt-6 text-xs leading-5 text-on-night-muted/80">
          {t('note')}
        </p>
      </div>
    </div>
  );
}
