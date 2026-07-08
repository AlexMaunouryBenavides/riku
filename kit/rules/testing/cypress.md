---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: cypress
title: E2E & Component testing with Cypress
discipline: cypress
kind: code
tech: [cypress]
layer: frontend
phase: [implementation, review]
level:
  preference # défaut : la plupart sont guidantes.
  # Les règles dont l'échec est flaky/cassant/sécurité sont marquées "guardrail".
status: active
version: 1.0
sources:
  - https://docs.cypress.io/app/core-concepts/best-practices
  - https://docs.cypress.io/app/core-concepts/writing-and-organizing-tests
  - https://docs.cypress.io/app/component-testing/react/api
  - https://docs.cypress.io/app/component-testing/react/examples
  - https://docs.cypress.io/app/tooling/typescript-support
---

# E2E & Component testing with Cypress

> **Intention :** un test Cypress est **stable** (sélecteurs robustes, attentes déterministes), **isolé**
> (chaque spec passe seule) et **rapide à préparer** (état posé par API, pas par l'UI). Ce fichier couvre
> l'outil Cypress (E2E + component testing React) ; le « quoi tester en E2E vs unitaire » vit dans `_strategy.md`.
> **Applies to :** `**/cypress/**`, `**/*.cy.{js,jsx,ts,tsx}`, `**/cypress.config.*`.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Sélectionner les éléments via `data-*` (`data-cy`) {#cypress.r1}

- **Règle :** cibler les éléments avec un attribut dédié aux tests (`[data-cy="submit"]`). Ne pas se baser sur `id`, `class`, `tag`, ni sur le `textContent` susceptible de changer.
- **Pourquoi :** « Use `data-*` attributes to provide context to your selectors and isolate them from CSS or JS changes. » Les sélecteurs CSS/structurels cassent au moindre refactor de style ou de markup → tests fragiles.
- **Niveau :** guardrail
- **Vérifié par :** manuel + grep CI sur les sélecteurs CSS fragiles dans les specs.
- **Check (review) :** les interactions/assertions ciblent des attributs `data-*` ; pas de `cy.get('.btn-primary')` ni de sélection par texte volatil.
- ✅ **Bon :** `cy.get('[data-cy="submit"]').click();`
- ❌ **Mauvais :** `cy.get('.btn.btn-large.btn-primary').click();` — casse dès qu'une classe change.

### R2 — Ne pas affecter le retour d'une commande à une variable {#cypress.r2}

- **Règle :** ne jamais faire `const x = cy.get(...)`. Utiliser les **alias** (`.as('name')`) et les **closures** (`.then(...)`) pour réutiliser une valeur produite par une commande.
- **Pourquoi :** les commandes Cypress sont asynchrones et mises en file — elles ne **retournent pas** leur valeur de façon synchrone. « Use aliases and closures to access and store what Commands yield you. »
- **Niveau :** guardrail
- **Vérifié par :** manuel + grep CI sur `(const|let|var)\s+\w+\s*=\s*cy\.`.
- **Check (review) :** aucune affectation `const/let/var` d'une commande `cy.*` ; les valeurs réutilisées passent par `.as()` ou `.then()`.
- ✅ **Bon :**
  ```js
  cy.get('a').as('links');
  cy.get('@links').first().click();
  ```
- ❌ **Mauvais :**
  ```js
  const links = cy.get('a'); // links n'est pas l'élément — c'est un objet Chainable
  links.first().click();
  ```

### R3 — Pas de `cy.wait(Number)` arbitraire {#cypress.r3}

- **Règle :** ne pas attendre un délai fixe (`cy.wait(3000)`). Attendre une **route aliasée** (`cy.intercept(...).as('x')` puis `cy.wait('@x')`) ou s'appuyer sur une assertion qui retente jusqu'à satisfaction.
- **Pourquoi :** « Use route aliases or assertions to guard Cypress from proceeding until an explicit condition is met. » Un délai fixe est soit trop court (flaky), soit trop long (lent) ; l'attente sur condition est déterministe.
- **Niveau :** guardrail
- **Vérifié par :** manuel + grep CI sur `cy\.wait\(\s*\d`.
- **Check (review) :** aucun `cy.wait(<nombre>)` ; les attentes réseau passent par un alias d'`intercept`.
- ✅ **Bon :**
  ```js
  cy.intercept('GET', '/users').as('getUsers');
  cy.visit('/users');
  cy.wait('@getUsers');
  ```
- ❌ **Mauvais :** `cy.wait(5000);` — pari sur le temps, instable.

### R4 — Tests indépendants, exécutables en isolation {#cypress.r4}

- **Règle :** chaque test doit pouvoir tourner seul **et passer**. Ne pas coupler des tests entre eux ni faire dépendre un test de l'état laissé par un précédent. Factoriser le setup partagé dans `before`/`beforeEach`.
- **Pourquoi :** « Tests should always be able to be run independently from one another and still pass. » Le couplage rend les échecs non reproductibles et casse l'exécution ciblée (`.only`, retries, parallélisation).
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** aucun test ne lit une variable/état produit par un autre `it` ; le contexte nécessaire est (re)posé en hook.
- ✅ **Bon :** chaque `it` pose son contexte via `beforeEach` (login programmatique, seed).
- ❌ **Mauvais :** un `it('crée')` suivi d'un `it('modifie')` qui suppose l'élément créé par le premier.

### R5 — Préparer l'état programmatiquement, pas par l'UI {#cypress.r5}

- **Règle :** pour le setup (authentification comprise), utiliser `cy.request()`, `cy.task()` ou des commandes base de données, et `cy.session()` pour mettre en cache la session. Réserver l'UI au comportement réellement testé.
- **Pourquoi :** « Programmatically log into your application, and take control of your application's state. » Passer par l'UI pour chaque setup est lent et fragile, et noie le test réel sous des étapes de préparation.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** le login/seed des specs passe par `cy.request`/`cy.session`/`cy.task`, pas par une série de `cy.get(...).type(...)` répétée dans chaque test.
- ✅ **Bon :** `cy.session('user', () => cy.request('POST', '/api/login', creds));`
- ❌ **Mauvais :** remplir et soumettre le formulaire de login dans chaque `beforeEach`.

### R6 — Nettoyer l'état AVANT les tests, pas après {#cypress.r6}

- **Règle :** placer la réinitialisation d'état dans `before`/`beforeEach`, pas dans `after`/`afterEach`.
- **Pourquoi :** « Clean up state before tests run. » Le code des hooks `after`/`afterEach` n'a **aucune garantie** de s'exécuter (ex. rafraîchissement en plein test, arrêt du runner) ; nettoyer en amont garantit un point de départ propre quoi qu'il arrive au run précédent.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** la remise à zéro (purge DB, reset fixtures) est en `before`/`beforeEach` ; `after`/`afterEach` ne portent pas de logique de nettoyage critique.
- ✅ **Bon :** `beforeEach(() => cy.task('db:reset'));`
- ❌ **Mauvais :** `afterEach(() => cy.task('db:reset'));` — sauté si le test interrompt le run.

### R7 — Ne tester que des sites qu'on contrôle {#cypress.r7}

- **Règle :** éviter de visiter ou de dépendre de serveurs tiers. Pour interagir avec une API externe, utiliser `cy.request()` (et mettre en cache si possible) plutôt que de piloter un site tiers.
- **Pourquoi :** « Only test websites that you control. Try to avoid visiting or requiring a 3rd party server. » Un service tiers est hors de ton contrôle (disponibilité, changements, captchas) → tests instables et lents.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** pas de `cy.visit('https://site-tiers...')` dans le flux de test ; les dépendances externes sont stubées (`cy.intercept`) ou appelées via `cy.request`.
- ✅ **Bon :** stubber l'API tierce avec `cy.intercept` et tester ta propre UI.
- ❌ **Mauvais :** `cy.visit('https://accounts.google.com')` pour tester un login OAuth de bout en bout.

### R8 — Aucun secret en dur dans les specs {#cypress.r8}

- **Règle :** ne pas coder en dur de secrets dans les fichiers de test. Les fournir via variables d'environnement / gestion de secrets CI, lus avec `Cypress.env(...)`. Réserver `Cypress.expose()` aux **valeurs de configuration publiques, non sensibles**.
- **Pourquoi :** un secret commité fuit dans l'historique du dépôt ; `Cypress.env` + secrets CI gardent les valeurs sensibles hors du code.
- **Niveau :** guardrail
- **Vérifié par :** manuel + grep CI / scan de secrets.
- **Check (review) :** aucun token/mot de passe/clé en clair dans `cypress/**` ; les valeurs sensibles viennent de `Cypress.env`.
- ✅ **Bon :** `cy.request('POST', '/login', { token: Cypress.env('API_TOKEN') });`
- ❌ **Mauvais :** `const token = 'sk_live_abc123';` dans une spec.

### R9 — Respecter l'arborescence et factoriser dans le support {#cypress.r9}

- **Règle :** garder la structure par défaut — specs sous `cypress/e2e`, données sous `cypress/fixtures` (lues via `cy.fixture()`), comportements réutilisables dans le fichier support (`cypress/support/e2e.{js,ts}`, `cypress/support/component.{js,ts}`). Définir les commandes partagées avec `Cypress.Commands.add(...)`.
- **Pourquoi :** le fichier support « runs before every single spec » : c'est l'endroit prévu pour les commandes custom et hooks globaux. Suivre l'arbo scaffoldée garde les specs découvrables et évite de réécrire la même mécanique dans chaque fichier.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** specs dans les dossiers attendus ; helpers répétés extraits en commandes (`Cypress.Commands.add`) ; données externalisées en fixtures.
- ✅ **Bon :** `Cypress.Commands.add('login', (u, p) => cy.request('POST', '/login', { u, p }));` dans le support.
- ❌ **Mauvais :** recopier le même bloc de login en clair dans dix specs.

### R10 — _(composant React)_ Monter via `cy.mount` enregistré au support {#cypress.r10}

- **Règle :** pour le component testing React, enregistrer la commande `mount` une fois dans `cypress/support/component`, puis monter avec `cy.mount(<Composant />)`. Passer les props directement en JSX.
- **Pourquoi :** `mount` vient de `cypress/react` ; l'enregistrer en commande custom (`Cypress.Commands.add('mount', mount)`) donne un `cy.mount` cohérent et chaînable dans toutes les specs composant.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** `cy.mount` est enregistré dans `support/component` ; les specs composant montent via `cy.mount`, pas par un import direct dispersé. _(s'applique au component testing React.)_
- ✅ **Bon :**
  ```ts
  // cypress/support/component.ts
  import { mount } from 'cypress/react';
  Cypress.Commands.add('mount', mount);
  // spec :
  cy.mount(<Stepper initial={100} />);
  cy.get('[data-cy=counter]').should('have.text', '100');
  ```
- ❌ **Mauvais :** importer `mount` à la main dans chaque spec sans commande partagée.

### R11 — _(composant)_ Vérifier les events avec un spy aliasé {#cypress.r11}

- **Règle :** pour tester les callbacks/events d'un composant, passer un `cy.spy().as('name')` en prop, déclencher l'interaction, puis asserter sur l'alias (`cy.get('@name').should('have.been.calledWith', ...)`).
- **Pourquoi :** l'alias rend le spy réutilisable et l'assertion attend que l'appel se produise (retry intégré) — plus robuste qu'une référence capturée.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** les handlers passés au composant sont des spies aliasés ; les assertions d'appel passent par `cy.get('@alias')`. _(s'applique au component testing.)_
- ✅ **Bon :**
  ```ts
  const onChange = cy.spy().as('onChangeSpy');
  cy.mount(<Stepper onChange={onChange} />);
  cy.get('[data-cy=increment]').click();
  cy.get('@onChangeSpy').should('have.been.calledWith', 1);
  ```
