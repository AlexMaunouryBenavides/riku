---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: data-fetching
title: Data Fetching
discipline: data-fetching
kind: code
tech: []                      # agnostique : principes valables quel que soit l'outil de fetch.
                              # Les specifics d'un outil (React Query : staleTime, queryKey…) vivent
                              # dans leur fichier dédié, pas ici.
layer: frontend
phase: [implementation, review]
level: preference             # défaut du fichier ; les 3 états (r1), les race conditions (r2) et la
                              # non-exposition des secrets (r6) sont des garde-fous.
status: active
version: 1.0
sources:
  - https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns
  - https://www.greatfrontend.com/react-interview-playbook/react-data-fetching
---

# Data Fetching

> **Intention :** une donnée distante a toujours trois états (chargement / erreur / succès), arrive sans
> condition de course, et son chargement ne bloque pas l'UI ni n'expose de secret. On évite les requêtes
> en cascade et les appels redondants.
> **Applies to :** `**/*.{ts,tsx,js,jsx}` qui déclenchent un appel réseau (hooks de fetch, loaders, services d'accès API côté client).

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Modéliser les trois états : chargement, erreur, succès        {#data-fetching.r1}
- **Règle :** toute donnée distante affiche un état de **chargement** pendant la requête, un état d'**erreur** si elle échoue, et l'état de **succès**. Aucun rendu qui suppose la donnée présente d'emblée, aucune erreur avalée silencieusement.
- **Pourquoi :** « Shows a loading message while the data is being fetched and error message if an error was encountered. These are all great for user experience. » Sans état d'erreur, un échec réseau donne un écran cassé ou figé.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** chaque appel a un rendu pour `loading` et pour `error`, pas seulement pour le cas nominal.
- ✅ **Bon :**
  ```tsx
  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner message={error.message} />;
  return <List items={data} />;
  ```
- ❌ **Mauvais :**
  ```tsx
  return <List items={data} />; // data peut être undefined au 1er rendu, l'erreur n'est jamais affichée
  ```

### R2 — Neutraliser les race conditions sur changement de paramètre   {#data-fetching.r2}
- **Règle :** quand les paramètres d'une requête changent (recherche, pagination, navigation), **annuler** la requête en vol (`AbortController`) ou **ignorer** la réponse périmée. Seule la réponse correspondant à la dernière requête doit mettre à jour l'UI.
- **Pourquoi :** « Race conditions can occur because when multiple requests are made, the server can return the results in any order. » Sans garde, une réponse lente d'une ancienne requête écrase la donnée fraîche.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** un effet qui refetch sur dépendance variable annule/ignore la requête précédente ; pas de `setState` inconditionnel sur une réponse potentiellement périmée.
- ✅ **Bon :**
  ```ts
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/search?q=${q}`, { signal: ctrl.signal })
      .then(r => r.json()).then(setResults)
      .catch(e => { if (e.name !== 'AbortError') setError(e); });
    return () => ctrl.abort(); // annule la requête précédente quand q change
  }, [q]);
  ```
- ❌ **Mauvais :** lancer un fetch par frappe sans annulation → la réponse de `"tom"` peut arriver après celle de `"tomato"`.

### R3 — Nettoyer/annuler au démontage                                 {#data-fetching.r3}
- **Règle :** annuler la requête et **ne pas écrire d'état après démontage** du composant. Fournir une fonction de nettoyage à l'effet de fetch.
- **Pourquoi :** « If the user navigates away from the page and the response is returned, the code will attempt to call `setData` even though the component is no longer in the DOM… Use cleanup functions… to prevent state updates after unmounting. » Évite fuites et avertissements.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** chaque effet de fetch retourne un cleanup (abort / flag d'ignore) ; pas de `set...` possible après unmount.
- ✅ **Bon :** `return () => ctrl.abort();` dans l'effet (cf. R2).
- ❌ **Mauvais :** un `fetch().then(setData)` sans cleanup dans un `useEffect`.

### R4 — Paralléliser ; le séquentiel seulement pour une vraie dépendance {#data-fetching.r4}
- **Règle :** lancer **en parallèle** les requêtes indépendantes (initier les promesses tôt, attendre ensemble). Ne chaîner (séquentiel) que lorsqu'une requête a réellement besoin du résultat de la précédente.
- **Pourquoi :** « parallel data fetching, requests… are eagerly initiated and will load data at the same time. This reduces client-server waterfalls. » À l'inverse, le séquentiel « create[s] waterfalls… [which] can also be unintentional and lead to longer loading times ».
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** des requêtes sans dépendance ne sont pas `await`-ées l'une après l'autre ; les indépendantes partent ensemble.
- ✅ **Bon :**
  ```ts
  const [artist, albums] = await Promise.all([getArtist(id), getAlbums(id)]); // en parallèle
  ```
- ❌ **Mauvais :**
  ```ts
  const artist = await getArtist(id);
  const albums = await getAlbums(id); // attend artist sans en dépendre → waterfall
  ```

### R5 — Dédupliquer et mettre en cache les mêmes données             {#data-fetching.r5}
- **Règle :** ne pas refetch les **mêmes données** depuis plusieurs composants ni à chaque interaction identique ; partager/mémoïser/mettre en cache la réponse.
- **Pourquoi :** on peut consommer une donnée « in the component that needs the data without worrying about… making multiple requests for the same data » car « fetch requests are automatically memoized » (Next.js) ; et « If a user types 'tomato', deletes it, and then types 'tomato' again, the API is queried twice despite already having the results… Implement caching to reuse existing data and avoid redundant requests » (GreatFrontend).
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** la même ressource n'est pas fetchée en double dans un même rendu ; les requêtes répétées identiques tapent un cache.
- ✅ **Bon :** une seule source mémoïsée de `currentUser` consommée par plusieurs composants.
- ❌ **Mauvais :** chaque composant refait `fetch('/me')` indépendamment.

### R6 — Récupérer au plus près de la source ; jamais de secret côté client {#data-fetching.r6}
- **Règle :** quand c'est possible, fetcher **côté serveur** (ou au plus près de la donnée). **Ne jamais** exposer au client des secrets (tokens d'accès, clés d'API) ni de données sensibles non destinées au navigateur.
- **Pourquoi :** fetcher côté serveur permet de « Keep your application more secure by preventing sensitive information, such as access tokens and API keys, from being exposed to the client » (Next.js). Une clé embarquée dans le bundle client est publique.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** aucune clé/token secret dans le code client ; les appels qui requièrent un secret passent par le serveur (BFF/route serveur), pas par le navigateur.
- ✅ **Bon :** le navigateur appelle une route serveur qui détient la clé et relaie l'appel tiers.
- ❌ **Mauvais :** `fetch('https://api.tiers.com', { headers: { Authorization: 'Bearer SECRET' } })` depuis le client.

### R7 — Refetch sur les bonnes dépendances, sans boucle infinie       {#data-fetching.r7}
- **Règle :** déclencher un (re)fetch **exactement** sur les entrées dont il dépend. Lister toutes les dépendances réelles, et stabiliser les références (fonctions/objets) pour ne pas relancer en boucle.
- **Pourquoi :** « Avoiding infinite loops due to missing dependencies requires properly specifying which variables should trigger re-fetches. » Une dépendance manquante fige la donnée ; une dépendance instable fait boucler.
- **Niveau :** preference
- **Vérifié par :** `eslint: react-hooks/exhaustive-deps` (avec les hooks React).
- **Check (review) :** le tableau de dépendances de l'effet de fetch est exhaustif et stable ; pas d'objet/fonction recréé à chaque rendu qui relance l'appel.
- ✅ **Bon :** `useEffect(() => { … }, [userId])` — refetch quand, et seulement quand, `userId` change.
- ❌ **Mauvais :** `useEffect(() => { fetchData(options); }, [options])` avec `options` recréé inline à chaque rendu → boucle.

## Anti-patterns
- Rendu qui suppose la donnée présente, sans état loading/error → #data-fetching.r1
- Fetch par frappe sans annulation → réponse périmée qui écrase la fraîche → #data-fetching.r2
- `fetch().then(setData)` sans cleanup au démontage → #data-fetching.r3
- `await` en série de requêtes indépendantes (waterfall) → #data-fetching.r4
- Même ressource fetchée en double dans plusieurs composants → #data-fetching.r5
- Token/clé d'API embarqué dans le code client → #data-fetching.r6
- Dépendances d'effet manquantes (donnée figée) ou instables (boucle) → #data-fetching.r7

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Pourquoi neutre :** ce fichier décrit les principes de récupération de données **indépendants de l'outil**,
pour ne pas entrer en conflit avec une lib précise. Les mécaniques d'un outil donné (clé de cache,
`staleTime`, invalidation, refetch en arrière-plan…) sont déléguées à son fichier dédié.

**Waterfall vs parallèle (Next.js) :** un *waterfall* = des requêtes qui s'attendent sans dépendance
réelle. Le séquentiel est légitime « because one fetch depends on the result of the other, or you want a
condition to be satisfied before the next fetch to save resources » ; il devient un défaut quand il est
involontaire. Pour casser un waterfall : initier les requêtes tôt (parallèle), précharger (*preload
pattern* — « it's a pattern, not an API »), ou découper le rendu avec des frontières de *Suspense*/loading.

**Trois techniques contre les race conditions (GreatFrontend) :** *debounce* (limiter le nombre de
requêtes), `AbortController` (annuler les requêtes en vol), ou *discard* (jeter les réponses périmées avant
de mettre à jour l'UI). R2 en exige **au moins une** dès que les paramètres varient.

**Données sensibles côté client (Next.js) :** au-delà de ne pas embarquer de secret, on peut empêcher la
fuite d'objets entiers/valeurs sensibles vers le client (ex. APIs *taint* de React côté serveur). La règle
neutre : ce qui est secret reste sur le serveur.

**Frontière avec les autres disciplines :** la **gestion d'état** (où vit la donnée, état serveur vs état
UI) relève de `state-management.md` ; le **contrat d'erreur HTTP** côté backend relève de
`error-handling.md` ; la **perf de rendu** relève de `performance-frontend.md`.

**Liens :** Next.js patterns → https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns ·
GreatFrontend → https://www.greatfrontend.com/react-interview-playbook/react-data-fetching
