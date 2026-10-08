# API NestJS — image de production (blueprint/18_Deployment.md).
# Contexte de build : la RACINE du dépôt (workspaces npm), p. ex.
#   docker build -f apps/api/Dockerfile --target runner .
#
# Deux images sortent de ce fichier :
#   runner : l'API seule, dépendances de production, utilisateur non privilégié.
#   tools  : migrations Prisma et amorçage (npx prisma migrate deploy, prisma/seed.ts).
#            Contient les dépendances de développement : exécutée ponctuellement au
#            déploiement, jamais exposée.
#
# Les dépendances sont installées DANS l'image (sharp, argon2 : binaires natifs de la
# plateforme cible) — ne jamais copier un node_modules d'une autre machine.

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

# Fichiers de manifeste seuls : la couche d'installation ne se refait que si le
# lockfile ou un package.json change.
FROM base AS manifests
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

FROM manifests AS deps
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=apps/api --include-workspace-root

FROM manifests AS prod-deps
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=apps/api --include-workspace-root --omit=dev

FROM deps AS build
COPY apps/api apps/api
# `prisma generate` ne se connecte pas à la base, mais prisma.config.ts exige la variable.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN cd apps/api && npx prisma generate && npm run build

# --- Migrations / amorçage -------------------------------------------------------
FROM build AS tools
WORKDIR /app/apps/api
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

# --- API -------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3001 \
    PRIVATE_STORAGE_PATH=/data/private \
    PUBLIC_MEDIA_PATH=/data/public
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
# Client Prisma généré (hors des dépendances de production, donc copié du build).
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY apps/api/package.json ./apps/api/package.json
# Dossiers de stockage : l'utilisateur `node` (uid 1000) doit en être propriétaire,
# y compris pour les dossiers de l'hôte montés dessus (voir ops/deploy/README.md).
RUN mkdir -p /data/private /data/public && chown -R node:node /data
WORKDIR /app/apps/api
USER node
EXPOSE 3001
CMD ["node", "dist/main"]
