# EWES
## Stratégie de Rendu et de Gestion d'État
### Version 1.0 | Statut : Draft

---

# 1. Principe

Ce document opérationnalise la règle directrice posée dans `06_Application_Architecture.md` : rendu serveur maximal pour le site public, application client-side pour le portail d'administration et l'espace documentaire privé. Toute décision de rendu doit être justifiée par la fraîcheur réelle des données, pas par défaut.

# 2. Mode de rendu par page (site public)

| Page | Mode | Revalidation |
|---|---|---|
| Accueil | Exception validée : Client Component pleine page (voir note ci-dessous) | — |
| À propos | SSG + ISR | Longue (ex. 24h) |
| Nos services | SSG + ISR | Longue (ex. 24h) |
| Nos réalisations (liste) | ISR | Courte (ex. 5-15 min), invalidée à la publication/dépublication |
| Fiche réalisation | SSG + ISR | Invalidée à la publication de la fiche concernée |
| Actualités & publications (liste) | ISR | Courte (ex. 5-15 min) |
| Article détail | SSG + ISR | Invalidée à la publication de l'article concerné |
| Documents (publics) | ISR | Courte |
| Contact | Statique (page), formulaire en composant client isolé | — |

L'invalidation ciblée (revalidation à la demande déclenchée par la mutation d'administration) est préférée à une revalidation temporisée large, pour éviter qu'un contenu publié mette plusieurs minutes à apparaître.

> Note (2026-10-06) — **Parution programmée.** Un contenu publié avec une date future (`publishedAt`, aujourd'hui posable sur les articles) est filtré par le public tant que la date n'est pas atteinte, mais personne n'agit à cet instant : sans autre mécanisme, le cache ne se rafraîchirait qu'à son expiration (1 h). L'API porte donc une surveillance (`ScheduledPublicationWatcher`, `common/revalidation/`) : un simple minuteur (aucun planificateur tiers, une seule instance), toutes les 60 s (`PUBLICATION_WATCH_INTERVAL_SECONDS`, `0` la désactive ; inactive aussi si `WEB_REVALIDATE_URL`/`REVALIDATE_SECRET` manquent), qui repère les articles, réalisations et documents publics **publiés, non supprimés, dont la date vient d'être atteinte** et revalide les mêmes tags qu'une publication (`article:<slug>` + `articles`, `realisation:<slug>` + `realisations` — qui rafraîchit aussi les chiffres clés —, `document:<slug>` + `documents`). Seules les parutions réellement programmées sont reprises (`publishedAt > updatedAt` : une publication immédiate ou antidatée a déjà revalidé le site). Fenêtre glissante qui ne s'avance que si la base a répondu, et qui remonte de 65 min au démarrage (rattrapage d'un arrêt de l'API) ; un refus du site est rejoué à chaque balayage jusqu'à réussite, puis abandonné au-delà de la durée du cache de repli. Mesure sur le site réel : article programmé à +45 s visible 1,4 s après l'échéance (intervalle de test de 5 s) ; sans la surveillance, toujours absent 60 s plus tard.

**Exception validée — Accueil (2026-09-29) :** à la demande explicite du client, l'Accueil reproduit un prototype immersif (scène WebGL Three.js/React Three Fiber — globe/eau/infrastructure —, défilement piloté GSAP/Lenis). Rendre ce décor au premier chargement serveur n'est ni possible ni souhaitable (dépendance à `window`/WebGL) : la page est donc un arbre Client Component complet (`components/home/home-experience.tsx`), à l'exception du `generateMetadata` du `page.tsx` qui reste serveur. Cette dérogation est scopée à cette seule page — toutes les autres pages publiques (`a-propos`, `services`, `realisations`, `actualites`, `documents`, `contact`) restent des Server Components conformes à la règle ci-dessus, sans décor WebGL. Utilisateur informé du compromis SEO/perf avant implémentation (voir `21_Backlog_and_Session_Handoff.md`, journal du 2026-09-29).

# 3. Portail d'administration et espace documentaire privé

Ces zones sont des Client Components sous un layout dédié (`app/(admin)/...`), sans SSR de données métier. La récupération de données utilise TanStack Query (cache, revalidation, état de chargement/erreur standardisé). L'authentification est vérifiée par middleware Next.js avant tout rendu de la zone.

> Implémentation (2026-10-02) : racine `app/admin/` (layout `<html>` propre), écrans authentifiés dans le groupe `app/admin/(portal)/` monté dans `AdminShell` (vérifie `GET /me`, redirige vers la connexion sinon) ; la connexion (`app/admin/login`) reste hors de la coquille. Les appels de données passent par le proxy BFF générique `/api/backend/<chemin>` → `${NEXT_PUBLIC_API_URL}/<chemin>` (`app/api/backend/[...path]/route.ts`) : jeton d'accès lu dans le cookie httpOnly et jamais exposé au navigateur, segments de chemin validés (pas de `..`), mutations refusées si l'en-tête `Origin` n'est pas celui du site, corps transmis en flux (téléversements). Le proxy n'autorise rien : les guards NestJS restent seuls juges. Côté client, `backendJson()` (`lib/api/backend.ts`) s'appuie sur `adminFetch` (une rotation silencieuse du jeton sur 401).

# 4. Isolation des composants interactifs côté public

Formulaire de contact, filtres de portfolio/actualités, sélecteur de langue, uploader (le cas échéant côté public) sont chacun un sous-composant `"use client"` minimal, monté dans une page Server Component par ailleurs statique. Une page publique ne devient jamais un Client Component dans son ensemble pour ce motif.

# 5. Gestion d'état

État serveur (données métier) : TanStack Query côté admin ; props serveur + revalidation Next.js côté public. État de formulaire : React Hook Form + Zod (validation partagée avec les DTO NestJS autant que possible) — installés le 2026-10-02 avec le premier vrai formulaire (documents publics, `components/admin/documents/document-form.tsx`, schéma dans `lib/admin/public-documents.ts`) : champs en texte validés côté navigateur par confort, refus de l'API (`details` par champ) affichés sous les champs, le champ vide d'un facultatif part en `null`. État UI éphémère (ouverture de menu, onglet actif) : état local du composant, jamais remonté globalement sans raison. Pas de store global (Redux/Zustand) tant qu'aucun besoin transverse ne le justifie — cohérent avec le principe de sobriété du blueprint.

# 6. Règles de mutation (admin)

Les boutons de soumission se désactivent pendant la requête, les listes dépendantes ne sont invalidées qu'après confirmation du résultat par le serveur (pas de mise à jour optimiste sur les actions de publication ou de droits d'accès, pour éviter tout affichage trompeur d'un état non confirmé).

# 7. Références

`06_Application_Architecture.md`, `08_API_Specification.md`, `15_Public_Site_Pages.md`, `19_AI_Coding_Rules.md`.
