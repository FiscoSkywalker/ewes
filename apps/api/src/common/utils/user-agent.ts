/**
 * Libellé lisible d'un en-tête `User-Agent` (« Chrome sur Windows »), pour que
 * la personne reconnaisse ses appareils dans la liste de ses sessions. Table
 * volontairement courte : un navigateur ou un système non reconnu donne un
 * libellé générique, jamais l'en-tête brut (long, peu parlant, et il ne
 * faut pas rendre au client ce qu'il a envoyé tel quel).
 */
const BROWSERS: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

// Android et iPhone avant Linux et macOS : leurs en-têtes contiennent les deux.
const SYSTEMS: [RegExp, string][] = [
  [/Android/, 'Android'],
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux|X11/, 'Linux'],
];

export function describeUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) return 'Appareil inconnu';
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  if (browser && system) return `${browser} sur ${system}`;
  return browser ?? system ?? 'Appareil inconnu';
}
