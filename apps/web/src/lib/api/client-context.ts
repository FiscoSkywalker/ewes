import { headers } from 'next/headers';
import { isIP } from 'node:net';

/**
 * Contexte du navigateur à transmettre à l'API depuis une route BFF
 * (`app/api/...`). Sans cela, l'API ne voit que l'adresse du serveur Next :
 * tous les utilisateurs du portail partageraient la même limite de fréquence
 * (60 requêtes/min, 5 connexions/min) et le journal d'audit enregistrerait
 * l'adresse du serveur et le user-agent de Node (blueprint/10_Security.md §3).
 *
 * L'adresse est la dernière de `X-Forwarded-For`, c'est-à-dire celle que le
 * proxy de confiance (Nginx, blueprint/18_Deployment.md) a lui-même ajoutée :
 * les valeurs plus anciennes sont écrites par le client et falsifiables.
 * Valeur invalide ou absente (développement sans proxy) : rien n'est transmis
 * et l'API retombe sur l'adresse de la connexion.
 *
 * L'API ne fait confiance à cet en-tête que si `TRUST_PROXY_HOPS` ≥ 1.
 */
export async function clientContextHeaders(): Promise<Record<string, string>> {
  const incoming = await headers();
  const context: Record<string, string> = {};

  const ip = incoming.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  if (ip && isIP(ip)) context['X-Forwarded-For'] = ip;

  const userAgent = incoming.get('user-agent');
  if (userAgent) context['User-Agent'] = userAgent;

  return context;
}
