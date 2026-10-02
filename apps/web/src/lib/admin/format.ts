const relative = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.35],
  ['month', 12],
  ['year', Number.POSITIVE_INFINITY],
];

/** « il y a 5 minutes », « hier »… (portail en français, fuseau du navigateur). */
export function relativeTime(iso: string, now: number = Date.now()): string {
  let value = (new Date(iso).getTime() - now) / 1000;
  if (Math.abs(value) < 45) return 'à l’instant';
  for (const [unit, size] of STEPS) {
    if (Math.abs(value) < size) {
      return relative.format(Math.round(value), unit);
    }
    value /= size;
  }
  return relative.format(Math.round(value), 'year');
}

const longDate = new Intl.DateTimeFormat('fr', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function formatLongDate(date: Date): string {
  return longDate.format(date);
}

const dayKey = new Intl.DateTimeFormat('fr', {
  day: 'numeric',
  month: 'long',
});

/** Libellé de regroupement par jour : « Aujourd'hui », « Hier », « 28 septembre ». */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (diffDays === 0) return 'Aujourd’hui';
  if (diffDays === 1) return 'Hier';
  return dayKey.format(date);
}

/** Comparaison insensible à la casse et aux accents (recherche, palette). */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .toLowerCase();
}

/** « 1 message », « 3 messages ». */
export function plural(count: number, singular: string, pluralForm?: string) {
  return `${count} ${count > 1 ? (pluralForm ?? `${singular}s`) : singular}`;
}
