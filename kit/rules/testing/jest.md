---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: jest
title: Testing with Jest
discipline: jest
kind: code
tech: [jest]
layer:
  backend # convention du kit : Jest = runner backend (Nest). Le bloc Nest (R10–R13)
  # ne s'applique que si NestJS est aussi détecté (chaque règle le précise).
phase: [implementation, review]
level:
  preference # défaut : la plupart sont guidantes.
  # Les règles dont l'échec est silencieux/flaky sont marquées "guardrail".
status: active
version: 1.0
sources:
  - https://jestjs.io/docs/api
  - https://jestjs.io/docs/jest-object
  - https://jestjs.io/docs/mock-function-api
  - https://jestjs.io/docs/configuration
  - https://jestjs.io/docs/manual-mocks
  - https://docs.nestjs.com/fundamentals/testing
---

# Testing with Jest

> **Intention :** un test Jest est **isolé** (aucun état de mock, timer ou module ne fuit vers le test
> suivant), **déterministe**, et — côté NestJS — câblé via les utilitaires `@nestjs/testing` plutôt qu'à la
> main. Ce fichier couvre le _runner Jest_ et le _testing NestJS_ ; le « quoi/pourquoi tester » générique
> vit dans `_strategy.md`.
> **Applies to :** `**/*.{test,spec}.?([cm])[jt]s?(x)`, `**/__tests__/**`, `**/jest.config.*`.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Réinitialiser l'état des mocks entre chaque test {#jest.r1}

- **Règle :** activer `restoreMocks: true` (ou au minimum `clearMocks: true`) dans la config Jest, ou réinitialiser explicitement en `afterEach` (`jest.restoreAllMocks()` / `jest.clearAllMocks()`). Ne jamais laisser l'historique d'appels et l'implémentation d'un mock persister d'un test à l'autre.
- **Pourquoi :** `clearMocks`, `resetMocks` et `restoreMocks` valent **`false` par défaut** : sans intervention, un mock garde ses appels et son implémentation entre les tests, ce qui rend les tests dépendants de l'ordre d'exécution (flaky, faux verts).
- **Niveau :** guardrail
- **Vérifié par :** manuel (revue config) + grep CI sur `restoreMocks`/`clearMocks` dans `jest.config.*`.
- **Check (review) :** la config déclare `restoreMocks: true` **ou** `clearMocks: true` ; sinon, chaque suite touchant des mocks réinitialise en `afterEach`.
- ✅ **Bon :**
  ```js
  // jest.config.js
  module.exports = { restoreMocks: true }; // applique mockRestore avant chaque test
  ```
- ❌ **Mauvais :**
  ```js
  module.exports = {}; // aucune des trois options → l'état des mocks fuit d'un test à l'autre
  ```

### R2 — Espionner avec `jest.spyOn`, jamais par réassignation manuelle {#jest.r2}

- **Règle :** pour observer/remplacer une méthode d'objet, utiliser `jest.spyOn(obj, 'method')`. Ne pas réassigner à la main (`obj.method = jest.fn()`).
- **Pourquoi :** `jest.restoreAllMocks()` (et `restoreMocks: true`) ne restaure que les mocks créés par `jest.spyOn` (et les propriétés via `jest.replaceProperty`). Une réassignation manuelle n'est pas restaurée : la méthode reste mockée pour tous les tests suivants.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** aucune réassignation directe d'une méthode existante par un `jest.fn()` ; les espions passent par `jest.spyOn`.
- ✅ **Bon :** `const spy = jest.spyOn(service, 'send');`
- ❌ **Mauvais :** `service.send = jest.fn();` — non restaurable, fuite vers les autres tests.

### R3 — `jest.mock` est hoisté : factory sans variable externe non préfixée `mock` {#jest.r3}

