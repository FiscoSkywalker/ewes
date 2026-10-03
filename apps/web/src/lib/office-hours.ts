/**
 * Horaires d'ouverture du siège : logique partagée par le site public (page
 * Contact, accueil) et l'aperçu du portail (Paramètres > Général), pour que
 * l'administrateur voie exactement ce que le visiteur lira.
 */

export interface OfficeHours {
  /** Jours d'ouverture au format `Date.getDay()` (0 = dimanche). */
  days: readonly number[];
  /** « HH:MM » à l'heure du siège. */
  opensAt: string;
  closesAt: string;
  /** Fuseau IANA du siège (Lubumbashi). */
  timeZone: string;
}

/** Semaine à la française : du lundi au dimanche, valeurs de `Date.getDay()`. */
export const WEEK_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Jour (0 = dimanche) et minutes écoulées depuis minuit à l'heure du siège. */
export function officeClock(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
      get('weekday'),
    ),
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** Les bureaux sont-ils ouverts à cet instant ? */
export function isOpenAt(hours: OfficeHours, now = new Date()): boolean {
  const { day, minutes } = officeClock(hours.timeZone, now);
  return (
    hours.days.includes(day) &&
    minutes >= toMinutes(hours.opensAt) &&
    minutes < toMinutes(hours.closesAt)
  );
}

/** Heure locale du siège, mise en forme pour la langue (« 14:05 »). */
export function officeTimeLabel(
  timeZone: string,
  locale: string,
  now = new Date(),
) {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);
}

/** Nom d'un jour dans la langue demandée, avec majuscule (« Lundi » / « Monday »). */
export function dayName(
  day: number,
  locale: string,
  style: 'long' | 'short' = 'long',
) {
  // Le 7 janvier 2024 est un dimanche : `day` se lit comme `Date.getDay()`.
  const name = new Intl.DateTimeFormat(locale, {
    weekday: style,
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2024, 0, 7 + day)));
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Jours regroupés en suites consécutives, du lundi au dimanche (pas de retour à la ligne de semaine). */
export function consecutiveRuns(days: readonly number[]): number[][] {
  const runs: number[][] = [];
  for (const day of WEEK_ORDER) {
    if (!days.includes(day)) continue;
    const last = runs.at(-1);
    const previous = last?.at(-1);
    if (
      last &&
      previous !== undefined &&
      WEEK_ORDER.indexOf(day) === WEEK_ORDER.indexOf(previous) + 1
    ) {
      last.push(day);
    } else {
      runs.push([day]);
    }
  }
  return runs;
}

/** « Lundi – Vendredi », « Samedi », « Lundi – Mercredi, Vendredi » : une plage par suite de jours. */
export function formatRun(run: readonly number[], locale: string): string {
  const first = dayName(run[0], locale);
  return run.length === 1
    ? first
    : `${first} – ${dayName(run[run.length - 1], locale)}`;
}

export interface HoursRow {
  /** Jours concernés, ex. « Lundi – Vendredi ». */
  label: string;
  /** Plage horaire ; `null` : fermé. */
  value: string | null;
}

/** Lignes du tableau d'horaires : les suites de jours ouverts, puis celles des jours fermés. */
export function hoursRows(hours: OfficeHours, locale: string): HoursRow[] {
  const range = `${hours.opensAt} – ${hours.closesAt}`;
  const closed = WEEK_ORDER.filter((day) => !hours.days.includes(day));
  return [
    ...consecutiveRuns(hours.days).map((run) => ({
      label: formatRun(run, locale),
      value: range,
    })),
    ...consecutiveRuns(closed).map((run) => ({
      label: formatRun(run, locale),
      value: null,
    })),
  ];
}
