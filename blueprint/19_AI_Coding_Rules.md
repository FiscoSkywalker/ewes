# EWES
## Règles pour Agents IA
### Version 1.0 | Statut : Obligatoire

---

# 1. Contexte d'usage multi-outils

Ce projet est développé avec **Claude Code** et **Cursor**, potentiellement par des sessions différentes et non contiguës (la fenêtre d'usage de Claude Code est limitée à environ 5h). Aucun agent ne doit supposer qu'il a accès à l'historique d'une conversation précédente. Le système AIOS (`blueprint/`) et `21_Backlog_and_Session_Handoff.md` sont la mémoire persistante du projet — voir aussi `CLAUDE.md` et `.cursor/rules/` à la racine, qui pointent vers ce système et sont chargés automatiquement par chaque outil.

# 2. Contexte avant de coder (début de session)

Avant toute modification de code, lire dans l'ordre : `00_Project_Blueprint.md`, ce document, `21_Backlog_and_Session_Handoff.md` (état courant du backlog et journal de session), puis le(s) document(s) de domaine concerné(s) par la tâche (ex. `11_Document_Management_System.md` pour une tâche sur l'espace documentaire). Identifier les critères d'acceptation, les effets sur les rôles/droits, les changements d'API/de données et les tests requis avant d'implémenter.

# 3. Protocole de fin de session / avant d'atteindre la limite

Ne jamais laisser une tâche à moitié faite sans trace écrite. Avant de terminer une session (limite atteinte, fin naturelle, ou passage à un autre outil) :
1. Committer le travail en cours avec un message clair (voir section 6), même s'il est incomplet — un commit de checkpoint est préférable à du travail perdu.
2. Mettre à jour `21_Backlog_and_Session_Handoff.md` : cocher les tâches terminées, ajouter une entrée au journal de session (outil utilisé, ce qui a été fait, décisions prises, blocages, prochaine étape précise).
3. Si un document du blueprint (00-20) est devenu obsolète suite à une décision prise pendant la session, le mettre à jour dans le même changement.

# 4. Règles d'architecture

Suivre strictement `06_Application_Architecture.md` et `16_Rendering_State_Strategy.md` : Server Components par défaut côté public, Client Components isolés uniquement pour l'interactivité réelle, portail d'administration en client-side sans SSR forcé. Contrôleurs NestJS minces, DTO validés, logique métier dans les services, accès Prisma derrière des repositories/services. Pas de dépendance nouvelle sans raison explicite et évaluation de sa maintenance (le budget d'hébergement est limité — éviter les services tiers payants non prévus au contrat).

# 5. Règles de données et d'API

Ne jamais faire confiance à un statut, un droit ou une confidentialité envoyés par le client : toute vérification RBAC/propriété/droit documentaire se fait côté serveur. Toute nouvelle route API nécessite : DTO, vérification RBAC/droit, mise à jour OpenAPI, contrat d'erreur cohérent, test pertinent. Tout changement de schéma Prisma nécessite une migration revue et testée. Le contenu multilingue (FR/EN) est porté par le modèle dès sa création — ne pas l'ajouter après coup.

# 6. Règles Git

Commits Conventional Commits, focalisés (ne pas mélanger refactoring et changement de comportement sauf nécessité). Ne jamais utiliser `--no-verify` ni bypasser les hooks. Mettre à jour les documents du blueprint concernés dans le même changement que le code qui en découle. Ne jamais pousser ou committer de secret (`.env`, clés, identifiants d'hébergement/SMTP).

# 7. Règles de sécurité

Ne jamais journaliser un mot de passe, un jeton ou le contenu d'un document privé. Ne jamais simuler ou fabriquer un succès de sécurité (accès accordé) sans vérification réelle. Toute décision métier ou technique non tranchée par le blueprint doit être signalée explicitement (dans le journal de session ou à l'utilisateur) plutôt que devinée silencieusement.

# 8. Règles de qualité

Typage strict, noms explicites, changements petits et cohérents. Ajouter un test de régression pour tout défaut corrigé. Exécuter lint/types/tests pertinents avant de considérer une tâche terminée. Respecter le principe de sobriété du blueprint : ne pas ajouter de complexité (file de messages, store global, service externe) tant que le besoin réel ne l'exige pas — voir `00_Project_Blueprint.md` section 5.
