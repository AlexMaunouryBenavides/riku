---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: vitest
title: Testing with Vitest
discipline: vitest
kind: code
tech: [vitest]
layer:
  shared # agnostique : valable front ET back dès que Vitest est détecté.
  # Le gate tech:[vitest] suffit à n'activer le fichier que si Vitest est présent.
phase: [implementation, review]
level:
  preference # défaut : la plupart sont guidantes.
  # Les règles dont l'échec est silencieux/flaky sont marquées "guardrail".
status: active
version: 1.0
sources:
  - https://vitest.dev/guide/mocking
  - https://vitest.dev/api/mock
  - https://vitest.dev/guide/features
  - https://vitest.dev/api/ # test.each, test.only, expect.assertions
  - https://vitest.dev/config/ # clearMocks, mockReset, restoreMocks, unstubGlobals, unstubEnvs, globals, environment, include, coverage.provider
---

# Testing with Vitest

> **Intention :** un test Vitest est **isolé** (aucun état de mock, timer ou global ne fuit vers le test
> suivant), **déterministe**, et utilise les bons outils du runner. Ce fichier couvre le _runner Vitest_
> (mocks, timers, config, async) — le « quoi/pourquoi tester » générique vit dans `_strategy.md`.
> **Applies to :** `**/*.{test,spec}.?(c|m)[jt]s?(x)`, `**/vitest.config.*`, `**/vite.config.*`.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Réinitialiser l'état des mocks entre chaque test {#vitest.r1}

- **Règle :** activer `restoreMocks: true` (ou au minimum `clearMocks: true`) dans la config Vitest, ou réinitialiser explicitement en `afterEach`. Ne jamais laisser l'historique d'appels et l'implémentation d'un mock persister d'un test à l'autre.
- **Pourquoi :** `clearMocks`, `mockReset` et `restoreMocks` valent **`false` par défaut** : sans intervention, un mock garde ses appels et son implémentation entre les tests, ce qui rend les tests dépendants de l'ordre d'exécution (flaky, faux verts). La doc Vitest le rappelle explicitement : « Always remember to clear or restore mocks before or after each test run ».
- **Niveau :** guardrail
- **Vérifié par :** manuel (revue config) + grep CI sur `restoreMocks`/`clearMocks` dans `vitest.config.*` / `vite.config.*`.
- **Check (review) :** la config déclare `restoreMocks: true` **ou** `clearMocks: true` ; sinon, chaque suite touchant des mocks a un `afterEach` qui les réinitialise.
- ✅ **Bon :**
  ```ts
  // vitest.config.ts
  export default defineConfig({
    test: { restoreMocks: true }, // remet l'état + restaure les spies entre chaque test
  });
  ```
- ❌ **Mauvais :**
  ```ts
  // aucune des trois options, aucun afterEach → l'historique d'appels fuit d'un test à l'autre
  export default defineConfig({ test: {} });
  ```

### R2 — Espionner avec `vi.spyOn`, jamais par réassignation manuelle {#vitest.r2}

- **Règle :** pour observer/remplacer une méthode d'objet, utiliser `vi.spyOn(obj, 'method')`. Ne pas réassigner à la main (`obj.method = vi.fn()`).
- **Pourquoi :** seul un spy créé par `vi.spyOn` peut être **restauré** à son implémentation d'origine (`mockRestore`, ou `restoreMocks: true`). Une réassignation manuelle n'est pas restaurable : la méthode reste mockée pour tous les tests suivants.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** aucune réassignation directe d'une méthode existante par un `vi.fn()` ; les espions passent par `vi.spyOn`.
- ✅ **Bon :** `const spy = vi.spyOn(service, 'send');`
- ❌ **Mauvais :** `service.send = vi.fn();` — impossible à restaurer, fuite vers les autres tests.

### R3 — `vi.mock` est hoisté : pas de variable externe sans `vi.hoisted` {#vitest.r3}

- **Règle :** un appel `vi.mock('module', factory)` est **remonté en haut du fichier et exécuté avant tous les imports**. La factory ne doit donc référencer aucune variable du module de test ; si elle a besoin d'une valeur partagée, la déclarer via `vi.hoisted(() => …)`.
- **Pourquoi :** au moment où la factory s'exécute, les variables de premier niveau du fichier ne sont pas encore initialisées → `ReferenceError` ou comportement faux silencieux. `vi.hoisted` est le seul mécanisme garanti d'être disponible avant les imports.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** toute factory `vi.mock` qui consomme une valeur partagée la récupère via `vi.hoisted` ; aucune capture d'une `const` de premier niveau du fichier.
- ✅ **Bon :**
  ```ts
  const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
  vi.mock('./mailer', () => ({ send: sendMock }));
  ```
