---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: react-query
title: React Query (TanStack Query)
discipline: data-fetching
kind: code
tech: [react, react-query]    # ne s'active que sur un projet React + TanStack Query.
layer: frontend
phase: [implementation, review]
level: preference             # défaut du fichier ; clé de cache (r2) et erreurs (r3) sont des garde-fous.
status: active
version: 1.0
sources:
  - https://tanstack.com/query/latest/docs/framework/react/overview
  - https://tanstack.com/query/latest/docs/framework/react/guides/queries
  - https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
  - https://tanstack.com/query/latest/docs/framework/react/guides/query-functions
  - https://tanstack.com/query/latest/docs/framework/react/guides/mutations
  - https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
  - https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
  - https://tanstack.com/query/latest/docs/reference/QueryClient
---

# React Query (TanStack Query)

> **Intention :** React Query est la source de vérité de l'**état serveur**. Chaque query a une clé qui
> décrit exactement sa donnée, une `queryFn` qui échoue franchement, et les écritures passent par des
> mutations qui resynchronisent le cache. On s'appuie sur les défauts de la lib au lieu de les réécrire.
> **Applies to :** `**/*.{ts,tsx}` utilisant `useQuery`, `useMutation`, `QueryClient` (hooks et services de data).

<!-- Ce fichier INSTANCIE `data-fetching.md` (neutre) pour React Query et ajoute les specifics de l'outil.
     Voir la frontière en ## Reference : les 3 états / race conditions / dédup neutres se réalisent ici via
     les status flags, le `signal`, et le cache. -->

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — React Query pour l'état serveur, pas l'état UI                 {#react-query.r1}
- **Règle :** gérer avec React Query **uniquement** l'état serveur (données distantes, asynchrones). L'état purement local/UI (ouverture d'une modale, champ de formulaire non soumis, onglet actif) reste dans `useState`/un store client.
- **Pourquoi :** « While most traditional state management libraries are great for working with client state, they are not so great at working with async or server state. » Mélanger les deux fait perdre le cache, la dédup et le rafraîchissement automatiques.
- **Vérifié par :** manuel.
- **Check (review) :** pas de donnée serveur recopiée dans un store client ; pas d'état UI éphémère stocké en query.
- ✅ **Bon :** `useQuery({ queryKey: ['todos'], queryFn })` pour les todos ; `useState(false)` pour « la modale est ouverte ».
- ❌ **Mauvais :** copier le résultat d'une query dans un `useState`/Redux puis le maintenir à la main.

### R2 — queryKey en Array, incluant toutes les dépendances            {#react-query.r2}
- **Règle :** déclarer chaque `queryKey` comme un **Array** qui inclut **toute** variable utilisée par la `queryFn` (id, filtres, pagination, locale…).
- **Pourquoi :** « Query keys have to be an Array at the top level » et « Adding dependent variables to your query key will ensure that queries are cached independently, and that any time a variable changes, queries will be refetched automatically. » Une variable manquante = cache partagé à tort et donnée périmée affichée.
- **Niveau :** guardrail
- **Vérifié par :** `eslint: @tanstack/query/exhaustive-deps` (plugin `@tanstack/eslint-plugin-query`).
- **Check (review) :** toute variable lue dans la `queryFn` figure dans la `queryKey`.
- ✅ **Bon :**
  ```ts
  useQuery({ queryKey: ['todo', todoId], queryFn: () => fetchTodoById(todoId) });
  ```
- ❌ **Mauvais :**
  ```ts
  useQuery({ queryKey: ['todo'], queryFn: () => fetchTodoById(todoId) }); // todoId absent → mauvais cache
  ```

### R3 — La queryFn échoue franchement (throw / reject)                 {#react-query.r3}
- **Règle :** la `queryFn` doit **throw** (ou retourner une promesse **rejetée**) en cas d'erreur. Avec `fetch`, vérifier explicitement `res.ok` et lever une erreur sinon — `fetch` ne rejette pas sur un statut HTTP d'erreur.
- **Pourquoi :** « For TanStack Query to determine a query has errored, the query function must throw or return a rejected Promise. » Et « the native `fetch` API doesn't automatically throw on HTTP errors. » Sans throw, un `4xx`/`5xx` est traité comme un succès.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** chaque `queryFn`/`mutationFn` basée sur `fetch` teste `res.ok` et throw ; aucune erreur n'est silencieusement renvoyée comme donnée.
- ✅ **Bon :**
  ```ts
  const res = await fetch(`/todos/${id}`, { signal });
  if (!res.ok) throw new Error('Network response was not ok');
  return res.json();
  ```
- ❌ **Mauvais :**
  ```ts
  const res = await fetch(`/todos/${id}`);
  return res.json(); // un 500 passe pour un succès, isError ne sera jamais vrai
  ```

### R4 — Brancher le signal d'annulation                               {#react-query.r4}
- **Règle :** récupérer le `signal` (`AbortSignal`) du `QueryFunctionContext` et le passer à la requête, pour que React Query **annule** automatiquement les requêtes obsolètes.
- **Pourquoi :** « signal?: AbortSignal — AbortSignal instance provided by TanStack Query… pass it directly to fetch for built-in cancellation support. » C'est la réalisation React Query des règles neutres « race conditions » (`#data-fetching.r2`) et « cleanup au démontage » (`#data-fetching.r3`).
- **Vérifié par :** manuel.
- **Check (review) :** les `queryFn` propagent `signal` à `fetch`/au client HTTP.
- ✅ **Bon :**
  ```ts
  useQuery({ queryKey: ['search', q], queryFn: ({ signal }) => fetch(`/search?q=${q}`, { signal }) });
  ```
- ❌ **Mauvais :** ignorer `signal` → les requêtes obsolètes ne sont pas annulées.

### R5 — Les écritures passent par useMutation                         {#react-query.r5}
- **Règle :** utiliser **`useMutation`** pour toute écriture (create/update/delete) ou effet de bord serveur, pas `useQuery`.
- **Pourquoi :** « `useMutation`… is typically used to create/update/delete data or perform server side-effects. » `useQuery` est pensé pour de la lecture cacheable, déclenchée automatiquement ; une écriture doit être impérative et déclenchée explicitement.
- **Vérifié par :** manuel.
- **Check (review) :** aucune écriture déguisée en query ; les actions sont des mutations appelées via `mutate`/`mutateAsync`.
- ✅ **Bon :**
  ```ts
  const m = useMutation({ mutationFn: (todo) => axios.post('/todos', todo) });
  m.mutate({ title: 'Do laundry' });
  ```
- ❌ **Mauvais :** déclencher un POST dans une `queryFn`.

### R6 — Invalider les queries après une mutation réussie              {#react-query.r6}
- **Règle :** après le succès d'une mutation, **invalider** les queries impactées via `queryClient.invalidateQueries` (matching par **préfixe de clé**), typiquement dans `onSuccess`.
- **Pourquoi :** « mutations become a very powerful tool [combined with] the Query Client's `invalidateQueries` method » ; une query invalidée « is marked as stale… [and] will also be refetched in the background. » Sans cela, l'UI affiche un état serveur périmé après l'écriture.
- **Vérifié par :** manuel.
- **Check (review) :** chaque mutation qui modifie une ressource lue ailleurs invalide (ou met à jour) la clé correspondante.
- ✅ **Bon :**
  ```ts
  useMutation({
    mutationFn: createTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }), // couvre ['todos', {page}] aussi
  });
  ```
- ❌ **Mauvais :** muter le serveur puis laisser la liste affichée telle quelle.

### R7 — S'appuyer sur les défauts, les régler par la config           {#react-query.r7}
- **Règle :** ne pas réimplémenter à la main ce que React Query fait déjà (dédup, refetch au mount/focus/reconnect, retry, structural sharing, GC). Ajuster ces comportements **via la configuration** (`staleTime`, `gcTime`, `retry`, `refetchOnWindowFocus`…) plutôt que par des contournements.
- **Pourquoi :** par défaut les données sont « consider[ed]… as stale » (refetch au mount/focus/reconnect), les échecs sont « silently retried 3 times, with exponential backoff », les queries inactives sont « garbage collected after 5 minutes », et les résultats sont « structurally shared ». Réécrire ces mécaniques crée des bugs et de la dette.
- **Vérifié par :** manuel.
- **Check (review) :** pas de cache/refetch/retry maison en doublon ; les écarts au défaut passent par les options (`staleTime` posé sciemment pour une donnée stable, etc.).
- ✅ **Bon :** `useQuery({ queryKey, queryFn, staleTime: 60_000 })` pour une donnée qui ne change pas chaque seconde.
- ❌ **Mauvais :** un `useEffect` + `setInterval` maison pour refetch, alors que `refetchInterval`/staleness le font déjà.

## Anti-patterns
- État UI local stocké en query, ou état serveur recopié dans un store client → #react-query.r1
- Variable de la `queryFn` absente de la `queryKey` → #react-query.r2
- `queryFn` qui ne teste pas `res.ok` (erreur HTTP vue comme succès) → #react-query.r3
- `signal` ignoré → pas d'annulation des requêtes obsolètes → #react-query.r4
- Écriture (POST/PUT/DELETE) lancée via `useQuery` → #react-query.r5
- Mutation sans invalidation → UI périmée après écriture → #react-query.r6
- Cache/refetch/retry réimplémentés à la main → #react-query.r7

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Ce que résout React Query (overview) :** « fetching, caching, synchronizing and updating server state ».
Il prend en charge « Caching », « Deduping multiple requests for the same data into a single request »,
« Updating 'out of date' data in the background » et « Knowing when data is 'out of date' » — d'où R7
(ne pas refaire ce travail soi-même).

**`status` vs `fetchStatus` (queries) :** « The `status` gives information about the `data`: Do we have any
or not? » (`pending` / `error` / `success`), tandis que « The `fetchStatus` gives information about the
`queryFn`: Is it running or not? » (`fetching` / `paused` / `idle`). Les **trois états neutres**
(`#data-fetching.r1`) se lisent ici sur `status` : `isPending` → loading, `isError`+`error` → erreur,
`isSuccess`+`data` → succès. Ne pas dériver ces états à la main.

**Défauts à connaître (important-defaults) :**
- `staleTime: 0` → données *stale* immédiatement ; refetch au montage d'une nouvelle instance, au focus de
  la fenêtre, à la reconnexion réseau ; `refetchInterval` pour un refetch périodique.
- `gcTime: 5 min` → les queries inactives sont supprimées du cache après 5 minutes.
- `retry: 3` avec *exponential backoff* sur échec.
- *structural sharing* : si la donnée n'a pas changé, la **référence** reste identique (stabilité pour
  `useMemo`/`useCallback`).

**Clés de cache (query-keys) :** les clés sont **hachées de façon déterministe** — l'ordre des champs dans
un objet n'importe pas, mais l'ordre des éléments d'un tableau, si. Une clé doit être sérialisable
(`JSON.stringify`) et **unique** à sa donnée. Convention utile : préfixe large → spécifique
(`['todos']`, `['todos', { page }]`, `['todo', id]`) pour invalider par préfixe (R6).

**Invalidation (query-invalidation + QueryClient) :** `invalidateQueries({ queryKey: ['todos'] })` marque
*stale* et refetch en arrière-plan **toutes** les queries dont la clé commence par `['todos']` — « match
multiple queries by their prefix, or get really specific and match an exact query ». Permet « targeted
invalidation, background-refetching and ultimately atomic updates » sans cache normalisé.

**Callbacks de mutation (mutations) :** `onMutate` (avant), `onSuccess` (succès), `onError` (échec),
`onSettled` (toujours). L'invalidation (R6) vit typiquement dans `onSuccess`/`onSettled`.

**Frontière avec les autres disciplines :** les principes neutres (3 états, race conditions, waterfalls,
secrets) sont dans `data-fetching.md` ; la séparation état serveur / état client renvoie à
`state-management.md` (R1) ; ce fichier ne porte que les specifics React Query.

**Liens :** overview → https://tanstack.com/query/latest/docs/framework/react/overview ·
queries → https://tanstack.com/query/latest/docs/framework/react/guides/queries ·
query keys → https://tanstack.com/query/latest/docs/framework/react/guides/query-keys ·
query functions → https://tanstack.com/query/latest/docs/framework/react/guides/query-functions ·
mutations → https://tanstack.com/query/latest/docs/framework/react/guides/mutations ·
query invalidation → https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation ·
important defaults → https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults ·
QueryClient → https://tanstack.com/query/latest/docs/reference/QueryClient
