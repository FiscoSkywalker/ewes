/**
 * Réseaux sociaux affichés dans le pied de page. Une adresse enregistrée devient
 * un lien cliquable sur le site public : elle doit être en `https` et appartenir
 * bien au réseau annoncé (ni `javascript:`, ni faute de frappe, ni hameçonnage).
 */
export const SOCIAL_NETWORKS = {
  linkedin: { label: 'LinkedIn', hosts: ['linkedin.com'] },
  facebook: { label: 'Facebook', hosts: ['facebook.com', 'fb.com'] },
  x: { label: 'X', hosts: ['x.com', 'twitter.com'] },
  youtube: { label: 'YouTube', hosts: ['youtube.com', 'youtu.be'] },
} as const;

export type SocialNetwork = keyof typeof SOCIAL_NETWORKS;

/** Adresse normalisée, ou le message d'erreur à afficher sous le champ. */
export function checkSocialUrl(
  network: SocialNetwork,
  raw: string,
): { url: string } | { error: string } {
  const { label, hosts } = SOCIAL_NETWORKS[network];
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return {
      error: `Saisissez l’adresse complète de la page ${label}, par exemple https://www.${hosts[0]}/…`,
    };
  }
  if (url.protocol !== 'https:') {
    return { error: 'L’adresse doit commencer par https://' };
  }
  if (url.username || url.password) {
    return { error: 'Retirez les identifiants de l’adresse.' };
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (
    !hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
  ) {
    return { error: `Cette adresse ne mène pas à ${label}.` };
  }
  return { url: url.href };
}