- **Règle :** un `jest.mock('module', factory)` est **remonté en haut du module, avant tous les imports**. La factory ne doit donc référencer aucune variable du fichier de test ; seules les variables dont le nom est préfixé par `mock` (insensible à la casse) sont autorisées.
- **Pourquoi :** au moment où la factory s'exécute (avant les imports), les variables de premier niveau ne sont pas encore initialisées. Babel-jest émet une erreur si la factory référence une variable hors scope non préfixée `mock` — garde-fou contre les mocks non initialisés. (En ESM, `jest.mock` **n'est pas** hoisté : voir Reference.)
- **Niveau :** guardrail
- **Vérifié par :** manuel (babel-jest lève l'erreur de hoisting au build des tests).
- **Check (review) :** toute factory `jest.mock` qui consomme une valeur partagée utilise une variable préfixée `mock`.
- ✅ **Bon :**
  ```js
  const mockSend = jest.fn();
  jest.mock('./mailer', () => ({ send: mockSend })); // 'mock'-préfixé → autorisé
  ```
- ❌ **Mauvais :**
  ```js
  const send = jest.fn();
  jest.mock('./mailer', () => ({ send })); // erreur : variable hors scope non préfixée 'mock'
  ```

### R4 — Restaurer les vrais timers après usage des fake timers {#jest.r4}

- **Règle :** si un test active `jest.useFakeTimers()` (ou `jest.setSystemTime()`), restaurer avec `jest.useRealTimers()` en `afterEach` (ou en fin de test).
- **Pourquoi :** `jest.useFakeTimers()` remplace les versions globales de `Date`, `performance` et des timers ; sans `jest.useRealTimers()`, ces remplacements fuient vers les tests suivants et les rendent non déterministes.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** tout fichier appelant `jest.useFakeTimers`/`setSystemTime` possède un `jest.useRealTimers()` symétrique (typiquement `afterEach`).
- ✅ **Bon :**
  ```js
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  ```
- ❌ **Mauvais :** `jest.useFakeTimers()` sans `useRealTimers()` → timers/`Date` mockés pour la suite.

### R5 — Toujours `await`/`return` les assertions asynchrones {#jest.r5}

- **Règle :** un test async doit **retourner** ou **`await`** sa promesse (`return expect(p).resolves...`, `await expect(p).rejects...`). Pour du code à callback, utiliser le paramètre `done`. Quand des assertions sont conditionnelles, ajouter `expect.assertions(n)` ou `expect.hasAssertions()`.
- **Pourquoi :** « If a promise is returned from `test`, Jest will wait for the promise to resolve before letting the test complete ». Une promesse ni retournée ni attendue se résout après la fin du test (faux vert). `expect.assertions(n)` garantit que le nombre attendu d'assertions a bien été exécuté.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** chaque `expect(...).resolves/.rejects` est `await`/retourné ; les blocs où une assertion peut être sautée déclarent `expect.assertions`/`hasAssertions`.
- ✅ **Bon :**
  ```js
  await expect(createUser(bad)).rejects.toThrow(ValidationError);
  ```
- ❌ **Mauvais :**
  ```js
  expect(createUser(bad)).rejects.toThrow(); // pas de await → échec après le test, vert à tort
  ```

### R6 — Mode `globals` cohérent dans tout le projet {#jest.r6}

- **Règle :** par défaut Jest **injecte** ses globals (`injectGlobals: true`) : `describe`/`test`/`expect` sont disponibles sans import. Si on désactive (`injectGlobals: false`), importer explicitement depuis `@jest/globals`. Choisir un mode et s'y tenir dans tout le repo.
- **Pourquoi :** le défaut est `injectGlobals: true`. Mélanger globals injectés et imports `@jest/globals` selon les fichiers crée des incohérences et casse le typage si la référence de types n'est pas posée.
- **Niveau :** preference
- **Vérifié par :** manuel (tsc échoue si globals utilisés sans `@types/jest`/`@jest/globals`).
- **Check (review) :** un seul mode dans tout le repo.
- ✅ **Bon :** s'appuyer sur les globals injectés (défaut), avec `@types/jest` pour le typage ; ou tout importer de `@jest/globals`.
- ❌ **Mauvais :** certains fichiers important de `@jest/globals`, d'autres s'appuyant sur l'injection, sans règle claire.

### R7 — Nommer les fichiers de test selon `testMatch` {#jest.r7}

- **Règle :** nommer les fichiers de test `*.test.*` / `*.spec.*`, ou les placer sous `__tests__/`.
- **Pourquoi :** le `testMatch` par défaut est `["**/__tests__/**/*.?([mc])[jt]s?(x)", "**/?(*.)+(spec|test).?([mc])[jt]s?(x)"]` : un fichier hors de ces motifs n'est **pas découvert** et ses tests ne tournent jamais (fausse couverture).
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** tout fichier de test respecte un des motifs `testMatch` (ou la config est élargie en conséquence).
- ✅ **Bon :** `cats.service.spec.ts`
- ❌ **Mauvais :** `cats.tests.ts` (pluriel) → non matché, jamais exécuté.

### R8 — Ne jamais committer un test focalisé (`.only` / `fit`) {#jest.r8}

- **Règle :** ne pas laisser `it.only` / `describe.only` / `fit` / `fdescribe` dans le code commité. Utile en local, à retirer avant le commit.
- **Pourquoi :** `.only` (et son alias `fit`) désactive silencieusement tous les autres tests du fichier — la suite passe au vert en n'exécutant qu'une fraction des tests. Contrairement à Vitest, Jest **ne lève pas** d'erreur en CI par défaut : il faut un garde-fou explicite.
- **Niveau :** preference
- **Vérifié par :** grep CI / hook pre-commit (ou règle ESLint dédiée si activée).
- **Check (review) :** aucune occurrence de `.only(` / `fit(` / `fdescribe(` dans le diff.
- ✅ **Bon :** `it('crée un user', ...)`
- ❌ **Mauvais :** `it.only('crée un user', ...)` commité → le reste du fichier ne tourne plus.

### R9 — Paramétrer avec `test.each`, pas une boucle {#jest.r9}

- **Règle :** pour tester la même logique sur plusieurs jeux de données, utiliser `test.each`/`it.each` plutôt qu'une boucle `for`/`forEach` qui appelle `it` à l'intérieur.
- **Pourquoi :** `test.each` génère un cas nommé et reporté par jeu de données (sortie lisible, échec localisé) ; une boucle masque quel jeu a échoué.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** pas d'appel à `it`/`test` dans une boucle ; les variantes passent par `test.each`.
- ✅ **Bon :**
  ```js
  test.each([
    [1, 1, 2],
    [2, 3, 5],
  ])('add(%i, %i) === %i', (a, b, expected) => {
    expect(add(a, b)).toBe(expected);
  });
  ```
- ❌ **Mauvais :**
  ```js
  for (const [a, b, expected] of cases) {
    it('add', () => expect(add(a, b)).toBe(expected)); // un seul nom, échec non localisé
  }
  ```

### R10 — _(NestJS)_ Câbler le test via `Test.createTestingModule().compile()` {#jest.r10}

- **Règle :** pour un test qui a besoin du conteneur DI Nest, construire le module avec `Test.createTestingModule({...})` puis **`await .compile()`**, et récupérer les instances **statiques** (controllers/providers) avec `moduleRef.get(Token)`.
- **Pourquoi :** `compile()` est **asynchrone** (bootstrap du module et de ses dépendances) et doit être attendu ; une fois compilé, `get()` renvoie les instances statiques déclarées. Câbler à la main les dépendances rate la résolution DI réelle.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** `createTestingModule(...).compile()` est `await` ; les instances statiques sont obtenues via `get()`. _(s'applique si NestJS détecté.)_
- ✅ **Bon :**
  ```ts
  const moduleRef = await Test.createTestingModule({
    providers: [CatsService],
  }).compile();
  const service = moduleRef.get(CatsService);
  ```
- ❌ **Mauvais :** `Test.createTestingModule({...}).compile()` sans `await`, ou `moduleRef.get(...)` avant compilation.

### R11 — _(NestJS)_ Providers scoped/request/transient : `resolve()`, pas `get()` {#jest.r11}

- **Règle :** pour un provider **request-scoped** ou **transient**, obtenir l'instance avec **`await moduleRef.resolve(Token)`**. Ne pas utiliser `get()` pour ces providers.
- **Pourquoi :** « `get()` can only retrieve **static** instances » ; les providers scoped vivent dans un sous-arbre du conteneur DI résolu dynamiquement. `resolve()` renvoie une instance unique par contexte — `get()` sur un provider scoped ne donne pas l'instance attendue.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** tout provider `@Injectable({ scope: Scope.REQUEST | Scope.TRANSIENT })` est récupéré via `resolve()` dans les tests. _(s'applique si NestJS détecté.)_
- ✅ **Bon :** `const service = await moduleRef.resolve(RequestScopedService);`
- ❌ **Mauvais :** `const service = moduleRef.get(RequestScopedService);` — instance statique inattendue pour un provider scoped.

### R12 — _(NestJS)_ Remplacer les dépendances par les overrides du module {#jest.r12}

- **Règle :** substituer une dépendance via `.overrideProvider(Token).useValue(...)` (ou `.useClass(...)` / `.useFactory(...)`) sur le `TestingModule`. Pour beaucoup de dépendances manquantes, utiliser `.useMocker(token => ...)`. Pour guards/interceptors/filters/pipes, utiliser `overrideGuard()` / `overrideInterceptor()` / `overrideFilter()` / `overridePipe()`.
- **Pourquoi :** ces overrides remplacent proprement le provider dans le conteneur DI de test (ex. mocker la base au lieu de s'y connecter), sans toucher au code de prod. `useMocker` évite de câbler manuellement un grand nombre de mocks.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** les test-doubles passent par les méthodes `override*` / `useMocker`, pas par une mutation du vrai provider. _(s'applique si NestJS détecté.)_
- ✅ **Bon :**
  ```ts
  const moduleRef = await Test.createTestingModule({
    controllers: [CatsController],
  })
    .overrideProvider(CatsService)
    .useValue({ findAll: jest.fn().mockResolvedValue([]) })
    .compile();
  ```
- ❌ **Mauvais :** instancier le vrai `CatsService` connecté à la base dans un test unitaire.

### R13 — _(NestJS e2e)_ Cycle de vie de l'app de test maîtrisé {#jest.r13}

- **Règle :** pour un test e2e, créer l'app avec `moduleRef.createNestApplication()`, **`await app.init()`**, envoyer les requêtes avec Supertest via `request(app.getHttpServer())`, puis **`await app.close()`** en `afterAll`.
- **Pourquoi :** `createNestApplication()` instancie le runtime Nest complet (nécessaire car après `compile()` seul, `HttpAdapterHost#httpAdapter` est `undefined`) ; `init()` démarre l'app ; `app.close()` libère serveur, connexions et ressources — sans lui, les handles restent ouverts et la suite de tests peut ne pas se terminer.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** chaque suite e2e fait `await app.init()` après `createNestApplication()` et `await app.close()` en `afterAll`. _(s'applique si NestJS détecté.)_
- ✅ **Bon :**
  ```ts
  app = moduleRef.createNestApplication();
  await app.init();
  // ... return request(app.getHttpServer()).get('/cats').expect(200);
  afterAll(async () => {
    await app.close();
  });
  ```
