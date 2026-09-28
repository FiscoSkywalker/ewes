/** Convertit une durée façon `.env` ("15m", "7d") en secondes entières. */
export function parseDurationToSeconds(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) {
    throw new Error(
      `Format de durée invalide: "${duration}" (attendu: nombre + s/m/h/d)`,
    );
  }
  const value = Number(match[1]);
  const unitSeconds = { s: 1, m: 60, h: 3_600, d: 86_400 }[
    match[2] as 's' | 'm' | 'h' | 'd'
  ];
  return value * unitSeconds;
}
