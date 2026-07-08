---
id: typescript
title: TypeScript
discipline: typescript
kind: code
tech: []
layer: shared
phase: [implementation, review]
level:
  guardrail # défaut : correction du typage. Les recommandations de style/design
  # de signature sont marquées "preference".
status: active
version: 1.0
sources:
  - https://www.typescriptlang.org/tsconfig/ # famille strict
  - https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html # Do's and Don'ts
  - https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html # interface vs type
---

# TypeScript

> **Intention :** le compilateur travaille pour toi. On verrouille le vérificateur de types au maximum
> (`strict`), on n'éteint jamais le typage avec `any`, et on écrit des signatures que TypeScript résout
> de façon prévisible.
> **Applies to :** `**/*.ts`, `**/*.tsx`, `tsconfig*.json`.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Activer le mode `strict` {#typescript.r1}

- **Règle :** `tsconfig.json` déclare `compilerOptions.strict: true`. Ne jamais repasser à `false` un flag de la famille (`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`).
- **Pourquoi :** `strict` « enables a wide range of type checking behavior that results in stronger guarantees of program correctness » et équivaut à activer toute la _strict mode family_.
- **Vérifié par :** `tsc` (les violations de la famille cassent la compilation) ; présence de `strict: true` = revue de `tsconfig.json`.
- **Check (review) :** `tsconfig.json` a `strict: true` ; aucun flag de la famille forcé à `false`.
- ✅ **Bon :**
  ```jsonc
  // tsconfig.json
  { "compilerOptions": { "strict": true } }
  ```
- ❌ **Mauvais :**
  ```jsonc
  { "compilerOptions": { "strict": true, "strictNullChecks": false } } // famille affaiblie
  ```

### R2 — Aucun `any` implicite {#typescript.r2}

- **Règle :** annoter les paramètres et variables que TypeScript ne peut pas inférer ; ne pas laisser le compilateur retomber sur `any`.
- **Pourquoi :** sans annotation, « TypeScript will fall back to a type of `any` … This can cause some errors to be missed ».
- **Vérifié par :** `tsc` (`noImplicitAny`, activé par `strict`).
- **Check (review) :** couvert par `tsc` — pas de revue manuelle.
- ✅ **Bon :**
  ```ts
  function fn(s: string) {
    console.log(s.subtr(3));
  } // erreur tsc localisée
  ```
- ❌ **Mauvais :**
  ```ts
  function fn(s) {
    console.log(s.subtr(3));
  } // s: any implicite → erreur silencieuse
  ```

### R3 — Traiter `null` / `undefined` explicitement {#typescript.r3}

- **Règle :** sous `strictNullChecks`, `null` et `undefined` ont leur propre type ; garder/affiner une valeur potentiellement nulle avant de l'utiliser.
- **Pourquoi :** « When `strictNullChecks` is `false`, `null` and `undefined` are effectively ignored … This can lead to unexpected errors at runtime. »
- **Vérifié par :** `tsc` (`strictNullChecks`, activé par `strict`).
- **Check (review) :** couvert par `tsc` — pas de revue manuelle.

### R4 — `unknown`, jamais `any` {#typescript.r4}

- **Règle :** ne pas utiliser `any` comme type (sauf migration d'un projet JS vers TS en cours). Quand le type est inconnu ou seulement transité, utiliser `unknown`.
- **Pourquoi :** « The compiler _effectively_ treats `any` as "please turn off type checking for this thing". It is similar to putting an `@ts-ignore` comment around every usage. » `unknown` force l'appelant à déclarer le type avant usage.
- **Vérifié par :** manuel.
- **Check (review) :** aucune annotation `: any` ni retour `any` introduit dans le diff hors contexte de migration explicite.
- ✅ **Bon :** `function parse(input: unknown) { … }`
- ❌ **Mauvais :** `function parse(input: any) { … }` — typage désactivé silencieusement.

### R5 — Primitifs en minuscules, jamais les types boxés {#typescript.r5}

- **Règle :** utiliser `number`, `string`, `boolean`, `symbol`. Ne **jamais** utiliser `Number`, `String`, `Boolean`, `Symbol` ni `Object` comme types. Au lieu de `Object`, utiliser le type non-primitif `object`.
- **Pourquoi :** « These types refer to non-primitive boxed objects that are almost never used appropriately in JavaScript code. »
- **Vérifié par :** manuel.
- **Check (review) :** aucune occurrence de `Number`/`String`/`Boolean`/`Symbol`/`Object` en position de type.
- ✅ **Bon :**
  ```ts
  function reverse(s: string): string;
  ```
- ❌ **Mauvais :**
  ```ts
  function reverse(s: String): String; // type boxé
  ```

### R6 — Préférer `interface` à `type` {#typescript.r6}

- **Règle :** décrire une forme d'objet avec `interface`. N'utiliser `type` que lorsqu'on a besoin de fonctionnalités spécifiques (unions, tuples, types mappés/conditionnels…).
- **Pourquoi :** recommandation officielle — « You should prefer `interface`. Use `type` when you need specific features. »
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** une forme d'objet exprimable en `interface` n'est pas déclarée en `type` sans raison de fonctionnalité.
- ✅ **Bon :**
  ```ts
  interface User {
    name: string;
    id: number;
  }
  ```
- ❌ **Mauvais :**
  ```ts
  type User = { name: string; id: number }; // aucune fonctionnalité spécifique requise
  ```

### R7 — Un type générique utilise son paramètre {#typescript.r7}

- **Règle :** ne jamais déclarer un type générique qui n'utilise pas son paramètre de type.
- **Pourquoi :** « Don't ever have a generic type which doesn't use its type parameter. » — un paramètre inutilisé n'apporte rien et masque souvent une signature erronée.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** chaque paramètre de type déclaré apparaît dans le corps du type/de la signature.

### R8 — Callback à valeur ignorée : retour `void`, pas `any` {#typescript.r8}

- **Règle :** typer en `void` le retour d'un callback dont la valeur sera ignorée. Ne pas le typer `any`.
- **Pourquoi :** « Using `void` is safer because it prevents you from accidentally using the return value … in an unchecked way. »
- **Niveau :** preference
- **Vérifié par :** manuel.
- ✅ **Bon :**
  ```ts
  function fn(x: () => void) {
    x();
  }
  ```
- ❌ **Mauvais :**
  ```ts
  function fn(x: () => any) {
    x();
  } // permet d'utiliser à tort la valeur de retour
  ```

### R9 — Paramètres de callback non-optionnels {#typescript.r9}

- **Règle :** écrire les paramètres d'un callback comme **non-optionnels**, sauf intention réelle de varier l'arité.
- **Pourquoi :** « it's always legal to provide a callback that accepts fewer arguments ». Un paramètre optionnel a un sens précis (le callback peut être appelé avec 1 ou 2 arguments) qui est rarement celui voulu.
- **Niveau :** preference
- **Vérifié par :** manuel.
- ✅ **Bon :**
  ```ts
  interface Fetcher {
    getObject(done: (data: unknown, elapsedTime: number) => void): void;
  }
  ```
- ❌ **Mauvais :**
  ```ts
  interface Fetcher {
    getObject(done: (data: unknown, elapsedTime?: number) => void): void;
  }
  ```

### R10 — Surcharges : du spécifique au général {#typescript.r10}

- **Règle :** trier les surcharges en plaçant les signatures plus générales **après** les plus spécifiques.
- **Pourquoi :** « TypeScript chooses the _first matching overload_ … When an earlier overload is "more general" than a later one, the later one is effectively hidden and cannot be called. »
- **Niveau :** preference
- **Vérifié par :** manuel.
- ✅ **Bon :**
  ```ts
  declare function fn(x: HTMLDivElement): string;
  declare function fn(x: HTMLElement): number;
  declare function fn(x: unknown): unknown;
  ```
- ❌ **Mauvais :**
  ```ts
  declare function fn(x: unknown): unknown; // capte tout en premier
  declare function fn(x: HTMLDivElement): string; // jamais atteint
  ```

### R11 — Params optionnels / unions plutôt que surcharges redondantes {#typescript.r11}

- **Règle :** ne pas multiplier des surcharges qui ne diffèrent que par des paramètres en fin de liste (→ paramètres optionnels) ou par le type d'un **seul** argument (→ type union). Conditions : même type de retour pour collapser en optionnels.
- **Pourquoi :** « Do use optional parameters whenever possible » / « Do use union types whenever possible » — évite les faux positifs de compatibilité de signature et facilite le _passthrough_ d'une valeur.
- **Niveau :** preference
- **Vérifié par :** manuel.
- ✅ **Bon :**
  ```ts
  interface Example {
    diff(one: string, two?: string, three?: boolean): number;
  }
  interface Moment {
    utcOffset(b: number | string): Moment;
  }
  ```
- ❌ **Mauvais :**
  ```ts
  interface Example {
    diff(one: string): number;
    diff(one: string, two: string): number; // trailing params seulement
    diff(one: string, two: string, three: boolean): number;
  }
  ```

## Anti-patterns

- `any` introduit hors migration → #typescript.r4
- `Number`/`String`/`Boolean`/`Object` en position de type → #typescript.r5
- forme d'objet en `type` sans fonctionnalité spécifique → #typescript.r6
- générique dont le paramètre n'est jamais utilisé → #typescript.r7
- callback à retour `any` → #typescript.r8
- paramètre de callback optionnel sans raison → #typescript.r9
- surcharge générale placée avant une plus spécifique → #typescript.r10
- surcharges ne variant que par un argument ou des params en fin de liste → #typescript.r11

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Famille `strict`** (toutes à `true` quand `strict: true`, `false` sinon) d'après la doc tsconfig :
`noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`,
`strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`.
Note officielle : « Future versions of TypeScript may introduce additional stricter checking under this
flag, so upgrades of TypeScript might result in new type errors in your program. »

**Payload du kit :** `tooling/tsconfig.base.json` pose déjà `strict: true` (R1). Il ajoute aussi
`noUncheckedIndexedAccess` et `noImplicitOverride`, qui ne font **pas** partie de la famille `strict`
et ne sont pas couverts par une règle ici.

**`useUnknownInCatchVariables` :** depuis TS 4.0, la variable d'une clause `catch` peut passer de `any` à
`unknown` ; activé par `strict`. Cohérent avec R4 (vérifier le type avant d'utiliser une erreur capturée).

**Portée des règles R8–R11 :** elles proviennent du guide officiel _Do's and Don'ts_, rédigé dans le
contexte de l'écriture de fichiers de déclaration / d'APIs, mais s'appliquent à toute signature de
fonction ou surcharge en TypeScript.

**Pourquoi R11 (détail sourcé) :** TypeScript résout la compatibilité de signature en regardant si une
signature de la cible peut être invoquée avec les arguments de la source, _et les arguments superflus
sont autorisés_ ; avec `strictNullChecks`, passer explicitement `undefined` à un paramètre optionnel est
généralement accepté, là où une surcharge l'aurait rejeté.

**`unknown` vs `never` vs `void`** (page d'introduction) : `unknown` = « ensure someone using this type
declares what the type is » ; `never` = « it's not possible that this type could happen » ; `void` = une
fonction qui ne retourne rien.

**Liens :** famille strict → https://www.typescriptlang.org/tsconfig/ ·
Do's and Don'ts → https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html ·
interface vs type → https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html