- ❌ **Mauvais :** lancer les requêtes Supertest sans `app.init()`, ou omettre `app.close()` → handles ouverts, tests qui pendent.

## Anti-patterns

- Aucune des options `clearMocks`/`resetMocks`/`restoreMocks` ni d'`afterEach` → #jest.r1
- Méthode réassignée à la main au lieu de `jest.spyOn` → #jest.r2
- Factory `jest.mock` référençant une variable hors scope non préfixée `mock` → #jest.r3
- `jest.useFakeTimers()` sans `jest.useRealTimers()` → #jest.r4
- `expect(...).rejects/.resolves` sans `await`/`return` → #jest.r5
- Modes globals mélangés (injection vs `@jest/globals`) → #jest.r6
- Fichier de test hors des motifs `testMatch` → #jest.r7
- `.only` / `fit` / `fdescribe` commité → #jest.r8
- `it` appelé dans une boucle au lieu de `test.each` → #jest.r9
- `createTestingModule().compile()` non `await` → #jest.r10
- `get()` utilisé pour un provider scoped/request → #jest.r11
- Vrai provider muté au lieu d'`overrideProvider`/`useMocker` → #jest.r12
- e2e sans `app.init()` / sans `app.close()` → #jest.r13

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**`clearAllMocks` vs `resetAllMocks` vs `restoreAllMocks`** (doc `jest-object`) :