- ❌ **Mauvais :**
  ```ts
  const sendMock = vi.fn();
  vi.mock('./mailer', () => ({ send: sendMock })); // sendMock pas encore défini au hoisting
  ```

### R4 — Restaurer les vrais timers après usage des fake timers {#vitest.r4}

- **Règle :** si un test active `vi.useFakeTimers()` (ou `vi.setSystemTime()`), restaurer avec `vi.useRealTimers()` en `afterEach` (ou en fin de test).
- **Pourquoi :** `vi.useFakeTimers()` modifie **aussi le temps de `Date`**, et `vi.setSystemTime()` **ne se réinitialise pas** automatiquement entre les tests. Sans restauration, l'horloge mockée fuit vers les tests suivants et les rend non déterministes.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** tout fichier appelant `vi.useFakeTimers`/`setSystemTime` possède un `vi.useRealTimers()` symétrique (typiquement `afterEach`).
- ✅ **Bon :**
  ```ts
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  ```
- ❌ **Mauvais :** `vi.useFakeTimers()` sans `useRealTimers()` → `Date` reste figée pour la suite.

### R5 — Réinitialiser les globals et env stubés {#vitest.r5}

- **Règle :** après `vi.stubGlobal(...)` / `vi.stubEnv(...)`, activer `unstubGlobals: true` / `unstubEnvs: true` en config, ou appeler `vi.unstubAllGlobals()` / `vi.unstubAllEnvs()` en `afterEach`.
- **Pourquoi :** `vi.stubGlobal` et `vi.stubEnv` **ne se réinitialisent pas** automatiquement entre les tests tant que `unstubGlobals`/`unstubEnvs` (défaut **`false`**) ne sont pas activés. Un global/variable d'env stubé fuit donc vers tous les tests suivants.
- **Niveau :** guardrail
- **Vérifié par :** manuel + grep CI sur `unstubGlobals`/`unstubEnvs` dans la config.
- **Check (review) :** présence de `unstubGlobals: true`/`unstubEnvs: true` en config, ou d'un unstub explicite en `afterEach` dans les fichiers concernés.
- ✅ **Bon :**
  ```ts
  // vitest.config.ts
  export default defineConfig({
    test: { unstubGlobals: true, unstubEnvs: true },
  });
  ```
- ❌ **Mauvais :** `vi.stubGlobal('fetch', vi.fn())` sans config ni unstub → `fetch` reste mocké partout.

### R6 — Toujours `await`/`return` les assertions asynchrones {#vitest.r6}

- **Règle :** une assertion sur du code async (`await expect(p).rejects...`, `await expect(p).resolves...`, ou une promesse renvoyée) doit être **attendue** ou **retournée**. Quand des assertions sont conditionnelles (dans un `catch`, une callback), ajouter `expect.assertions(n)` ou `expect.hasAssertions()`.
- **Pourquoi :** une assertion async non attendue se résout **après** la fin du test : l'échec n'est jamais rattaché au test (faux vert). `expect.assertions(n)` garantit que le nombre attendu d'assertions a bien été exécuté.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** chaque `expect(...).resolves/.rejects` est précédé de `await` (ou retourné) ; les blocs où une assertion peut être sautée déclarent `expect.assertions`.
- ✅ **Bon :**
  ```ts
  await expect(createUser(bad)).rejects.toThrow(ValidationError);
  ```
- ❌ **Mauvais :**
  ```ts
  expect(createUser(bad)).rejects.toThrow(); // pas de await → l'échec arrive trop tard, test vert à tort
  ```

### R7 — Choix `globals` explicite et cohérent dans tout le projet {#vitest.r7}

