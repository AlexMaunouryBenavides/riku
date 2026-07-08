---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: ci-cd
title: CI/CD (GitHub Actions)
discipline: ci-cd
kind: config
tech: [github-actions]
layer: infra
phase: [implementation, review]
level:
  preference # défaut : guidant.
  # Les exigences de reproductibilité et de sécurité sont marquées "guardrail".
status: active
version: 1.0
sources:
  - https://pnpm.io/continuous-integration
  - https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions
  - https://docs.github.com/en/actions/using-jobs/using-concurrency
  - https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows
---

# CI/CD (GitHub Actions)

> **Intention :** une CI **reproductible, rapide et sûre** sous GitHub Actions, qui **bloque** la fusion quand
> une porte qualité échoue. On s'en tient aux actions officielles et aux réglages recommandés par la doc.
> **Applies to :** `**/.github/workflows/*.y*ml`.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — EXIGENCES (injectée)                                          -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Requirements

### R1 — Déclencher sur `push` et `pull_request` {#ci-cd.r1}

- **Exige :** le workflow se déclenche au moins sur `pull_request` (pour gater les PR) et `push` (sur la branche par défaut).
- **Pourquoi :** doc officielle — `push` « Runs your workflow when you push a commit or tag » ; `pull_request` « Runs your workflow when activity on a pull request in the workflow's repository occurs » et s'exécute sur la **branche de merge** (teste le résultat fusionné, pas seulement la head).
- **Niveau :** preference
- **Vérifié par :** revue du workflow.
- **Check :** clé `on:` couvrant `push` et `pull_request`.

### R2 — Installer pnpm + Node via les actions officielles, install déterministe {#ci-cd.r2}

- **Exige :** installer pnpm avec `pnpm/action-setup`, Node avec `actions/setup-node` **paramétré `cache: "pnpm"`**, puis installer les dépendances de façon **déterministe** (frozen lockfile — cf. `monorepo.r4`).
- **Pourquoi :** guide officiel pnpm — setup via `pnpm/action-setup` + `actions/setup-node` avec `cache: "pnpm"` ; `pnpm install` « automatically enables frozen-lockfile mode in CI ». Garantit des builds reproductibles et un cache de dépendances.
- **Niveau :** guardrail
- **Vérifié par :** revue du workflow.
- **Check :** étapes `pnpm/action-setup` puis `actions/setup-node` (`cache: pnpm`) présentes ; l'install est en mode frozen (défaut CI ou `--frozen-lockfile` explicite).

### R3 — Épingler les actions à un SHA de commit complet {#ci-cd.r3}

- **Exige :** chaque `uses:` (au moins pour les actions **tierces**) est épinglé à un **SHA de commit complet** (40 caractères), avec la version en commentaire — jamais une branche ni un tag mobile seul.
- **Pourquoi :** doc officielle (security hardening) — « Pinning to a particular SHA helps mitigate the risk of a bad actor adding a backdoor to the action's repository… » ; « Pinning an action to a full-length commit SHA is currently the only way to use an action as an immutable release. »
- **Niveau :** guardrail
- **Vérifié par :** revue (+ Dependabot pour les bumps).
- **Check :** `uses: owner/action@<sha40>  # vX.Y.Z` ; aucune action tierce en `@main`/`@v1` seul.

### R4 — `GITHUB_TOKEN` en permissions minimales {#ci-cd.r4}

- **Exige :** déclarer un bloc `permissions:` **restrictif** au niveau workflow (par défaut `contents: read`), et n'élargir **par job** que si un besoin précis l'exige.
- **Pourquoi :** doc officielle (security hardening) — mettre « the default permission for the `GITHUB_TOKEN` to read access only for repository contents » ; « The permissions can then be increased, as required, for individual jobs within the workflow file » (moindre privilège).
- **Niveau :** guardrail
- **Vérifié par :** revue du workflow.
- **Check :** bloc `permissions:` présent et minimal ; toute élévation est portée par un job précis et justifiée.

### R5 — Aucun secret en clair ; secrets chiffrés GitHub {#ci-cd.r5}

- **Exige :** aucune donnée sensible en clair dans un workflow ; utiliser les **secrets GitHub** (`${{ secrets.* }}`) ; masquer une valeur sensible **non** stockée en secret avec `::add-mask::` ; enregistrer comme secret toute valeur sensible dérivée.
- **Pourquoi :** doc officielle (security hardening) — « Sensitive data should **never** be stored as plaintext in workflow files » ; « Mask all sensitive information that is not a GitHub secret by using `::add-mask::VALUE` ».
- **Niveau :** guardrail
- **Vérifié par :** revue + scan de secrets.
- **Check :** pas de token/clé/mot de passe en clair ; usage de `secrets.*` ; masquage des valeurs sensibles dérivées.

