# Brief de setup — Riku

> **Pour Claude Code (session d'implémentation).** Ce document décrit le squelette à installer.
> Objectif : un monorepo qui **démarre et passe `pnpm verify`**, **sans aucune fonctionnalité métier** encore.
> Couvre les tâches **0.4 → 2.5** de `conception/plan-de-travail.md`.

## À lire AVANT de commencer

1. `CLAUDE.md` (comportement + stack + règles) — en particulier : **pas de fonctionnalité, squelette seul**.
2. `conception/specifications-techniques.md` (stack figée + archi en couches).
3. `kit/AGENTS.kit.md` (comment appliquer la bibliothèque de règles).

## Règles d'exécution

- **En cas de doute sur une version ou une commande d'installation → consulte la doc officielle à jour** (ne te fie pas à ta mémoire). Idem si un serveur MCP pertinent existe.
- **Migrations TypeORM**, jamais `synchronize: true`.
- **Aucun secret en dur** : `.env` + `.env.example` (cf. `kit configuration.md`).
- Avance **étape par étape**, commit à chaque étape (Conventional Commits), et **demande validation** avant de passer à la suivante.
- N'écris **que** le squelette : modules/écrans vides mais qui bootent. Pas d'auth réelle, pas de CRUD, pas d'algo — ça viendra en Phase 3+.

## Prérequis manuels (à ma charge, pas la tienne)

Node LTS, `pnpm`, Docker Desktop, Git installés et fonctionnels (`node -v`, `pnpm -v`, `docker -v`, `git -v`).

## Cible — arborescence

```
projet-exam/
├── apps/
│   ├── api/            NestJS (TypeScript)
│   └── web/            React + Vite (TypeScript)
├── packages/
│   └── shared/         types & enums partagés (Role, Difficulty, DTO types)
├── docker-compose.yml  mysql + mongo (+ api/web en dev)
├── .github/workflows/  ci.yml (GitHub Actions)
├── pnpm-workspace.yaml
├── package.json        scripts racine (verify, lint, test…)
└── (configs kit copiées : eslint, prettier, tsconfig.base, .hadolint.yaml)
```

## Étapes

### 0.4 — Dépôt & monorepo
- `git init` + `.gitignore` (node_modules, dist, .env…).
- `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `package.json` racine avec scripts `verify`, `lint`, `test`, `typecheck`.
- ✔ `pnpm install` passe ; les 3 packages sont liés.

### 0.5 — Appliquer le kit (tooling zéro-token)
- Suivre `kit/AGENTS.kit.md` : détecter la stack, copier `kit/tooling/` (eslint, prettier, tsconfig.base, .hadolint.yaml) à la racine **en réconciliant** (ne pas écraser).
- Renseigner `openspec/config.yaml` (`context` = stack + contraintes ; `rules` par artefact avec les ids kit retenus).
- ✔ `pnpm lint` et `pnpm format` tournent ; produire le **résumé** des règles appliquées/écartées.

### 2.2 — Squelette backend (`apps/api`)
- Générer le projet NestJS. Installer : `@nestjs/typeorm typeorm mysql2`, `@nestjs/mongoose mongoose`, `@nestjs/passport passport passport-jwt @nestjs/jwt`, `argon2`, `class-validator class-transformer`, `@nestjs/throttler`, `@nestjs/config`, `helmet`, `cookie-parser`.
- Découpage en couches (`kit clean-archi-back.md`) : modules **vides mais déclarés** — `auth`, `users`, `catalog`, `revision`, `shared`. Chacun structuré domaine / application / infrastructure.
- `ValidationPipe` global, `helmet`, `cookie-parser`, filtre d'exceptions global (forme normalisée), config validée au boot.
- Connexions TypeORM (MySQL) + Mongoose (MongoDB) lues depuis la config, **pas de synchronize** (setup migrations).
- ✔ `pnpm --filter api start:dev` démarre et se connecte aux deux bases (via docker-compose, étape 2.1).

### 2.3 — Squelette frontend (`apps/web`)
- Générer React + Vite + TS. Installer : `react-router-dom`, `@tanstack/react-query`, `zustand`, `react-hook-form zod @hookform/resolvers`, `tailwindcss` (+ init), **shadcn/ui** (init).
- Structure (`kit clean-archi-front.md` / `react.md`) : routing en place, `QueryClientProvider`, layout vide, une page d'accueil.
- ✔ `pnpm --filter web dev` démarre, Tailwind + un composant shadcn s'affichent.

### 2.4 — Config & secrets
- `.env` + `.env.example` (DB MySQL, DB Mongo, `JWT_SECRET`, `NODE_ENV`…). Config typée + validée (`kit configuration.md`).
- ✔ Démarrage échoue proprement si une variable requise manque ; aucun secret commité.

### 2.1 — docker-compose local
- Services `mysql` et `mongo` (volumes persistants, ports, healthchecks). Optionnel : services `api`/`web` en dev.
- ✔ `docker compose up` démarre MySQL + MongoDB ; l'API s'y connecte.

### 2.5 — CI minimale (GitHub Actions)
- `.github/workflows/ci.yml` : sur push/PR → `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (`kit ci-cd.md`).
- ✔ Pipeline vert sur un commit de base.

## Définition de « terminé »

- `docker compose up` lève MySQL + Mongo.
- `pnpm --filter api start:dev` et `pnpm --filter web dev` démarrent sans erreur.
- `pnpm verify` (typecheck + lint + tests) passe au vert.
- CI verte.
- **Zéro fonctionnalité métier** : uniquement le squelette prêt pour la Phase 3.
