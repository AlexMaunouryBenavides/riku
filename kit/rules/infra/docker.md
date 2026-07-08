---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: docker
title: Docker (images & conteneurs)
discipline: docker
kind: config
tech: [docker, nodejs]
layer: infra
phase: [implementation, review]
level:
  preference # défaut : la plupart sont guidantes.
  # Les exigences sécurité/repro sont marquées "guardrail".
status: active
version: 1.0
sources:
  - https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md
  - https://docs.docker.com/
---

# Docker (images & conteneurs)

> **Intention :** produire des images petites, reproductibles et sûres, **sans** sacrifier la facilité
> de debug en équipe. On vise le standard solide, pas l'optimisation extrême (ni distroless, ni scratch).
> **Applies to :** `**/Dockerfile`, `**/Dockerfile.*`, `**/.dockerignore`, `**/compose*.y*ml`.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — EXIGENCES (injectée)                                          -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Requirements

### R1 — Build multi-étapes, image finale = runtime + deps de prod {#docker.r1}

- **Exige :** un stage `builder` qui compile, puis un stage final qui ne contient que le runtime, les dépendances de production et l'artefact (`dist/`). Jamais les dev-deps ni les sources TS dans l'image finale.
- **Pourquoi :** divise la taille par ~10 et réduit la surface d'attaque (pas de compilateur, pas d'outils de test en prod).
- **Niveau :** guardrail
- **Vérifié par :** revue manuelle + hadolint.
- **Check :** le `Dockerfile` a ≥ 2 `FROM` ; le stage final ne fait pas `npm run build` et ne copie pas le code source brut.

### R2 — Image de base épinglée à une LTS, base minimale, jamais `:latest` {#docker.r2}

- **Exige :** `FROM node:<LTS>-alpine` (ou `-slim`), tag épinglé. Interdit `node:latest` et `node` sans tag.
- **Pourquoi :** reproductibilité des builds et maîtrise des CVE ; `latest` casse silencieusement.
- **Niveau :** guardrail
- **Vérifié par :** hadolint (DL3007 — usage de `latest`).
- **Check :** chaque `FROM` porte un tag de version explicite.

### R3 — Installer avec `npm ci`, et `--omit=dev` au stage de prod {#docker.r3}

- **Exige :** `npm ci` (jamais `npm install`) ; au stage final, `npm ci --omit=dev`.
- **Pourquoi :** `npm ci` est déterministe (échoue si le lockfile diverge) ; `--omit=dev` retire les dev-deps de l'image de prod.
- **Niveau :** guardrail
- **Vérifié par :** grep CI `npm install` dans les Dockerfile (doit être absent).
- **Check :** aucun `npm install` ; le `package-lock.json` est bien copié avant l'install.

### R4 — Exécuter en utilisateur non-root {#docker.r4}

- **Exige :** une directive `USER` non privilégiée avant le `CMD`. Réutiliser l'utilisateur `node` fourni par l'image officielle plutôt que d'en recréer un.
- **Pourquoi :** principe de moindre privilège ; limite l'impact d'une compromission du conteneur.
- **Niveau :** guardrail
- **Vérifié par :** hadolint (DL3002 — le dernier `USER` ne doit pas être root).
- **Check :** `USER node` (ou équivalent) présent ; le `CMD` ne tourne pas en root.

### R5 — `.dockerignore` obligatoire {#docker.r5}

- **Exige :** un `.dockerignore` qui exclut au minimum `node_modules`, `.git`, `.env*`, `dist`, logs et le `Dockerfile` lui-même.
- **Pourquoi :** évite de copier des **secrets** (`.env`) et des artefacts dans l'image, et accélère le build (contexte plus léger).
- **Niveau :** guardrail
- **Vérifié par :** présence du fichier (check setup).
- **Check :** `.dockerignore` existe et couvre `.env*` + `node_modules`.

### R6 — Aucun secret dans l'image ni en `ARG` {#docker.r6}

- **Exige :** pas de secret en `ENV`/`ARG` ni en clair dans une couche. Les secrets arrivent au **runtime** (variables d'env injectées, ou montage de secret) ; pour les secrets de build, utiliser `RUN --mount=type=secret`.
- **Pourquoi :** tout `ARG`/`ENV` et toute couche restent lisibles dans l'historique de l'image.
- **Niveau :** guardrail
- **Vérifié par :** revue manuelle + scan d'image (ex. Docker Scout / Trivy).
- **Check :** aucun token/mot de passe/clé en dur dans le `Dockerfile`.

### R7 — Ordre des couches optimisé pour le cache {#docker.r7}

- **Exige :** copier `package*.json` **puis** lancer `npm ci`, **puis seulement** copier le reste du code.
- **Pourquoi :** tant que les dépendances ne changent pas, Docker réutilise la couche d'install — gain de plusieurs minutes par build.
- **Niveau :** preference
- **Vérifié par :** revue manuelle.
- **Check :** `COPY . .` n'apparaît jamais avant le `npm ci`.

### R8 — `NODE_ENV=production` + arrêt gracieux (PID 1) {#docker.r8}

- **Exige :** `ENV NODE_ENV=production` au stage final ; gérer correctement PID 1 (lancer avec `--init`, `init: true` en compose, ou `tini`) pour que `SIGTERM` arrête proprement Nest.
- **Pourquoi :** Node n'est pas conçu pour tourner en PID 1 ; sans ça, les signaux d'arrêt sont ignorés et les requêtes en cours coupées brutalement.
- **Niveau :** preference
- **Vérifié par :** revue manuelle.
- **Check :** `NODE_ENV=production` présent ; un mécanisme d'init est en place côté run/compose.

## Anti-patterns

- Dockerfile mono-stage qui embarque dev-deps + sources → #docker.r1
- `FROM node` / `node:latest` → #docker.r2
- `npm install` dans un Dockerfile → #docker.r3
- Conteneur qui tourne en root → #docker.r4
- `.env` copié dans l'image (pas de `.dockerignore`) → #docker.r5 / #docker.r6
- `COPY . .` avant l'install des deps → #docker.r7

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Dockerfile NestJS de référence :**

```dockerfile
# syntax=docker/dockerfile:1

# ─── Stage 1 : build ──────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                        # toutes les deps (dont dev) pour compiler
COPY . .
RUN npm run build                 # → dist/

# ─── Stage 2 : production ─────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
USER node                         # utilisateur non-root fourni par l'image officielle
EXPOSE 3000
CMD ["node", "dist/main.js"]      # point d'entrée NestJS
```

Lancement avec gestion PID 1 : `docker run --init <image>` (ou `init: true` dans compose).

**`.dockerignore` minimal :**

```
node_modules
dist
.git
.env*
*.log
coverage
Dockerfile
.dockerignore
```

**Variante frontend React (build statique servi par nginx) :**

```dockerfile
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build                 # → dist/ (Vite) ou build/ (CRA)

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
# Pense à une config nginx avec fallback SPA (try_files ... /index.html).
```

**Secret de build (sans le graver dans une couche) :**

```dockerfile
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) npm ci
```

**Non retenu volontairement** (au-delà de ton besoin, nuit au debug d'équipe) : images distroless/scratch,
builds multi-arch buildx, squash de couches. À considérer seulement si une contrainte précise l'exige.

**Liens :** best practices image Node → https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md