- ❌ **Mauvais :** garder une référence locale au spy et l'asserter de façon synchrone hors du flux de commandes.

### R12 — _(TS)_ tsconfig dédié et commandes custom typées {#cypress.r12}

- **Règle :** donner au dossier `cypress` un tsconfig avec `"types": ["cypress", "node"]`. Typer les commandes custom en augmentant `namespace Cypress { interface Chainable }` via `declare global` dans le fichier support (ajouter `export {}` si le fichier n'a aucun import).
- **Pourquoi :** `"types": ["cypress", "node"]` évite les conflits de types (ex. `@types/chai`, `@types/jquery`) en n'incluant que les définitions Cypress. L'augmentation de `Chainable` donne l'autocomplétion et le typage des commandes maison.
- **Niveau :** preference
- **Vérifié par :** tsc (le typage des commandes custom échoue si l'augmentation manque).
- **Check (review) :** un tsconfig Cypress restreint les `types` ; chaque commande custom a une signature déclarée dans `Cypress.Chainable`.
- ✅ **Bon :**
  ```ts
  declare global {
    namespace Cypress {
      interface Chainable {
        login(user: string, pass: string): Chainable<void>;
      }
    }
  }
  export {};
  ```
- ❌ **Mauvais :** utiliser `cy.login(...)` sans déclaration → `Property 'login' does not exist`.

## Anti-patterns

- Sélecteur CSS/structurel/textuel au lieu de `data-*` → #cypress.r1
- `const x = cy.get(...)` (affectation d'une commande) → #cypress.r2
- `cy.wait(<nombre>)` arbitraire → #cypress.r3
- Tests couplés / dépendants de l'ordre → #cypress.r4
- Login/seed via l'UI au lieu de `cy.request`/`cy.session` → #cypress.r5
- Nettoyage dans `after`/`afterEach` → #cypress.r6
- `cy.visit` d'un site tiers non contrôlé → #cypress.r7
- Secret en dur dans une spec → #cypress.r8
- Specs hors arbo / logique dupliquée non factorisée → #cypress.r9
- `mount` importé à la main dans chaque spec composant → #cypress.r10
- Event de composant vérifié sans spy aliasé → #cypress.r11
- Commande custom non typée dans `Chainable` → #cypress.r12

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Arborescence par défaut (scaffoldée par Cypress) :**

- specs E2E : `cypress/e2e` (`.js`, `.jsx`, `.ts`, `.tsx`, …) ;
- données statiques : `cypress/fixtures` (lues via `cy.fixture()`) ;
- support : `cypress/support/e2e.{js,ts}` (E2E) et `cypress/support/component.{js,ts}` (composant) — le fichier
  support s'exécute **avant chaque spec** ;
- artefacts : `cypress/downloads`, `cypress/screenshots`, `cypress/videos`.
  Spec pattern composant typique : `**/*.cy.{js,jsx,ts,tsx}`.

**Syntaxe Mocha (BDD) :** `describe()` / `context()` (identique à describe) / `it()` / `specify()` (identique à
it) ; hooks `before()`, `beforeEach()`, `afterEach()`, `after()`.

**Sélection robuste (rappel) :** préférer `[data-cy=...]` (ou `data-test`/`data-testid`) ; éviter `id`, `class`,
`tag` et le texte volatil. Un attribut dédié isole les tests des changements de CSS/JS.

**Component testing React :** `mount` est importé de `cypress/react`. Enregistrement standard :

```ts
// cypress/support/component.ts
import { mount } from 'cypress/react';
Cypress.Commands.add('mount', mount);
```

Signature : `mount(jsx, options?, rerenderKey?)`. `MountOptions` notables : `log` (booléen, `true` par défaut),
`strict` (rendu en React strict mode), `alias`. Le résultat (`MountReturn`) expose `component` et `rerender`.

**TypeScript :** tsconfig recommandé pour le dossier `cypress` :

```json
{
  "compilerOptions": {
    "target": "es6",
    "lib": ["es6", "dom"],
    "types": ["cypress", "node"]
  },
  "include": ["**/*.ts"]
}
```

Restreindre `types` à `["cypress", "node"]` évite les collisions avec `@types/chai` / `@types/jquery`. Pour typer
les commandes custom, augmenter `namespace Cypress { interface Chainable }` dans un fichier **module** (avec un
`import`/`export`, sinon ajouter `export {}`).

**Note `cy.wait` :** `cy.wait('@alias')` (attente d'une route interceptée) est légitime et déterministe ; seule
l'attente d'un **délai numérique** arbitraire est proscrite (#cypress.r3).

**Frontière avec `_strategy.md` :** ce fichier ne couvre que l'outil Cypress. Le choix de ce qu'on teste en E2E
plutôt qu'en unitaire/intégration, la pyramide des tests et le nommage générique relèvent de la stratégie
transverse — voir `rules/testing/_strategy.md`.

**Liens :** best practices → https://docs.cypress.io/app/core-concepts/best-practices ·
organisation → https://docs.cypress.io/app/core-concepts/writing-and-organizing-tests ·
component testing React (API) → https://docs.cypress.io/app/component-testing/react/api ·
exemples React → https://docs.cypress.io/app/component-testing/react/examples ·
TypeScript → https://docs.cypress.io/app/tooling/typescript-support