| Méthode                  | Équivaut à                       | Effet                                                                                                                                                                           | Restaure l'original |
| ------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `jest.clearAllMocks()`   | `.mockClear()` sur chaque mock   | efface `mock.calls`, `mock.instances`, `mock.contexts`, `mock.results`                                                                                                          | non                 |
| `jest.resetAllMocks()`   | `.mockReset()` sur chaque mock   | efface l'historique **et** l'implémentation                                                                                                                                     | non                 |
| `jest.restoreAllMocks()` | `.mockRestore()` sur chaque mock | restaure la valeur d'origine — **uniquement** pour les mocks créés via `jest.spyOn` et les props via `jest.replaceProperty` ; les autres mocks doivent être restaurés à la main | oui (spies)         |

Les options de config appliquent ces méthodes **avant chaque test** : `clearMocks` → `clearAllMocks`,
`resetMocks` → `resetAllMocks`, `restoreMocks` → `restoreAllMocks`. Les trois valent `false` par défaut.

**Défauts de config utiles (vérifiés sur la doc Jest) :**

- `clearMocks` / `resetMocks` / `restoreMocks` / `resetModules`: `false`
- `injectGlobals`: `true` (globals disponibles sans import ; `false` → importer de `@jest/globals`)
- `testMatch`: `["**/__tests__/**/*.?([mc])[jt]s?(x)", "**/?(*.)+(spec|test).?([mc])[jt]s?(x)"]`

