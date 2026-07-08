---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: testing-strategy
title: Testing Strategy
discipline: testing-strategy
kind: checklist
tech: [] # agnostique : principes valables sur tout projet web (front comme back).
layer: shared
phase: [design, review]
level:
  preference # une stratégie est guidante par nature ; seul le déterminisme/isolation
  # (R5) est un garde-fou non négociable.
status: active
version: 1.0
sources:
  - https://www.ibm.com/think/insights/unit-testing-best-practices
  - https://www.startearly.ai/post/javascript-unit-testing-guide
  - https://www.startearly.ai/post/typescript-unit-testing-tips
---

# Testing Strategy

> **Intention :** poser le _quoi_ et le _pourquoi_ tester — principes transverses valables sur tout projet
> web (unitaire, intégration, e2e), indépendamment de l'outil. Le _comment_ (API, config) vit dans les
> fichiers outil : `jest.md`, `vitest.md`, `cypress.md`. Injecté au **design** (cadrer la stratégie) et à
> la **review** (vérifier que les tests donnent du signal).
> **Applies to :** `**/*.{test,spec}.*`, `**/*.cy.*`.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Structurer chaque test en Arrange-Act-Assert {#testing-strategy.r1}

- **Règle :** organiser chaque test en trois temps nets — **Arrange** (préparer le contexte et les données), **Act** (exécuter l'action testée), **Assert** (vérifier le résultat). Une seule phase « Act » par test.
- **Pourquoi :** le pattern AAA (« the well established Arrange-Act-Assert pattern ») rend l'intention immédiatement lisible et sépare la mise en place de la vérification.
- **Vérifié par :** manuel.
- **Check (review) :** les trois phases sont identifiables ; pas d'assertions entremêlées avec la préparation, pas de second « Act » caché.
- ✅ **Bon :**
  ```ts
  // Arrange
  const cart = new Cart([itemAt(10), itemAt(5)]);
  // Act
  const total = cart.total();
  // Assert
  expect(total).toBe(15);
  ```
- ❌ **Mauvais :** alterner action/assert/action dans un même test → on ne sait plus ce qui est sous test.

### R2 — Un seul comportement par test {#testing-strategy.r2}

- **Règle :** chaque test vérifie **un comportement** et répond à une seule question. Si un test affirme plusieurs choses indépendantes, le scinder.
- **Pourquoi :** « Tests that assert multiple things tend to fail unclearly. Split tests so that each one answers exactly one question. » Un test mono-comportement échoue de façon diagnostique : on sait _quoi_ est cassé.
- **Vérifié par :** manuel.
- **Check (review) :** un test ne couvre pas plusieurs cas/conditions distincts ; les assertions portent sur une même intention (plusieurs `expect` sur la même sortie restent acceptables).
- ✅ **Bon :** un test « refuse un email invalide », un autre « accepte un email valide ».
- ❌ **Mauvais :** un test « valide les emails » qui enchaîne 6 cas hétérogènes.

### R3 — Nommer le test par le comportement et la condition {#testing-strategy.r3}

- **Règle :** le nom du test décrit **ce qui est attendu et sous quelle condition**, en langage métier. Bannir les noms vagues (`test1`, `it('works')`).
- **Pourquoi :** « The test name is the debugger when the failure shows up in CI. » Un nom comme `Test-1` « doesn't provide enough detail on what's being tested or why » ; un bon nom explique l'échec sans ouvrir le code.
- **Vérifié par :** manuel.
- **Check (review) :** chaque nom est auto-suffisant et expressif.
- ✅ **Bon :** `it('returns 403 when user lacks project access')`
- ❌ **Mauvais :** `it('test access')` / `it('works')`

### R4 — Tester le comportement observable, pas l'implémentation {#testing-strategy.r4}

- **Règle :** asserter sur les **sorties observables** et l'**interface publique** (valeur retournée, état visible, effet de bord contractuel). Ne pas tester les détails internes (méthodes privées, ordre d'appels interne) sauf s'ils font partie du contrat.
- **Pourquoi :** « Unit tests should act like contracts. Given X input, the system should return Y. Don't test internal calls. » Tester l'implémentation rend les tests fragiles : ils cassent au moindre refactor sans bug réel. À l'inverse, « the public interface also requires testing ».
- **Vérifié par :** manuel.
- **Check (review) :** les assertions portent sur le contrat (entrées→sorties/état), pas sur la mécanique interne ; un refactor sans changement de comportement ne devrait pas casser le test.
- ✅ **Bon :** vérifier que `createUser(dto)` renvoie l'utilisateur créé / lève l'erreur attendue.
- ❌ **Mauvais :** vérifier que `createUser` a appelé `this._normalize()` puis `this._persist()` dans cet ordre.

### R5 — Tests déterministes, isolés et indépendants {#testing-strategy.r5}

- **Règle :** un test produit **toujours le même résultat** et passe **en isolation**, dans n'importe quel ordre. Aucune dépendance à l'horloge réelle, au réseau, à l'ordre d'exécution ou à l'état laissé par un autre test.
- **Pourquoi :** l'isolation profonde est au cœur du test unitaire ; un test flaky ou couplé détruit la confiance dans toute la suite et masque les vraies régressions. (Le _comment_ — figer le temps, réinitialiser les mocks, intercepter le réseau — est dans `jest.md`/`vitest.md`/`cypress.md`.)
- **Niveau :** guardrail
- **Vérifié par :** manuel (+ exécution répétée / ordre aléatoire en CI).
- **Check (review) :** aucun test ne lit l'état d'un autre ; temps/réseau/aléa sont contrôlés ; relancer la suite ou un test seul donne le même verdict.
- ✅ **Bon :** temps figé, dépendances I/O mockées, contexte posé en hook.
- ❌ **Mauvais :** test qui dépend de `Date.now()` réel, ou du test précédent pour exister.

### R6 — Tests rapides, courts et maintenables {#testing-strategy.r6}

- **Règle :** garder les tests **petits, focalisés et rapides**, avec la même exigence de qualité que le code de prod (lisibilité, clarté). Éviter la logique complexe (conditions/boucles/calculs) qui dupliquerait le code testé.
- **Pourquoi :** « tests should feature high-quality production code… written as small and focused tests… created with speed in mind because faster tests can be conducted more quickly and often. » Des tests lents ou alambiqués sont lancés moins souvent et deviennent eux-mêmes une source de bugs.
- **Vérifié par :** manuel.
- **Check (review) :** un test tient en quelques lignes lisibles ; pas de branche/boucle non triviale dans le test lui-même.
- ✅ **Bon :** données en clair + une action + une vérification.
- ❌ **Mauvais :** un test qui recalcule le résultat attendu avec la même logique que le code sous test.

### R7 — Couvrir les cas limites et les chemins d'erreur {#testing-strategy.r7}

- **Règle :** au-delà du cas nominal, tester les **bords** (valeurs limites, `null`/`undefined`, collections vides, dépassements) et les **chemins d'erreur** (exceptions, échecs attendus).
- **Pourquoi :** « maintain test coverage of edge cases and boundary conditions to ensure that your code… handle[s] all types of situations. » La plupart des bugs vivent aux frontières, pas sur le chemin heureux.
- **Vérifié par :** manuel.
- **Check (review) :** pour chaque unité, au moins un cas limite et un cas d'échec sont testés en plus du nominal.
- ✅ **Bon :** tester `divide(x, 0)`, l'entrée vide, la borne max.
- ❌ **Mauvais :** ne tester que `divide(10, 2)`.

### R8 — Isoler les dépendances externes par des doublures {#testing-strategy.r8}

- **Règle :** en test unitaire, remplacer les dépendances à effet de bord ou lentes (réseau, base, systèmes tiers, horloge) par des **doublures**. Repère : un **mock** vérifie un comportement/une interaction attendue, un **stub** fournit des données prédéfinies.
- **Pourquoi :** « Test environments depend upon the use of mocks and stubs to foster the deep isolation required for testing. » On teste la décision de l'unité sans déclencher les effets de bord ni la lenteur du monde réel. (Le _comment_ est dans les fichiers outil.)
- **Vérifié par :** manuel.
- **Check (review) :** les unités testées n'atteignent pas réseau/DB/horloge réels ; les doublures correspondent au bon type (mock vs stub) selon ce qu'on vérifie.
- ✅ **Bon :** stubber le repository pour renvoyer un jeu de données fixe ; mocker l'envoi d'email pour vérifier qu'il a lieu.
- ❌ **Mauvais :** un test unitaire qui ouvre une vraie connexion DB.

### R9 — Garantir un état de départ propre {#testing-strategy.r9}

- **Règle :** chaque test démarre d'un **état connu et propre**. Réinitialiser ce qui est partagé (mocks, variables globales, fichiers temporaires, connexions, données de base) au bon moment du cycle de vie.
- **Pourquoi :** « it's easy for test fails to occur because of existing bits of stray code tripping up future tests. » Un état résiduel rend les échecs non reproductibles. _Quand_ nettoyer dépend de l'outil : réinitialisation des mocks avant chaque test (jest/vitest), nettoyage **avant** plutôt qu'après en Cypress (`after` peut ne pas s'exécuter), teardown des ressources e2e.
- **Vérifié par :** manuel.
- **Check (review) :** la suite ne dépend d'aucun résidu d'un run précédent ; le reset partagé est explicite et placé selon les règles outil.
- ✅ **Bon :** seed/reset en `beforeEach` ; ressources e2e fermées en fin de suite.
- ❌ **Mauvais :** s'appuyer sur l'état laissé par le test précédent.

