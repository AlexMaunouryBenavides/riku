---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: react
title: React — socle d'architecture (Rules of React + conventions)
discipline: architecture
kind: code
tech: [react]
layer: frontend
phase: [design, implementation, review]
level:
  guardrail # défaut : les « Rules of React » sont des règles, pas des conseils
  # (« if they are broken, your app likely has bugs »). Les conventions de
  # conception (plus souples) sont marquées preference.
status: active
version: 1.0
sources:
  - https://react.dev/reference/rules
  - https://react.dev/reference/rules/components-and-hooks-must-be-pure
  - https://react.dev/reference/rules/react-calls-components-and-hooks
  - https://react.dev/reference/rules/rules-of-hooks
  - https://react.dev/learn/you-might-not-need-an-effect
  - https://react.dev/learn/choosing-the-state-structure
  - https://react.dev/learn/sharing-state-between-components
---

# React — socle d'architecture (Rules of React + conventions)

> **Intention :** poser les **Rules of React** — pureté des composants/hooks, immutabilité, Rules of Hooks —
> que l'on **ne contourne pas** (« they are rules – and not just guidelines… if they are broken, your app
> likely has bugs »), puis les conventions de conception (state, effets) plus souples. La Clean Architecture
> côté front se réconcilie par-dessus dans `clean-archi-front.md`.
> **Applies to :** `**/*.tsx`, `**/*.jsx` (composants et hooks `use*`).

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Composants et hooks idempotents {#react.r1}

- **Règle :** un composant renvoie **toujours la même sortie pour les mêmes entrées** (props, state, context ; arguments pour un hook). Ne pas appeler de code non-idempotent **pendant le render** (`new Date()`, `Math.random()`…).
- **Pourquoi :** « React components are assumed to always return the same output with respect to their inputs » ; React peut rendre un composant plusieurs fois — un appel non-idempotent en render produit des bugs.
- **Vérifié par :** manuel (+ Strict Mode rejoue le render en dev pour révéler l'impureté, cf. R9).
- **Check (review) :** aucune valeur dépendant de l'heure/aléa/compteur global calculée en render ; ce calcul vit dans un Effect ou un event handler.
- ✅ **Bon :** `const [time, setTime] = useState(() => new Date())` + maj dans un Effect.
- ❌ **Mauvais :** `const time = new Date()` dans le corps du composant.

### R2 — Aucun effet de bord pendant le render {#react.r2}

- **Règle :** les effets de bord s'exécutent **hors du render** — dans un **event handler** (cas courant) ou, en dernier recours, dans un **Effect** (`useEffect`). Jamais pendant le render (y compris muter le DOM, ex. `document.title`).
- **Pourquoi :** « Side effects should not run in render, as React can render components multiple times. » Un effet en render se déclenche de façon imprévisible à chaque re-render.
- **Vérifié par :** manuel (+ Strict Mode).
- **Check (review) :** le corps du composant ne fait que calculer le JSX ; les effets sont dans des handlers/Effects.
- ✅ **Bon :** muter `document.title` via `useEffect` (synchronisation).
- ❌ **Mauvais :** `document.title = product.title` dans le corps du composant.

### R3 — Ne pas muter de valeur non-locale en render (mutation locale OK) {#react.r3}

- **Règle :** ne jamais modifier en render une valeur **créée hors du render**. La mutation **locale** (valeur créée pendant ce render) est parfaitement acceptable.
- **Pourquoi :** « Components and Hooks should never modify values that aren't created locally in render. » Une valeur externe mutée « remembers changes » → résultats dupliqués/incohérents.
- **Vérifié par :** manuel.
- **Check (review) :** les tableaux/objets mutés en render sont créés dans le même render.
- ✅ **Bon :** `const items = []` puis `items.push(...)` dans le composant.
- ❌ **Mauvais :** un `const items = []` déclaré **au-dessus** du composant, muté en render.

### R4 — Props et state immuables {#react.r4}

- **Règle :** ne **jamais** muter props ni state directement. Passer de **nouvelles props**, et mettre à jour le state via le **setter** de `useState` (copier plutôt que muter).
- **Pourquoi :** « A component's props and state are immutable snapshots… Never mutate them directly. » Muter le state en place ne déclenche pas de re-render → UI obsolète.
- **Vérifié par :** manuel.
- **Check (review) :** pas d'affectation directe sur une prop ou une variable de state ; `setX(...)` utilisé ; copies (`{...obj}`, `[...arr]`) pour les mises à jour.
- ✅ **Bon :** `setCount(count + 1)` ; `const url = new Url(item.url, base)`.
- ❌ **Mauvais :** `count = count + 1` ; `item.url = ...` sur une prop.

### R5 — Hooks & JSX : valeurs immuables après passage {#react.r5}

- **Règle :** ne pas modifier les **arguments** ni les **valeurs de retour** d'un hook une fois passés ; ne pas muter une valeur **après** l'avoir utilisée dans du JSX (déplacer la mutation **avant** la création du JSX).
- **Pourquoi :** « values become immutable when passed to a Hook » (sinon la mémoïsation devient incorrecte) ; « React may eagerly evaluate the JSX » → muter après coup donne une UI obsolète.
- **Vérifié par :** manuel.
- **Check (review) :** copie (`{...icon}`) avant modification d'un argument de hook ; pas de mutation d'un objet déjà passé à un composant en JSX.
- ✅ **Bon :** deux objets `headerStyles`/`footerStyles` distincts.
- ❌ **Mauvais :** réutiliser et muter `styles` entre deux `<X styles={styles} />`.

### R6 — Ne jamais appeler un composant comme une fonction {#react.r6}

- **Règle :** un composant ne s'utilise **qu'en JSX** (`<Article />`). Ne pas l'appeler directement (`Article()`) — c'est React qui l'appelle.
- **Pourquoi :** « Components should only be used in JSX… React should call it. » L'appel direct casse facilement les Rules of Hooks et prive React de la réconciliation/optimisation.
- **Vérifié par :** manuel.
- **Check (review) :** aucun appel `Composant()` dans le code ; uniquement `<Composant />`.
- ✅ **Bon :** `return <Layout><Article /></Layout>`
- ❌ **Mauvais :** `return <Layout>{Article()}</Layout>`

### R7 — Ne pas faire circuler les hooks comme des valeurs {#react.r7}

- **Règle :** un hook ne se passe pas comme une valeur : pas de hook d'ordre supérieur (`withLogging(useData)`), pas de hook passé en prop. Les rendre aussi **statiques** que possible et les **inliner**.
- **Pourquoi :** « Hooks should only be called inside of components or Hooks. Never pass it around as a regular value. » Cela préserve le _local reasoning_ et l'optimisation automatique.
- **Vérifié par :** manuel.
- **Check (review) :** pas de hook stocké/transmis comme valeur ; chaque hook est appelé directement dans un composant/hook.
- ✅ **Bon :** appeler `useDataWithLogging()` directement dans le composant.
- ❌ **Mauvais :** `<Button useData={useDataWithLogging} />`.

### R8 — Rules of Hooks : top-level, depuis des fonctions React uniquement {#react.r8}

- **Règle :** appeler les Hooks **au top-level** du composant/hook — jamais dans une boucle, condition, fonction imbriquée, `try/catch/finally`, ni après un `return` conditionnel — et **uniquement** depuis un composant React ou un custom hook.
- **Pourquoi :** « always use Hooks at the top level… before any early returns » ; les appeler ailleurs casse l'ordre des hooks. Appelés seulement depuis des fonctions React, « all stateful logic… is clearly visible from its source code ».
- **Vérifié par :** `eslint` (`eslint-plugin-react-hooks` — recommandé par la doc).
- **Check (review) :** couvert par ESLint — pas de revue manuelle.
- ✅ **Bon :** `const [n, setN] = useState(0)` en première ligne du composant.
- ❌ **Mauvais :** `if (cond) { useContext(...) }` ou un hook dans un handler.

### R9 — Activer Strict Mode et l'ESLint plugin {#react.r9}

- **Règle :** activer `<StrictMode>` et `eslint-plugin-react-hooks` pour faire respecter les Rules of React.
- **Pourquoi :** « We strongly recommend using Strict Mode alongside React's ESLint plugin to help your codebase follow the Rules of React. » Strict Mode rejoue render/effets en dev pour révéler les impuretés ; le plugin attrape les violations des Rules of Hooks.
- **Vérifié par :** `eslint` + configuration (présence du plugin et de `StrictMode`).
- **Check (review) :** `StrictMode` enveloppe l'app ; `eslint-plugin-react-hooks` est configuré.
- ✅ **Bon :** `root.render(<StrictMode><App /></StrictMode>)` + plugin activé.
- ❌ **Mauvais :** ni Strict Mode ni plugin → les Rules of React ne sont pas outillées.

### R10 — Pas d'Effect pour transformer des données ou gérer un événement {#react.r10}

- **Règle :** ne pas utiliser `useEffect` pour **dériver des données** (calculer au **top-level** du render) ni pour **réagir à un événement utilisateur** (le faire dans l'**event handler**). Réserver les Effects à la **synchronisation avec un système externe**.
- **Pourquoi :** « You don't need Effects to transform data for rendering » (un Effect qui re-set le state relance tout le cycle) ni « to handle user events ». « You _do_ need Effects to synchronize with external systems. »
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** les valeurs calculables depuis props/state le sont en render, pas stockées via un Effect ; les actions liées à un clic sont dans le handler.
- ✅ **Bon :** `const fullName = firstName + ' ' + lastName` (au render).
- ❌ **Mauvais :** un `useEffect` qui fait `setFullName(firstName + ' ' + lastName)`.

### R11 — Structurer le state proprement {#react.r11}

- **Règle :** suivre les principes de structuration : **grouper** le state lié, **éviter les contradictions**, **éviter le state redondant** (calculable depuis props/state → le calculer en render), **éviter la duplication**, **éviter l'imbrication profonde** (préférer du plat). Ne pas **mirroir les props dans le state**.
- **Pourquoi :** ces principes « make state easy to update without introducing mistakes » ; le state redondant/dupliqué se désynchronise.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** pas de variable de state dérivable d'une autre/des props ; pas de duplication ni d'imbrication inutile.
- ✅ **Bon :** dériver `fullName`/une liste filtrée en render plutôt qu'en state.
- ❌ **Mauvais :** un state `fullName` maintenu en parallèle de `firstName`/`lastName`.

### R12 — Source unique de vérité : remonter le state (lifting state up) {#react.r12}

- **Règle :** quand deux composants doivent changer ensemble, **retirer** le state de chacun, le **remonter** au plus proche **parent commun**, et le redescendre par props. Une donnée a une **source unique de vérité**.
- **Pourquoi :** « remove state from both of them, move it to their closest common parent… This is known as _lifting state up_ » — pour coordonner sans dupliquer.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** pas de state dupliqué entre composants frères qui doivent rester synchronisés ; le parent commun détient la vérité.
- ✅ **Bon :** un `activeIndex` dans le parent, passé aux panneaux enfants.
- ❌ **Mauvais :** deux flags « isShown » indépendants devant rester mutuellement exclusifs.

## Anti-patterns

- `new Date()`/`Math.random()` dans le corps du composant → #react.r1
- Effet de bord (ex. `document.title`) en render → #react.r2
- Mutation d'une valeur créée hors du render → #react.r3
- Mutation directe de props/state (`count = …`, `item.x = …`) → #react.r4
- Mutation d'un argument/retour de hook ou d'une valeur déjà en JSX → #react.r5
- Appel direct `Composant()` au lieu de `<Composant />` → #react.r6
- Hook d'ordre supérieur / hook passé en prop → #react.r7
- Hook dans une condition/boucle/handler ou hors fonction React → #react.r8
- Ni Strict Mode ni eslint-plugin-react-hooks → #react.r9
- Effect pour dériver des données ou gérer un clic → #react.r10
- State redondant/dupliqué ; props mirrorées dans le state → #react.r11
- State dupliqué entre frères au lieu d'être remonté → #react.r12

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Pourquoi la pureté (source) :** un composant/hook pur est _idempotent_, _sans effet de bord en render_, et
_ne mute pas de valeurs non-locales_. La pureté permet à React de « pause rendering… and only come back…
when it's needed » et d'optimiser automatiquement. Tout le code qui s'exécute **pendant le render** doit
être idempotent.

**Comment savoir si du code tourne « en render » (source) :** s'il est au top-level du corps du composant,
il tourne probablement en render ; le code dans un **event handler** ou un **Effect** ne tourne **pas** en
render. Exceptions tolérées à la pureté stricte : **mutation locale** (valeur créée dans ce render) et
**initialisation paresseuse** (`initializeIfNotReady()`) tant qu'elle n'affecte pas d'autres composants.

**Les 5 principes de structuration du state (source `choosing-the-state-structure`) :** 1) grouper le state
lié ; 2) éviter les contradictions ; 3) éviter le state redondant ; 4) éviter la duplication ; 5) éviter
l'imbrication profonde. Objectif : « Make your state as simple as it can be — but no simpler. »

**Quand un Effect est légitime (source `you-might-not-need-an-effect`) :** uniquement pour **synchroniser
avec un système externe** (widget non-React, DOM navigateur, abonnement…). Pour le data fetching, les
frameworks modernes offrent des mécanismes intégrés plus efficaces que `useEffect`.

**Frontière avec `clean-archi-front.md` :** ce fichier = socle **imposé/idiomatique React** (Rules of React
en `guardrail`, conventions de state en `preference`). Le découpage en couches côté front (séparer la
logique métier/applicative des composants de présentation, ports vers l'extérieur) relèvera de
`clean-archi-front.md` (`preference`), adapté à la permissivité de React — et cédant devant ce socle ou une
convention du projet en cas de conflit.

**Liens :** Rules of React → https://react.dev/reference/rules · pureté →
/reference/rules/components-and-hooks-must-be-pure · React calls components/hooks →
/reference/rules/react-calls-components-and-hooks · Rules of Hooks → /reference/rules/rules-of-hooks ·
You Might Not Need an Effect → /learn/you-might-not-need-an-effect · structuration du state →
/learn/choosing-the-state-structure · lifting state up → /learn/sharing-state-between-components
