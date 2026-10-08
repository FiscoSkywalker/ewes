# Site Next.js (public + portail) — image de production (blueprint/18_Deployment.md).
# Contexte de build : la RACINE du dépôt (workspaces npm), p. ex.
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://ewes.example \
#     --build-arg NEXT_PUBLIC_API_URL=https://ewes.example/api/v1 .
#
# Variables lues À LA CONSTRUCTION (Next les fige dans le code) : changer l'une d'elles
# impose de reconstruire l'image.
#   NEXT_PUBLIC_SITE_URL : adresse publique HTTPS, sans barre finale (canonical, sitemap).
#   NEXT_PUBLIC_API_URL  : adresse de l'API VUE DU NAVIGATEUR (formulaire de contact).
#   API_INTERNAL_URL     : adresse de l'API vue du serveur Next (réseau Docker) ; elle sert
#                          aux lectures serveur, aux routes BFF et à la réécriture /uploads.

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=apps/web --include-workspace-root

FROM deps AS build
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_API_URL
ARG API_INTERNAL_URL=http://api:3001/api/v1
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    API_INTERNAL_URL=$API_INTERNAL_URL \
    NEXT_OUTPUT=standalone
COPY apps/web apps/web
RUN cd apps/web && npm run build

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Sortie « standalone » : serveur minimal + seules les dépendances utiles. Le dossier
# .next doit rester inscriptible (cache ISR) pour l'utilisateur `node`.
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