### R10 — Choisir le bon niveau de test et séparer les trois {#testing-strategy.r10}

- **Règle :** distinguer et **séparer** les niveaux — **unitaire** (logique d'une unité en isolation), **intégration** (collaboration entre modules/couches), **e2e** (parcours utilisateur de bout en bout). Tester chaque chose au niveau le plus bas qui a du sens ; réserver l'e2e aux parcours critiques.
- **Pourquoi :** séparer « unit, integration, and end-to-end tests » garde une suite lisible et un feedback rapide ; pousser tout en e2e donne une suite lente et fragile, tout pousser en unitaire rate les défauts d'intégration.
- **Vérifié par :** manuel.
- **Check (review) :** un comportement testable en unitaire ne l'est pas via un e2e coûteux ; les niveaux sont rangés/identifiables.
- ✅ **Bon :** logique de calcul en unitaire, câblage controller↔service en intégration, « checkout complet » en e2e.
- ❌ **Mauvais :** valider une règle de calcul de prix uniquement via un parcours Cypress.

### R11 — Automatiser la suite en intégration continue {#testing-strategy.r11}

- **Règle :** exécuter la suite **automatiquement en CI** à chaque changement de code (push/PR), et traiter un échec comme bloquant.
- **Pourquoi :** « automated unit tests can take place at any time code changes are enacted… detect errors early in the development process and… safeguard code quality. » La valeur d'un test n'existe que s'il tourne systématiquement.
- **Vérifié par :** CI (la suite est une étape obligatoire du pipeline).
- **Check (review) :** un job CI lance les tests ; un échec fait échouer la PR.
- ✅ **Bon :** étape `test` obligatoire avant merge.
- ❌ **Mauvais :** tests lancés seulement à la main, en local, quand on y pense.

### R12 — La couverture est un indicateur, pas un objectif {#testing-strategy.r12}

- **Règle :** se servir de la couverture pour **repérer les zones non testées**, pas comme une cible à atteindre. Ne pas écrire de tests dont le seul but est de monter le pourcentage.
- **Pourquoi :** « Don't test logic branches just to bump coverage. » Un test sans assertion utile gonfle le chiffre sans donner de signal — « the value of a test… is in how much signal it gives you when something changes ».
- **Vérifié par :** manuel.
- **Check (review) :** pas de tests « vides » (montage sans assertion pertinente) ; les manques de couverture sont jugés au cas par cas, pas comblés mécaniquement.
- ✅ **Bon :** viser à couvrir les comportements importants et les bords.
- ❌ **Mauvais :** un test qui exécute une branche sans rien vérifier, pour le %.

### R13 — Tirer parti des types dans un codebase typé {#testing-strategy.r13}

- **Règle :** dans un projet typé (TypeScript), **typer explicitement** les entrées et sorties des tests et des doublures. Considérer types et tests comme **complémentaires**, pas substituables.
- **Pourquoi :** « Use explicit type definitions to clarify your test inputs and outputs » : le compilateur signale les incompatibilités tôt. Mais « static typing… cannot catch every logical bug » — les tests restent nécessaires pour le comportement.
- **Vérifié par :** tsc (les doublures mal typées échouent à la compilation).
- **Check (review) :** pas de doublure `any` opaque masquant une dérive de contrat ; les données de test respectent les types du domaine.
- ✅ **Bon :** un stub typé conforme à l'interface du service réel.
- ❌ **Mauvais :** `const repo = {} as any` qui laisse passer n'importe quelle dérive d'API.

## Anti-patterns

- Test sans structure AAA claire (Act multiples) → #testing-strategy.r1
- Test qui affirme plusieurs comportements à la fois → #testing-strategy.r2
- Nom de test vague (`test1`, `works`) → #testing-strategy.r3
- Assertions sur l'implémentation interne plutôt que le contrat → #testing-strategy.r4
- Test flaky / dépendant de l'ordre / de l'horloge réelle → #testing-strategy.r5
- Test lent, long ou avec sa propre logique dupliquant le code → #testing-strategy.r6
- Seul le chemin heureux est testé → #testing-strategy.r7
- Test unitaire qui touche réseau/DB/horloge réels → #testing-strategy.r8
- Test qui dépend d'un état résiduel non nettoyé → #testing-strategy.r9
- Tout poussé en e2e (ou tout en unitaire) → #testing-strategy.r10
- Tests lancés à la main seulement, pas en CI → #testing-strategy.r11
- Tests « vides » écrits pour le pourcentage de couverture → #testing-strategy.r12
- Doublures `any` non typées dans un projet TS → #testing-strategy.r13

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Mock vs stub (vocabulaire, def. IBM) :** un **mock** est une duplication servant à évaluer/vérifier le
_comportement_ attendu d'un objet en isolation ; un **stub** fournit des _données_ prédéfinies sur les
interactions avec une dépendance externe (composants, système de fichiers, etc.). En pratique : on **vérifie**
un mock, on **lit** un stub.

**Répartition du travail dans le kit :** ce fichier porte la _stratégie_ (le quoi/pourquoi). Le _comment_
outil est délégué :

- réinitialisation des mocks, fake timers, hoisting → `rules/testing/jest.md`, `rules/testing/vitest.md` ;
- sélecteurs stables, attentes réseau, isolation e2e, nettoyage **avant** les tests → `rules/testing/cypress.md`.
  Quand une règle outil et une règle de stratégie se recoupent (ex. R5/R9), la règle outil donne la mise en
  œuvre concrète ; appliquer les deux ensemble plutôt que de les dupliquer.

**Niveaux de test (rappel) :**

- _unitaire_ — une unité isolée, dépendances doublées, très rapide ;
- _intégration_ — plusieurs modules/couches ensemble (ex. controller↔service↔DB de test) ;
- _e2e_ — parcours utilisateur complet à travers l'app réelle (Cypress).
  Tester au niveau le plus bas qui a du sens ; garder l'e2e pour les parcours critiques.

**Frontière avec ce qui n'est pas ici :** les conventions de code (nommage, structure des fichiers de prod),
la validation d'entrée, la sécurité, etc. relèvent de leurs disciplines propres dans `rules/**`, pas de la
stratégie de test.

**Liens :** unit testing best practices (IBM) → https://www.ibm.com/think/insights/unit-testing-best-practices ·
JS unit testing guide → https://www.startearly.ai/post/javascript-unit-testing-guide ·
TypeScript unit testing tips → https://www.startearly.ai/post/typescript-unit-testing-tips