**Hoisting de `jest.mock` :** « Jest will automatically hoist `jest.mock` calls to the top of the module
(before any imports). » Conséquence : la factory ne peut référencer que des variables préfixées `mock`.
**Caveat ESM :** si le support ECMAScript Modules est activé, `jest.mock` **n'est pas** hoisté (le loader ESM
évalue les imports statiques avant le code) — voir la doc ECMAScriptModules de Jest.

**NestJS — `get()` vs `resolve()` :** `moduleRef.get(Token)` ne renvoie que les instances **statiques** ;
`await moduleRef.resolve(Token)` est requis pour les providers **request-scoped** ou **transient** et renvoie
une instance unique par contexte (deux appels donnent des instances différentes).
`REQUEST` et `INQUIRER` ne peuvent pas être auto-mockés par `useMocker` (déjà prédéfinis dans le contexte) ;
les surcharger via `overrideProvider` / un custom provider.

**NestJS — caveat `httpAdapter` :** après `compile()` seul, `HttpAdapterHost#httpAdapter` est `undefined`
(aucun serveur HTTP créé à ce stade). Utiliser `createNestApplication()` quand le test a besoin de
l'adaptateur HTTP.

**Frontière avec `_strategy.md` :** ce fichier ne couvre que l'outil Jest et le testing NestJS. Les principes
génériques (Arrange-Act-Assert, nommage des tests, un comportement par test, éviter la logique dans les tests,
tests déterministes et indépendants) relèvent de la stratégie transverse — voir `rules/testing/_strategy.md`.

**Liens :** API → https://jestjs.io/docs/api · jest object → https://jestjs.io/docs/jest-object ·
mock function API → https://jestjs.io/docs/mock-function-api · config → https://jestjs.io/docs/configuration ·
manual mocks (hoisting) → https://jestjs.io/docs/manual-mocks · testing Nest → https://docs.nestjs.com/fundamentals/testing