- **Règle :** décider une fois entre API explicites (défaut, `globals: false`) et API globales façon Jest (`globals: true`), et s'y tenir. Avec `globals: false`, importer `describe`/`it`/`expect`/`vi` depuis `'vitest'`. Avec `globals: true`, référencer les types (`/// <reference types="vitest/globals" />` ou `types: ['vitest/globals']` en tsconfig).
- **Pourquoi :** par défaut Vitest **ne fournit pas** d'API globale (par souci d'explicité). Mélanger les deux modes donne des `ReferenceError` ou des imports incohérents d'un fichier à l'autre.
- **Niveau :** preference
- **Vérifié par :** manuel (tsc échoue si `globals` activé sans la référence de types).
- **Check (review) :** un seul mode dans tout le repo ; si `globals: false`, les helpers sont importés de `'vitest'`.
- ✅ **Bon :** `import { describe, it, expect, vi } from 'vitest';` (mode explicite par défaut).
- ❌ **Mauvais :** utiliser `describe`/`expect` sans import alors que `globals` n'est pas activé.

### R8 — `environment` adapté au code testé {#vitest.r8}

- **Règle :** garder `environment: 'node'` (défaut) pour de la logique pure/backend ; passer à `'jsdom'` ou `'happy-dom'` pour le code qui touche le DOM. Préférer un réglage **par fichier** (`// @vitest-environment jsdom`) quand seuls quelques tests ont besoin du DOM.
- **Pourquoi :** l'environnement par défaut est `'node'`, qui n'a pas de `document`/`window`. Forcer jsdom globalement alourdit inutilement les tests purement Node ; un override par fichier garde chaque test au plus près de son besoin.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** les tests utilisant le DOM déclarent un environnement jsdom/happy-dom (global ou par fichier) ; les tests purs restent en `node`.
- ✅ **Bon :** `// @vitest-environment jsdom` en tête d'un fichier de test de composant.
- ❌ **Mauvais :** `environment: 'jsdom'` global pour un projet à 90 % de logique Node.

### R9 — Nommer les fichiers de test `*.test.*` / `*.spec.*` {#vitest.r9}

- **Règle :** nommer les fichiers de test avec le suffixe `.test` ou `.spec` (`user.service.test.ts`, `button.spec.tsx`).
- **Pourquoi :** le glob `include` par défaut est `['**/*.{test,spec}.?(c|m)[jt]s?(x)']` : un fichier hors de ce motif n'est **pas découvert** par Vitest et ses tests ne tournent jamais (faux sentiment de couverture).
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** tout fichier contenant des `describe`/`it`/`test` respecte le suffixe `.test`/`.spec` (ou la config `include` est élargie en conséquence).
- ✅ **Bon :** `order.service.test.ts`
- ❌ **Mauvais :** `order.tests.ts` (au pluriel) → non matché, jamais exécuté.

### R10 — Ne jamais committer un test focalisé (`.only`) {#vitest.r10}

- **Règle :** ne pas laisser `it.only` / `describe.only` / `test.only` dans le code commité. Utile en local, à retirer avant le commit.
- **Pourquoi :** `.only` désactive silencieusement tous les autres tests du fichier. Vitest **détecte l'exécution en CI et lève une erreur** si un `.only` est présent — mais autant ne pas dépendre de ce filet et garder un signal local clair.
- **Niveau :** preference
- **Vérifié par :** Vitest en CI (échoue sur tout `.only`). Optionnel : grep pre-commit.
- **Check (review) :** aucune occurrence de `.only(` dans le diff.
- ✅ **Bon :** `it('crée un user', ...)`
- ❌ **Mauvais :** `it.only('crée un user', ...)` commité → le reste du fichier ne tourne plus.

### R11 — Paramétrer avec `test.each` / `test.for`, pas une boucle {#vitest.r11}

- **Règle :** pour tester la même logique sur plusieurs jeux de données, utiliser `test.each`/`it.each` (ou `test.for`) plutôt qu'une boucle `for`/`forEach` qui appelle `it` à l'intérieur.
- **Pourquoi :** `test.each` génère un cas nommé et reporté par jeu de données (sortie de test lisible, échec localisé) ; une boucle masque quel jeu a échoué et complique le reporting.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** pas d'appel à `it`/`test` à l'intérieur d'une boucle ; les variantes passent par `test.each`/`test.for`.
- ✅ **Bon :**
  ```ts
  test.each([
    [1, 1, 2],
    [2, 3, 5],
  ])('add(%i, %i) === %i', (a, b, expected) => {
    expect(add(a, b)).toBe(expected);
  });
  ```
- ❌ **Mauvais :**
  ```ts
  for (const [a, b, expected] of cases) {
    it('add', () => expect(add(a, b)).toBe(expected)); // un seul nom, échec non localisé
  }
  ```

