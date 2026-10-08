/**
 * Instant situé `months` mois civils avant `from` (UTC). Le jour est ramené au
 * dernier jour du mois d'arrivée quand il n'existe pas (le 29 février moins
 * 12 mois donne le 28 février), comme le fait `now() - interval '12 months'`
 * de PostgreSQL : ainsi une borne calculée ici n'est jamais plus récente que
 * celle que la base accepte.
 */
export function monthsBefore(from: Date, months: number): Date {
  const totalMonths = from.getUTCFullYear() * 12 + from.getUTCMonth() - months;
  const year = Math.floor(totalMonths / 12);
  const month = totalMonths - year * 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(from.getUTCDate(), lastDay),
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds(),
    ),
  );
}
