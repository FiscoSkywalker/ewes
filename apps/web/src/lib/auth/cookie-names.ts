/**
 * Noms des cookies httpOnly de session admin. Isolés dans un fichier sans
 * dépendance à `next/headers` (module Node) pour rester importables
 * tel quel depuis `middleware.ts` (runtime Edge).
 */
export const ACCESS_TOKEN_COOKIE = 'ewes_access_token';
export const REFRESH_TOKEN_COOKIE = 'ewes_refresh_token';