### R12 — Provider de coverage choisi explicitement {#vitest.r12}

- **Règle :** quand on collecte la couverture, fixer explicitement `coverage.provider` (`'v8'`, le défaut, ou `'istanbul'`) plutôt que de s'en remettre à l'implicite.
- **Pourquoi :** le provider par défaut est `'v8'` ; le rendre explicite documente le choix et évite une dérive silencieuse si le défaut change. `v8` est rapide ; `istanbul` instrumente le code (utile pour certaines métriques fines).
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** `coverage.provider` est déclaré dès que la couverture est activée.
- ✅ **Bon :**
  ```ts
  export default defineConfig({ test: { coverage: { provider: 'v8' } } });
  ```
- ❌ **Mauvais :** activer `--coverage` sans jamais fixer le provider dans la config partagée.

## Anti-patterns

- Aucune des options `clearMocks`/`mockReset`/`restoreMocks` ni d'`afterEach` → #vitest.r1
- Méthode réassignée à la main au lieu de `vi.spyOn` → #vitest.r2
- Variable de premier niveau capturée dans une factory `vi.mock` sans `vi.hoisted` → #vitest.r3
- `vi.useFakeTimers()` sans `vi.useRealTimers()` → #vitest.r4
- `vi.stubGlobal`/`vi.stubEnv` sans `unstub*` ni reset → #vitest.r5
- `expect(...).rejects/.resolves` sans `await` → #vitest.r6
- API globales utilisées alors que `globals: false` → #vitest.r7
- jsdom forcé globalement pour un projet Node → #vitest.r8
- Fichier de test hors du glob `*.test`/`*.spec` → #vitest.r9
- `.only` commité → #vitest.r10
- `it` appelé dans une boucle au lieu de `test.each` → #vitest.r11
- Couverture activée sans `coverage.provider` explicite → #vitest.r12

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**`mockClear` vs `mockReset` vs `mockRestore`** (sémantique exacte, doc `api/mock`) :

| Méthode         | Historique d'appels | Implémentation                                                                                       | Restaure l'original (spies)                                                                                                  |
| --------------- | ------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `mockClear()`   | effacé              | **inchangée**                                                                                        | non                                                                                                                          |
| `mockReset()`   | effacé              | réinitialisée (sur `vi.fn()` → fn vide renvoyant `undefined` ; sur `vi.fn(impl)` → `impl` d'origine) | non                                                                                                                          |
| `mockRestore()` | effacé              | réinitialisée                                                                                        | **oui** (rend à l'objet espionné via `vi.spyOn` son descripteur d'origine ; sur un `vi.fn()` simple, équivaut à `mockReset`) |

Les options de config correspondantes appliquent ces méthodes **avant chaque test** : `clearMocks` → `mockClear`,
`mockReset` → `mockReset`, `restoreMocks` → `mockRestore`. Les trois valent `false` par défaut.

**Défauts de config utiles (vérifiés sur la doc Vitest) :**

- `globals`: `false` · `environment`: `'node'`
- `include`: `['**/*.{test,spec}.?(c|m)[jt]s?(x)']`
- `clearMocks` / `mockReset` / `restoreMocks` / `unstubGlobals` / `unstubEnvs`: `false`
- `coverage.provider`: `'v8'`

**Hoisting de `vi.mock` :** un `vi.mock` est remonté tout en haut du fichier et exécuté **avant les imports**.
Pour partager des mocks avec la factory, déclarer la valeur via `vi.hoisted(() => …)` (lui aussi hoisté).
Note : `vi.spyOn` « ne fonctionne pas en Browser Mode ».

**Fake timers :** `vi.useFakeTimers()` change aussi le temps de `Date` ; `vi.setSystemTime()` ne se réinitialise
pas seul entre les tests → restaurer avec `vi.useRealTimers()`.

**Frontière avec `_strategy.md` :** ce fichier ne couvre que l'outil Vitest. Les principes génériques
(Arrange-Act-Assert, nommage des tests, un comportement par test, éviter la logique dans les tests, tests
déterministes et indépendants) relèvent de la stratégie de test transverse — voir `rules/testing/_strategy.md`.

**Liens :** mocking → https://vitest.dev/guide/mocking · mock API → https://vitest.dev/api/mock ·
features → https://vitest.dev/guide/features · test API → https://vitest.dev/api/ ·
config → https://vitest.dev/config/
