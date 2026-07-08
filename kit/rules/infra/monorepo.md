---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: monorepo
title: Monorepo (pnpm workspaces)
discipline: monorepo
kind: config
tech: [pnpm]
layer: infra
phase: [design, implementation, review]
level:
  preference # défaut : guidant.
  # Les exigences de structure et de reproductibilité sont marquées "guardrail".
status: active
version: 1.0
sources:
  - https://pnpm.io/workspaces
  - https://pnpm.io/pnpm-workspace_yaml
  - https://pnpm.io/filtering
  - https://pnpm.io/cli/install
  - https://pnpm.io/catalogs
---

# Monorepo (pnpm workspaces)

> **Intention :** organiser plusieurs packages (ex. `apps/api`, `apps/web`, `packages/shared`) dans un seul
> dépôt pnpm, avec des builds **déterministes** et des versions de dépendances **cohérentes**. On s'en tient
> aux mécanismes **natifs pnpm** (pas d'orchestrateur type Nx/Turborepo tant qu'il n'est pas requis).
> **Applies to :** `pnpm-workspace.yaml`, `**/package.json`, `pnpm-lock.yaml`, `**/.github/workflows/*.y*ml`.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — EXIGENCES (injectée)                                          -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Requirements

### R1 — Déclarer le workspace dans `pnpm-workspace.yaml` (champ `packages`) {#monorepo.r1}

- **Exige :** un fichier `pnpm-workspace.yaml` **à la racine**, dont le champ `packages:` liste les répertoires-packages en **globs** (ex. `apps/*`, `packages/*`).
- **Pourquoi :** doc officielle — « A workspace must have a `pnpm-workspace.yaml` file in its root. » Ce fichier « defines the root of the workspace and enables you to include / exclude directories from the workspace ». La racine est toujours incluse.
- **Niveau :** guardrail
- **Vérifié par :** présence du fichier (check setup).
- **Check :** `pnpm-workspace.yaml` existe à la racine ; `packages:` couvre tous les packages (globs), avec exclusions éventuelles (`!**/test/**`).

### R2 — Dépendances internes via le protocole `workspace:` {#monorepo.r2}

- **Exige :** toute dépendance vers un **autre package du monorepo** est déclarée avec le protocole `workspace:` (ex. `"@app/shared": "workspace:*"`), jamais une version de registre en dur.
- **Pourquoi :** doc officielle — « When this protocol is used, pnpm will refuse to resolve to anything other than a local workspace package. » Au `pack`/`publish`, `workspace:` est **remplacé automatiquement** par la version réelle du package cible.
- **Niveau :** guardrail
- **Vérifié par :** manuel (grep des `package.json`).
- **Check :** aucune dépendance interne pointant vers une version publiée ; toutes en `workspace:*` / `workspace:^` / `workspace:~`.

### R3 — Un seul lockfile racine, versionné {#monorepo.r3}

- **Exige :** un **unique** `pnpm-lock.yaml` à la racine, **commité** ; ne pas désactiver `sharedWorkspaceLockfile`.
- **Pourquoi :** doc officielle — quand `sharedWorkspaceLockfile` est actif (défaut **true**), « pnpm creates a single `pnpm-lock.yaml` file in the root of the workspace » : « every dependency is a singleton » et installations plus rapides. Un lockfile par package casse la cohérence et le déterminisme.
- **Niveau :** guardrail
- **Vérifié par :** présence + revue.
- **Check :** un seul `pnpm-lock.yaml` (racine) suivi par Git ; aucun lockfile par package.

### R4 — En CI, installer avec `--frozen-lockfile` {#monorepo.r4}

- **Exige :** l'étape d'installation en CI utilise `pnpm install --frozen-lockfile` (ou s'appuie sur le défaut CI équivalent).
- **Pourquoi :** doc officielle — avec `--frozen-lockfile`, « pnpm doesn't generate a lockfile and fails to install if the lockfile is out of sync with the manifest … or no lockfile is present. » Ce réglage est « `true` by default in CI environments ». Garantit un build **reproductible** : un `package.json` modifié sans lockfile à jour fait échouer la CI au lieu de dériver silencieusement.
- **Niveau :** guardrail
- **Vérifié par :** revue du workflow CI.
- **Check :** le job d'install échoue si le lockfile est désynchronisé ; pas de régénération silencieuse en CI.

### R5 — Cibler les tâches avec `--filter` {#monorepo.r5}

- **Exige :** lancer une commande sur un package via `pnpm --filter <package> <cmd>` (plutôt que des `cd` manuels). Utiliser les sélecteurs quand c'est utile : glob (`./packages/**`), dépendances (`foo...`), ou **fichiers changés** (`"...[origin/main]"`).
- **Pourquoi :** doc officielle — le filtrage « restricts commands to specific package subsets » via `pnpm --filter <package_selector> <command>` ; le sélecteur `"...[<branche>]"` limite l'exécution aux packages **impactés par un changement**, ce qui accélère la CI.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check :** scripts racine et CI passent par `--filter` / `-r` (recursive), pas de navigation manuelle dans les dossiers.

### R6 — Centraliser les versions partagées avec les catalogs (`catalog:`) {#monorepo.r6}

- **Exige :** une dépendance utilisée par **plusieurs** packages est définie **une seule fois** dans `catalog:` (de `pnpm-workspace.yaml`) et référencée par `"<dep>": "catalog:"` dans chaque `package.json`.
- **Pourquoi :** doc officielle — les catalogs sont « a workspace feature for defining dependency version ranges as reusable constants ». Bénéfices : « only one version of a dependency in a workspace », mise à jour « only the catalog entry … needs to be edited rather than all `package.json` files », et « git merge conflicts no longer happen ».
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check :** les dépendances communes (ex. `typescript`, `@types/*`, libs partagées front/back) sont en `catalog:` ; aucune version divergente d'un même paquet entre packages.

## Anti-patterns

- Pas de `pnpm-workspace.yaml`, ou `packages:` incomplet → #monorepo.r1
- Dépendance interne en version de registre au lieu de `workspace:` → #monorepo.r2
- Plusieurs lockfiles, ou lockfile non commité → #monorepo.r3
- CI en `pnpm install` sans `--frozen-lockfile` (dérive silencieuse) → #monorepo.r4
- `cd apps/api && …` au lieu de `pnpm --filter api …` → #monorepo.r5
- Même dépendance versionnée différemment selon les packages → #monorepo.r6

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**`pnpm-workspace.yaml` de référence** (globs + catalog) :

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - '!**/test/**'

catalog:
  typescript: ^5.5.4
  zod: ^3.23.8
```

**Dépendance interne (protocole `workspace:`)** — dans `apps/api/package.json` :

```json
{
  "dependencies": {
    "@app/shared": "workspace:*",
    "zod": "catalog:"
  }
}
```

**Étape d'install CI (GitHub Actions)** — voir aussi `ci-cd.md` :

```yaml
- run: pnpm install --frozen-lockfile
```

**Exécuter des tâches par package :**

```bash
pnpm --filter api start:dev        # un package précis
pnpm -r test                       # récursif sur tout le workspace
pnpm --filter "...[origin/main]" build   # seulement les packages impactés par un changement
```

**Portée volontaire :** ce fichier couvre le monorepo **pnpm natif**. Un orchestrateur (Nx, Turborepo) n'est
**pas** requis pour un petit nombre de packages ; il s'ajoute par-dessus les workspaces si un besoin réel de
cache/orchestration apparaît (décision à documenter, hors de ce fichier).

**Liens (sources vérifiées) :**
workspaces → https://pnpm.io/workspaces ·
`pnpm-workspace.yaml` → https://pnpm.io/pnpm-workspace_yaml ·
filtering → https://pnpm.io/filtering ·
`--frozen-lockfile` → https://pnpm.io/cli/install ·
catalogs → https://pnpm.io/catalogs
