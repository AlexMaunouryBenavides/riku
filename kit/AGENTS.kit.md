# Bibliothèque de règles d'ingénierie — mode d'emploi pour l'agent

> Tu es un assistant de code qui **prépare** ou **revoit** un projet. Ce dépôt est une bibliothèque de
> règles d'ingénierie réutilisables. Ce fichier explique comment les **découvrir, sélectionner, appliquer
> et vérifier**. Suis-le à la lettre. N'invente jamais de règle absente de la bibliothèque.

## 1. Format d'un fichier de règle

Chaque fichier `rules/**/*.md` commence par ce frontmatter YAML :

| Champ        | Rôle                                                           | Valeurs                                                             |
| ------------ | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `id`         | identifiant unique, préfixe des ids de règle (`validation.r4`) | slug                                                                |
| `discipline` | la discipline                                                  | slug                                                                |
| `kind`       | façonne le corps                                               | `code` \| `config` \| `checklist`                                   |
| `tech`       | techno requise pour activer le fichier                         | liste, `[]` = agnostique                                            |
| `layer`      | couche concernée                                               | `backend` \| `frontend` \| `db` \| `shared` \| `infra` \| `process` |
| `phase`      | vers quels artefacts OpenSpec injecter                         | `design` \| `implementation` \| `review`                            |
| `level`      | force de la règle                                              | `guardrail` \| `preference`                                         |
| `status`     | maturité                                                       | `draft` (ignoré) \| `active` (pris en compte)                       |

Le corps a deux couches : **`## Rules`/`## Requirements`** (directives — à injecter) et **`## Reference`**
(détails — **ne pas** injecter par défaut, lire seulement si besoin). Chaque règle porte un id ancré
(`{#id.rN}`) et un champ **`Vérifié par`** : `eslint` / `tsc` / `hadolint` (enforcement gratuit) ou `manuel`.

## 2. Sémantique des niveaux

- **`guardrail`** : non négociable. Toujours appliqué.
- **`preference`** : recommandé. Appliqué **sauf** s'il contredit une convention existante du projet.

**Précédence :** convention détectée du projet **>** `preference`. Un `guardrail` prime sur tout : s'il
heurte une convention du projet, **signale-le explicitement** au lieu de le contourner en silence.

## 3. Découverte & sélection (au setup)

1. **Détecte le projet** : stack (package.json, frameworks), couches présentes (backend/frontend), configs
   existantes (eslint, tsconfig, prettier, Dockerfile), conventions (nommage, structure de dossiers).
2. **Sélectionne** un fichier si : `status: active` **ET** (`tech` ⊆ stack détectée **OU** `tech: []`)
   **ET** sa `layer` est présente dans le projet.
3. **Filtrer par propriété** = grep le frontmatter sur `rules/**`. Exemples :
   - tous les garde-fous sécurité → fichiers `discipline: security` avec `level: guardrail` ;
   - tout le backend actif → `layer: backend` + `status: active`.
     Ne lis le **corps complet** que des fichiers retenus (budget de contexte).

## 4. Application (au setup)

Pour chaque fichier retenu :

- injecte sa section **directives** (`## Rules`/`## Requirements`) — **jamais** `## Reference` ;
- route-la vers OpenSpec selon `phase` (`design` → proposal/design, `implementation` → specs/tasks,
  `review` → artefact de revue) ;
- pour chaque règle `Vérifié par: eslint|tsc|hadolint`, installe/active la config correspondante depuis
  `tooling/` afin que la règle soit **enforced gratuitement** et **retirée de la revue LLM**.

Écris le résultat **uniquement** via les points d'extension natifs d'OpenSpec :

- `openspec/config.yaml` → `context` = stack + conventions détectées ; `rules` par artefact référençant
  les ids retenus ;
- copie les configs de `tooling/` à la racine du projet en **réconciliant** (ne jamais écraser une config
  existante du projet).

Termine par un **résumé** : garde-fous appliqués, préférences appliquées, préférences écartées (+ raison),
tooling posé.

## 5. Vérification (revue de feature)

Quand on te demande de vérifier du code :

- prends le **diff git** ;
- charge, pour les disciplines concernées, les lignes **`Check (review)`** + la section `## Anti-patterns` ;
- ne contrôle **que** les règles `Vérifié par: manuel` (le reste est déjà couvert gratuitement par
  lint/tsc/hadolint) ;
- rapporte chaque violation **par son id** (`validation.r4`) avec le correctif minimal ;
- reste **scopé au diff** : pas de faux positifs sur du code non touché.

## 6. Conflits

- `preference` vs convention projet → suis le projet, mentionne-le.
- deux règles en conflit → `guardrail` > `preference` ; à niveau égal, **demande à l'humain**.

## 7. Interdits

- ne touche **jamais** à `openspec/changes` ni `openspec/specs` : la bibliothèque s'injecte via
  `config.yaml` (et schemas) uniquement, pour que `openspec init` / `opsx` restent vanilla ;
- n'injecte pas les sections `## Reference` par défaut ;
- ignore tout fichier `status: draft`.
