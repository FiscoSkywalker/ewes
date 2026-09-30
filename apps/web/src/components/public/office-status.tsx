'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Clock } from 'lucide-react';
import { EWES_OFFICE_HOURS } from '@/data/contact';

interface LocalTime {
  label: string;
  open: boolean;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Heure et jour courants à Lubumbashi, quel que soit le fuseau du visiteur. */
function readLocalTime(locale: string): LocalTime {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EWES_OFFICE_HOURS.timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    get('weekday'),
  );
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));

  return {
    label: new Intl.DateTimeFormat(locale, {
      timeZone: EWES_OFFICE_HOURS.timeZone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(now),
    open:
      (EWES_OFFICE_HOURS.openDays as readonly number[]).includes(day) &&
      minutes >= toMinutes(EWES_OFFICE_HOURS.opensAt) &&
      minutes < toMinutes(EWES_OFFICE_HOURS.closesAt),
  };
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
  const [time, setTime] = useState<LocalTime | null>(null);

  useEffect(() => {
    const tick = () => setTime(readLocalTime(locale));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [locale]);

  const hours = `${EWES_OFFICE_HOURS.opensAt} – ${EWES_OFFICE_HOURS.closesAt}`;

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
          <dd className="flex justify-between gap-4">
            <span>{t('weekdays')}</span>
            <span className="tabular-nums text-on-night-muted">{hours}</span>
          </dd>
          <dd className="flex justify-between gap-4">
            <span>{t('weekend')}</span>
            <span className="text-on-night-muted">{t('closedDay')}</span>
          </dd>
        </dl>

        <p className="mt-6 text-xs leading-5 text-on-night-muted/80">
          {t('note')}
        </p>
      </div>
    </div>
  );
}
