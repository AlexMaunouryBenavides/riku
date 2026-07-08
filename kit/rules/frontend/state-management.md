---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: state-management
title: State Management
discipline: state-management
kind: code
tech: [react]
layer: frontend
phase: [design, implementation, review]
level: preference
status: active
version: 1.0
sources:
  - https://react.dev/learn/choosing-the-state-structure
  - https://react.dev/learn/passing-data-deeply-with-context
  - https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state
---

# State Management

> **Intention :** garder l'état **minimal** et **au bon endroit**. On sépare nettement l'**état serveur**
> (asynchrone, géré par TanStack Query) de l'**état client** (UI), et on ne sort l'artillerie (Context, store)
> que lorsque c'est réellement nécessaire.
> **Applies to :** `apps/web/**/*.{ts,tsx}`.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Séparer état serveur et état client {#state-management.r1}

- **Règle :** les données venant du serveur (asynchrones) vivent dans **TanStack Query** (cf. `data-fetching.md` / `react-query.md`), **jamais** recopiées dans un `useState` ou un store client. Le store client ne gère que l'état d'UI (ouvert/fermé, sélection, brouillon…).
- **Pourquoi :** doc TanStack — c'est « a **server-state** library », tandis que « Redux, MobX, Zustand, etc. are **client-state** libraries » ; « **TanStack Query is not a replacement for local/client state management** ». Après migration, « the truly **globally accessible client state** that is left over … is usually very tiny ».
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- ✅ **Bon :** `const { data: themes } = useQuery(...)` — la liste vient du cache serveur.
- ❌ **Mauvais :** `useEffect(() => fetch(...).then(setThemes))` + `useState`, ou stocker `themes` dans Zustand.

### R2 — Ne pas stocker ce qui est dérivable {#state-management.r2}

- **Règle :** si une valeur se calcule à partir des props ou d'un autre état **pendant le rendu**, la calculer — ne pas la mettre dans le state. Ne jamais **recopier une prop dans le state** (« mirroring »).
- **Pourquoi :** react.dev — « Avoid redundant state. If you can calculate some information from the component's props or its existing state variables during rendering, you should not put that information into that component's state. » et « Mirroring some prop in a state variable can lead to confusion » (le state n'est initialisé qu'au 1ᵉʳ rendu).
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- ✅ **Bon :** `const fullName = firstName + ' ' + lastName;`
- ❌ **Mauvais :** `const [fullName, setFullName] = useState(...)` synchronisé à la main ; `useState(props.color)`.

### R3 — Structurer l'état sainement {#state-management.r3}

- **Règle :** **grouper** l'état qui change toujours ensemble ; **éviter les contradictions** (états qui peuvent se « disputer ») ; **éviter la duplication** ; préférer une structure **plate** (pas d'imbrication profonde).
- **Pourquoi :** react.dev, principes de structuration : « Group related state », « Avoid contradictions in state », « Avoid duplication in state », « Avoid deeply nested state ». Objectif : « make state easy to update without introducing mistakes ».
- **Niveau :** preference
- **Vérifié par :** manuel.
- ❌ **Mauvais :** `isLoading` + `isError` + `isSuccess` en 3 booléens (contradictoires) → préférer un seul `status`.

### R4 — Avant Context : props, puis composition {#state-management.r4}

- **Règle :** contre le prop-drilling, essayer **d'abord** de passer des props, **puis** d'extraire des composants et de passer du JSX en `children`. Ne passer au Context **que si** ces deux approches échouent.
- **Pourquoi :** react.dev — « Start by passing props » (« makes it very clear which components use which data ») ; sinon « pass JSX as children » ; « Only after these fail … consider context. »
- **Niveau :** preference
- **Vérifié par :** manuel.
- ✅ **Bon :** `<Layout><Posts posts={posts} /></Layout>` (composition) plutôt que faire descendre `posts` via `Layout`.

### R5 — Context / store client : cas globaux uniquement {#state-management.r5}

- **Règle :** réserver le **Context** aux données vraiment **globales et peu changeantes** — thème, utilisateur/auth, i18n, routing (state complexe = `useReducer` + Context). Pour le **peu** d'état client global mutant qui reste, le projet utilise un store dédié **Zustand** (choix projet — cf. `CLAUDE.md`) plutôt qu'un méga-Context qui re-rend tout l'arbre.
- **Pourquoi :** react.dev liste ces cas de Context (« Theming », « Current account », « Routing », « Managing state » via reducer+context) ; et la doc TanStack rappelle que l'état client **global** restant est « usually very tiny » — donc un petit store suffit, inutile de tout globaliser.
- **Niveau :** preference
- **Vérifié par :** manuel.
- ❌ **Mauvais :** mettre l'état d'un formulaire ou une sélection locale dans un Context/store global.

## Anti-patterns

- Données serveur recopiées en `useState`/store (au lieu de TanStack Query) → #state-management.r1
- État dérivable stocké, ou prop recopiée dans le state → #state-management.r2
- Booléens d'état contradictoires, duplication, imbrication profonde → #state-management.r3
- Context dégainé alors que props/composition suffisaient → #state-management.r4
- État local (formulaire, ouverture d'un menu) mis dans un store/Context global → #state-management.r5

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Arbre de décision (résumé) :**

```
La donnée vient du serveur (async) ?          → TanStack Query   (data-fetching.md / react-query.md)
Sinon, utilisée par un seul composant ?        → useState local
Sinon, partagée par quelques composants ?      → lever l'état / passer des props / composition (children)
Sinon, vraiment globale & peu changeante ?     → Context (thème, auth, i18n, routing)
Sinon, état client global mutant résiduel ?    → Zustand (petit store — choix projet)
```

**État complexe local :** préférer `useReducer` quand plusieurs sous-valeurs évoluent ensemble selon des
actions (react.dev, « reducer together with context » pour le cas global).

**Rappel :** l'essentiel de l'état d'une SPA « data-driven » comme QuizDev est **de l'état serveur** (thèmes,
questions, progression) → il est géré par TanStack Query. L'état client se limite à l'UI (question courante
d'une session côté écran, ouverture d'une modale, etc.).

**Liens (sources vérifiées) :**
structurer l'état → https://react.dev/learn/choosing-the-state-structure ·
Context → https://react.dev/learn/passing-data-deeply-with-context ·
serveur vs client → https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state
