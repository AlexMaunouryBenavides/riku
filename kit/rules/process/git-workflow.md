---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: git-workflow
title: Git Workflow
discipline: git-workflow
kind: checklist
tech: []                      # agnostique : valable sur tout projet versionné avec Git.
layer: process
phase: [implementation, review]
level: preference             # défaut du fichier ; seule la "golden rule" du rebase (R6) est un garde-fou.
status: active
version: 1.0
sources:
  - https://www.conventionalcommits.org/en/v1.0.0/
  - https://git-scm.com/book/en/v2/Distributed-Git-Contributing-to-a-Project
  - https://git-scm.com/book/en/v2/Git-Branching-Rebasing
  - https://docs.github.com/en/get-started/using-github/github-flow
---

# Git Workflow

> **Intention :** un historique lisible et bissectable, des changements relus avant d'atteindre la branche
> par défaut, et un partage du dépôt qui ne casse jamais le travail des autres. L'historique est une
> documentation : il doit raconter *pourquoi* chaque changement existe.
> **Applies to :** messages de commit, branches et pull requests (pas de glob fichier — discipline de process).

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Message de commit au format Conventional Commits               {#git-workflow.r1}
- **Règle :** préfixer chaque message par `<type>[scope optionnel]: <description>`. Types : `feat` (nouvelle fonctionnalité), `fix` (correctif), plus `build`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`. Le scope est un nom entre parenthèses désignant une section du code (`fix(parser):`).
- **Pourquoi :** « Commits MUST be prefixed with a type… followed by… a colon and space. » Un préfixe normé rend l'historique scannable et automatisable (changelog, version) sans relire chaque diff.
- **Vérifié par :** commitlint (CI) — config `@commitlint/config-conventional`.
- **Check (review) :** chaque commit du diff porte un type valide ; le scope, s'il existe, est un nom de section du code.
- ✅ **Bon :** `feat(auth): add refresh-token rotation`
- ❌ **Mauvais :** `update stuff` — ni type, ni intention lisible.

### R2 — Signaler explicitement les breaking changes                    {#git-workflow.r2}
- **Règle :** marquer tout changement cassant par un `!` placé juste avant le `:` (`feat(api)!: …`) **et/ou** par un footer `BREAKING CHANGE: <description>` (token en majuscules) après une ligne vide.
- **Pourquoi :** « breaking changes [are] indicated in prefix or footer… `BREAKING CHANGE:` [token] uppercase. » Un consommateur du code doit repérer une rupture de contrat sans deviner.
- **Vérifié par :** commitlint (CI).
- **Check (review) :** un commit qui rompt une API publique porte le `!` ou le footer `BREAKING CHANGE:`.
- ✅ **Bon :**
  ```
  feat(api)!: drop support for v1 auth header

  BREAKING CHANGE: clients must send the Authorization bearer token.
  ```
- ❌ **Mauvais :** `feat(api): change auth header` — la rupture est cachée dans un message de feature ordinaire.

### R3 — Sujet impératif court, corps replié                            {#git-workflow.r3}
- **Règle :** rédiger la description (sujet) à l'**impératif**, sur une seule ligne d'environ **50 caractères** max ; puis une ligne vide ; puis un corps optionnel replié à **~72 caractères** expliquant la motivation et le contraste avec l'ancien comportement.
- **Pourquoi :** « start with a single line that's no more than about 50 characters… followed by a blank line, followed by a more detailed explanation… Write your commit message in the imperative: 'Fix bug' and not 'Fixed bug'… Wrap it to about 72 characters. » Format lisible dans `git log`, les outils et les emails.
- **Vérifié par :** manuel (commitlint peut aussi borner `header-max-length`/`body-max-line-length`).
- **Check (review) :** sujet impératif et concis ; séparé du corps par une ligne vide ; corps qui dit *pourquoi*, pas seulement *quoi*.
- ✅ **Bon :** `fix(cart): prevent negative quantities` + corps expliquant le bug d'origine.
- ❌ **Mauvais :** `Fixed the cart because it was broken and also I refactored a bunch of other things in one giant unwrapped paragraph...`

### R4 — Commits atomiques : un changeset logiquement séparé            {#git-workflow.r4}
- **Règle :** faire de chaque commit un **changeset logiquement séparé**. Ne pas accumuler plusieurs sujets sans rapport dans un seul commit massif ; découper avec `git add --patch` quand un même fichier porte des changements distincts.
- **Pourquoi :** « try to make each commit a logically separate changeset… don't code for a whole weekend on five different issues and then submit them all as one massive commit. » Un commit atomique se relit, se revert et se `bisect` proprement.
- **Vérifié par :** manuel.
- **Check (review) :** un commit ne mélange pas correctif + refactor + feature sans lien ; chaque commit a une intention unique.
- ✅ **Bon :** un commit `fix:` pour le bug, un commit `refactor:` séparé pour le nettoyage.
- ❌ **Mauvais :** un seul commit qui touche l'auth, le style CSS et la config CI.

### R5 — Aucune erreur de whitespace : `git diff --check`               {#git-workflow.r5}
- **Règle :** vérifier l'absence d'erreurs d'espaces blancs **avant** de committer, via `git diff --check`.
- **Pourquoi :** « your submissions should not contain any whitespace errors… before you commit, run `git diff --check`, which identifies possible whitespace errors. » Ces erreurs polluent les diffs et déclenchent du bruit en revue.
- **Vérifié par :** manuel (peut être automatisé en hook pre-commit / étape CI).
- **Check (review) :** le diff n'introduit pas d'espaces en fin de ligne ni de mélange tabs/espaces signalés par `git diff --check`.
- ✅ **Bon :** `git diff --check` ne renvoie rien avant le commit.
- ❌ **Mauvais :** committer des trailing spaces qui apparaissent en rouge dans le diff.

### R6 — Golden rule du rebase : ne jamais réécrire l'historique partagé {#git-workflow.r6}
- **Règle :** **ne jamais** rebaser (ou réécrire de quelque façon) des commits déjà poussés/partagés. Le rebase est réservé au nettoyage de commits **locaux** avant leur premier push.
- **Pourquoi :** « Do not rebase commits that exist outside your repository and that people may have based work on. » et « rebase local changes before pushing to clean up your work, but never rebase anything that you've pushed somewhere. » Réécrire l'historique public force les autres à re-merger et corrompt l'intégration.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** aucun `push --force` sur une branche partagée ; le rebase ne porte que sur des commits non encore publiés.
- ✅ **Bon :** `git rebase -i` pour nettoyer ses commits locaux avant le **premier** push.
- ❌ **Mauvais :** `git push --force` sur `main` ou sur une branche déjà tirée par un collègue.

### R7 — Une branche courte et descriptive par lot de changements       {#git-workflow.r7}
- **Règle :** partir de la branche par défaut pour créer une branche au **nom court et descriptif**, dédiée à **un** ensemble de changements liés. Une branche séparée par lot de changements indépendants.
- **Pourquoi :** « A short, descriptive branch name enables your collaborators to see ongoing work at a glance… Make a separate branch for each set of unrelated changes. This makes it easier for reviewers to give feedback. » Des branches focalisées et courtes limitent les conflits et fluidifient la revue.
- **Vérifié par :** manuel.
- **Check (review) :** la branche a un nom parlant et ne mélange pas plusieurs chantiers sans rapport.
- ✅ **Bon :** `feat/refresh-token-rotation` partant de `main`.
- ❌ **Mauvais :** une branche `wip` fourre-tout qui accumule des sujets divers sur des semaines.

### R8 — Toute intégration passe par une Pull Request relue             {#git-workflow.r8}
- **Règle :** n'intégrer dans la branche par défaut **que** via une Pull Request ouverte pour relecture, et la merger **une fois approuvée**. La PR porte un résumé du problème résolu.
- **Pourquoi :** « Create a pull request to ask collaborators for feedback on your changes… Once approved… integrate your branch into the default branch. » La revue est le point de contrôle qualité avant la branche partagée.
- **Vérifié par :** manuel (peut être imposé par une protection de branche : revue obligatoire).
- **Check (review) :** aucun commit direct sur la branche par défaut ; chaque merge vient d'une PR relue.
- ✅ **Bon :** ouvrir une PR, traiter les retours par de nouveaux commits, merger après approbation.
- ❌ **Mauvais :** pousser directement sur `main` sans relecture.

### R9 — Supprimer la branche après le merge                            {#git-workflow.r9}
- **Règle :** supprimer la branche de travail **après** son merge.
- **Pourquoi :** « After you merge your pull request, delete your branch… prevents you or others from accidentally using old branches. » On garde une liste de branches qui reflète le travail réellement en cours.
- **Vérifié par :** manuel (peut être automatisé : suppression auto à la fusion de la PR).
- **Check (review) :** pas d'accumulation de branches déjà mergées sur le remote.
- ✅ **Bon :** branche supprimée dès la PR fusionnée.
- ❌ **Mauvais :** des dizaines de branches mergées qui traînent et prêtent à confusion.

## Anti-patterns
- Message de commit sans type Conventional (`update stuff`) → #git-workflow.r1
- Breaking change non signalé (ni `!` ni footer) → #git-workflow.r2
- Sujet au passé / trop long / corps non séparé → #git-workflow.r3
- Commit fourre-tout mêlant fix + refactor + feature → #git-workflow.r4
- Trailing spaces / tabs mélangés committés → #git-workflow.r5
- `push --force` ou rebase sur une branche partagée → #git-workflow.r6
- Branche `wip` fourre-tout, nom non descriptif → #git-workflow.r7
- Commit direct sur la branche par défaut sans PR relue → #git-workflow.r8
- Branches mergées laissées sur le remote → #git-workflow.r9

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Structure complète d'un message (Conventional Commits) :**
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```
Le footer suit la convention *git trailer* : token + `: ` + valeur, avec des tirets à la place des espaces
dans le token (sauf `BREAKING CHANGE`). `BREAKING-CHANGE` est synonyme de `BREAKING CHANGE`.

**Pourquoi l'impératif (Pro Git) :** un sujet à l'impératif se lit comme l'instruction que le commit
*applique* au dépôt — cohérent avec les messages générés par Git lui-même (« Merge branch… », « Revert… »).

**Le rebase, les deux mondes (Pro Git, Perils of Rebasing) :** on peut « get the best of both worlds » —
nettoyer ses commits locaux par rebase **avant** le premier push, mais ne jamais réécrire ce qui a déjà
été publié. La violation de cette règle d'or oblige les collaborateurs à re-merger un historique divergent.

**GitHub Flow (rappel du cycle) :** create a branch → make changes / commit → open a pull request →
address review comments → merge → delete branch. Chaque lot de changements **indépendant** vit sur sa
propre branche pour faciliter la revue.

**Enforcement gratuit recommandé (hors revue LLM) :** commitlint + `@commitlint/config-conventional` en
CI couvre R1/R2 (et borne R3 via `header-max-length`) ; un hook `pre-commit` peut lancer `git diff --check`
(R5) ; les protections de branche du forge imposent R8 (revue obligatoire) et l'auto-suppression couvre R9.

**Liens :** Conventional Commits → https://www.conventionalcommits.org/en/v1.0.0/ ·
Commit Guidelines → https://git-scm.com/book/en/v2/Distributed-Git-Contributing-to-a-Project ·
Perils of Rebasing → https://git-scm.com/book/en/v2/Git-Branching-Rebasing ·
GitHub Flow → https://docs.github.com/en/get-started/using-github/github-flow