### R6 — Annuler les exécutions obsolètes (`concurrency` + `cancel-in-progress`) {#ci-cd.r6}

- **Exige :** un bloc `concurrency` groupé par workflow + ref, avec `cancel-in-progress: true`.
- **Pourquoi :** doc officielle — « To also cancel any currently running job or workflow in the same concurrency group, specify `cancel-in-progress: true` » ; « if a new commit is pushed … while a previous run is still in progress, the previous run will be cancelled ». Économise les minutes CI et évite les runs zombies.
- **Niveau :** preference
- **Vérifié par :** revue du workflow.
- **Check :** `concurrency.group: ${{ github.workflow }}-${{ github.ref }}` + `cancel-in-progress: true`.

### R7 — La CI exécute les portes qualité et échoue si l'une échoue {#ci-cd.r7}

- **Exige :** la CI enchaîne les portes qualité du projet — **lint + typecheck + tests** (via `pnpm -r` / `--filter`, cf. `monorepo.r5`) ; aucune étape critique en `continue-on-error`.
- **Pourquoi :** convention kit — une CI n'a de valeur que si elle **bloque** sur erreur (une étape `run` qui sort en code non-zéro fait échouer le job). Aligne la CI sur le `verify` local (`_strategy.md`).
- **Niveau :** preference
- **Vérifié par :** revue du workflow.
- **Check :** étapes lint/typecheck/test présentes et bloquantes ; pas de `continue-on-error` masquant un échec.

## Anti-patterns

- Workflow qui ne se déclenche pas sur `pull_request` (PR non gatées) → #ci-cd.r1
- Install non déterministe en CI (`pnpm install` sans frozen, ou npm/yarn ad hoc) → #ci-cd.r2
- Action tierce en `@main` / `@v1` mobile → #ci-cd.r3
- Pas de bloc `permissions:` (token en écriture par défaut) → #ci-cd.r4
- Secret/clé en clair dans le YAML → #ci-cd.r5
- Pas de `concurrency` → runs empilés sur pushes rapprochés → #ci-cd.r6
- Étape critique en `continue-on-error` qui masque un échec → #ci-cd.r7

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**`.github/workflows/ci.yml` de référence** (monorepo pnpm) :

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

# R4 — moindre privilège
permissions:
  contents: read

# R6 — annuler les runs obsolètes de la même ref
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6            # R3 : à épingler au SHA (Dependabot gère les bumps)
      - name: Install pnpm
        uses: pnpm/action-setup@8912a9102ac27614460f54aedde9e1e7f9aec20d # v6.0.5
        with:
          version: 11
      - name: Use Node.js
        uses: actions/setup-node@v6           # R3 : à épingler au SHA
        with:
          node-version: 24
          cache: "pnpm"                       # R2 : cache des deps pnpm
      - run: pnpm install --frozen-lockfile   # R2 : install déterministe (cf. monorepo.r4)
      - run: pnpm -r lint                      # R7
      - run: pnpm -r typecheck                 # R7
      - run: pnpm -r test                      # R7
```

**Nuance sur R3 (épinglage SHA).** L'exemple officiel pnpm épingle `pnpm/action-setup` au SHA et laisse
`actions/checkout` / `actions/setup-node` en tag. La doc *security hardening* recommande le **SHA pour toute
action** (seul moyen d'obtenir une release immuable). Pratique acceptée : épingler au SHA (surtout les actions
**tierces**) et confier les mises à jour à **Dependabot** (`.github/dependabot.yml`, écosystème
`github-actions`), qui réécrit le SHA + le commentaire de version automatiquement.

**Masquage d'une valeur sensible non-secret :**

```bash
echo "::add-mask::$DERIVED_VALUE"
```

**Portée volontaire :** ce fichier couvre l'**intégration continue** (build/test/qualité). Le **déploiement
continu** (CD) — environnements, releases, publication d'images — s'ajoute par-dessus selon le besoin projet et
n'est pas imposé ici.

**Liens (sources vérifiées) :**
CI pnpm → https://pnpm.io/continuous-integration ·
security hardening → https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions ·
concurrency → https://docs.github.com/en/actions/using-jobs/using-concurrency ·
événements → https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows
