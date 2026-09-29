const DEFAULT_REDIRECT = '/admin';

/**
 * Valide la destination `?next=` de la page de connexion : uniquement un
 * chemin interne du portail (`/admin…`). Tout le reste (URL absolue, `//hôte`,
 * antislash, autre section du site) retombe sur `/admin` — évite qu'un lien
 * piégé serve de redirection ouverte après une connexion réussie.
 */
export function safeAdminRedirect(target: string | undefined): string {
  if (!target) return DEFAULT_REDIRECT;
  if (!target.startsWith('/admin')) return DEFAULT_REDIRECT;
  if (target.startsWith('//') || target.includes('\\')) return DEFAULT_REDIRECT;
  // `/administrateur`, `/admin.evil` : seul `/admin` ou `/admin/...` est valide.
  const next = target.charAt('/admin'.length);
  if (next !== '' && next !== '/' && next !== '?') return DEFAULT_REDIRECT;
  return target;
}
