---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: api-design
title: API Design (REST)
discipline: api-design
kind: code
tech: [] # agnostique : conception d'API REST, indépendante du framework.
layer: backend
phase: [design, implementation, review]
level:
  preference # défaut : conventions de conception REST. La sémantique HTTP (méthodes,
  # idempotence, codes de statut, négociation de contenu) est en guardrail.
status: active
version: 1.0
sources:
  - https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design # « RESTful web API design » (source principale)
  - https://learn.microsoft.com/fr-fr/rest/api/azure/ # composants d'une requête/réponse REST
  - https://wiki.umontreal.ca/spaces/DOC/pages/294781211/ # exemple d'API (corroboration seulement)
---

# API Design (REST)

> **Intention :** concevoir une API web **orientée ressources** qui respecte la sémantique HTTP (méthodes,
> idempotence, codes de statut, négociation de contenu) et reste simple, versionnable et faiblement couplée
> du client. La sémantique HTTP est un **socle** (`guardrail`) ; les conventions de design REST sont des
> `preference` qui cèdent devant une convention de projet.
> **Applies to :** la couche API/HTTP (controllers, routes, contrats OpenAPI) — `**/*.controller.ts`,
> définitions de routes, specs OpenAPI.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Orienter l'API autour de ressources (noms), pas d'actions (verbes) {#api-design.r1}

- **Règle :** baser les URI sur des **noms** (la ressource), pas des verbes (l'opération). Le verbe est porté par la méthode HTTP.
- **Pourquoi :** « base resource URIs on nouns (the resource) and not verbs (the operations on the resource) » ; « The HTTP GET, POST, PUT, PATCH, and DELETE methods already imply the verbal action. »
- **Vérifié par :** manuel.
- **Check (review) :** aucune URI ne contient un verbe d'action (`/create-order`, `/getUser`).
- ✅ **Bon :** `POST https://api.contoso.com/orders`
- ❌ **Mauvais :** `POST https://api.contoso.com/create-order`

### R2 — Collections au pluriel, hiérarchie collection/élément {#api-design.r2}

- **Règle :** nommer les collections avec des **noms au pluriel** et organiser collection/élément en hiérarchie : `/customers` (collection), `/customers/5` (élément).
- **Pourquoi :** « Use plural nouns to name collection URIs… organize URIs for collections and items into a hierarchy… keeps the web API intuitive. »
- **Vérifié par :** manuel.
- **Check (review) :** les collections sont au pluriel ; l'accès à un élément suit `/{collection}/{id}`.
- ✅ **Bon :** `/customers` puis `/customers/5`.
- ❌ **Mauvais :** `/customer` pour la collection, ou `/getCustomerById?id=5`.

### R3 — Garder les URI simples ; exposer les relations par des liens {#api-design.r3}

- **Règle :** ne pas exiger d'URI plus complexe que **collection/élément/collection**. Pour des relations profondes, fournir une référence puis naviguer (`/customers/1/orders` puis `/orders/99/products`), ou inclure des liens dans la réponse (HATEOAS, R12).
- **Pourquoi :** « Avoid requiring resource URIs that are more complex than collection/item/collection » ; un imbriquement profond est « difficult to maintain and is inflexible if the relationships change ».
- **Vérifié par :** manuel.
- **Check (review) :** pas d'URI du type `/customers/1/orders/99/products` ; relations gérées par liens/références.
- ✅ **Bon :** `/customers/1/orders` ; `/orders/99/products`.
- ❌ **Mauvais :** `/customers/1/orders/99/products`.

### R4 — Ne pas calquer l'API sur le schéma de la base {#api-design.r4}

- **Règle :** modéliser des **entités métier** et leurs opérations, pas les tables. Introduire au besoin une couche de mapping entre la base et l'API.
- **Pourquoi :** « Avoid creating APIs that mirror the internal structure of a database… increases the attack surface and might result in data leakage… think of the web API as an abstraction of the database. » (Cohérent avec `clean-archi-back.md`.)
- **Vérifié par :** manuel.
- **Check (review) :** les ressources exposées sont des concepts métier, pas un reflet 1:1 des tables ; le client est isolé du schéma DB.
- ✅ **Bon :** `/orders` qui agrège ce dont le client a besoin.
- ❌ **Mauvais :** une ressource par table technique, exposant la structure interne.

### R5 — Éviter les API trop bavardes (chatty) {#api-design.r5}

- **Règle :** éviter une multitude de **petites ressources** qui obligent le client à enchaîner les requêtes. Regrouper l'information liée dans des ressources plus grosses, sans pour autant sur-charger les réponses de données inutiles.
- **Pourquoi :** « Web APIs that expose a large number of small resources are known as chatty web APIs… consider denormalizing… combining related information into bigger resources », à équilibrer contre « the overhead of fetching data that the client doesn't need ».
- **Vérifié par :** manuel.
- **Check (review) :** un cas d'usage courant ne nécessite pas une cascade d'appels ; les réponses ne traînent pas de données superflues.

### R6 — Respecter la sémantique des méthodes HTTP {#api-design.r6}

- **Règle :** utiliser GET/POST/PUT/PATCH/DELETE conformément au protocole : **GET** lit une représentation ; **POST** crée (le **serveur** attribue l'URI) ou soumet un traitement ; **PUT** remplace une ressource **complète** (élément, pas collection) ; **PATCH** applique une modification **partielle** ; **DELETE** supprime. L'effet dépend de collection vs élément.
- **Pourquoi :** « use these methods in a way that is consistent with the protocol definition » ; « For POST requests, a client shouldn't attempt to create its own URI… the server should assign a URI ».
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** chaque opération emploie la méthode adéquate ; POST sur une URI précise non supportée renvoie 400 ; PUT/PATCH ciblent un élément.
- ✅ **Bon :** `POST /orders` crée et renvoie l'URI ; `PATCH /orders/1` modifie partiellement.
- ❌ **Mauvais :** `GET /orders/1/delete` ; un POST qui « met à jour » une ressource identifiée.

### R7 — Méthodes sûres et idempotentes {#api-design.r7}

- **Règle :** **GET** est sûr (lecture seule, aucun effet de bord). **PUT** et **DELETE** sont **idempotents** (rejouer la même requête laisse le même état). **POST** et **PATCH** ne sont **pas** garantis idempotents.
- **Pourquoi :** « PUT requests must be idempotent… If a client resends a PUT request, the results should remain unchanged. In contrast, POST and PATCH requests aren't guaranteed to be idempotent. »
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** GET ne modifie rien ; rejouer un PUT/DELETE n'a pas d'effet cumulatif ; on ne s'appuie pas sur l'idempotence d'un POST.
- ✅ **Bon :** `PUT /customers/1` avec la représentation complète, rejouable.
- ❌ **Mauvais :** un GET qui incrémente un compteur / déclenche une action.

### R8 — Renvoyer le bon code de statut HTTP par opération {#api-design.r8}

- **Règle :** mapper chaque issue sur le code standard : **200** OK ; **201** Created (+ `Location` de la nouvelle ressource) ; **204** No Content ; **400** Bad Request ; **404** Not Found ; **405** Method Not Allowed ; **409** Conflict ; **415** Unsupported Media Type ; **406** Not Acceptable ; **202** Accepted (asynchrone, R13).
- **Pourquoi :** la doc associe explicitement ces codes aux opérations (ex. POST → 201 « The URI of the new resource is included in the Location header » ; PUT conflit → 409 ; PATCH média non géré → 415).
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** les handlers renvoient le code attendu (création→201+Location, suppression→204, conflit d'état→409…), pas un 200 générique partout.
- ✅ **Bon :** `POST /orders` → `201 Created` + `Location: /orders/1`.
- ❌ **Mauvais :** renvoyer 200 pour une création, ou 500 pour une entrée invalide.

### R9 — Négociation de contenu : `Content-Type` / `Accept` {#api-design.r9}

- **Règle :** indiquer le format du corps via **`Content-Type`** (JSON par défaut, `application/json`) et honorer l'en-tête **`Accept`** du client. Si le média n'est pas supporté → **415** ; si aucun `Accept` ne peut être satisfait → **406**.
- **Pourquoi :** « The Content-Type header… specifies the resource representation format » ; « If the server doesn't support the media type, it should return 415 » ; « If the server can't match any of the listed media types, it should return 406. »
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** corps typés via `Content-Type` ; `Accept` pris en compte ; 415/406 renvoyés aux bons moments.
- ✅ **Bon :** `Content-Type: application/json; charset=utf-8` sur un POST avec corps JSON.
- ❌ **Mauvais :** ignorer `Accept` et renvoyer un format imposé sans 406.

### R10 — Pagination, filtrage, tri et projection par query string {#api-design.r10}

- **Règle :** paginer les grandes collections via `limit`/`offset` avec des **défauts** (`limit=25`, `offset=0`) et une **borne max** ; filtrer/trier/projeter via la query string (`status=shipped`, `sort=price`, `fields=id,name`). **Valider** les champs demandés.
- **Pourquoi :** « Use query parameters like limit… and offset… provide meaningful defaults » ; « impose an upper limit… to prevent denial-of-service » ; « validate the requested fields… won't expose fields that aren't normally available ».
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** la pagination a des défauts + un plafond ; les filtres/tri/champs passent par la query string ; les champs projetés sont validés/autorisés.
- ✅ **Bon :** `GET /orders?limit=25&offset=50&status=shipped&fields=id,total`.
- ❌ **Mauvais :** renvoyer toute la collection sans plafond ; accepter `fields` sans contrôle.

### R11 — Versionner l'API et préserver la compatibilité ascendante {#api-design.r11}

- **Règle :** choisir une stratégie de versionnement (URI, query string, en-tête, ou media type) et faire en sorte que les URI/clients existants continuent de fonctionner. Les ajouts non-cassants (nouveaux champs) sont tolérés ; les suppressions/renommages/changements de relations sont des **breaking changes** à versionner.
- **Pourquoi :** « It's important to continue to support existing client applications while allowing new client applications to use new features » ; les clients qui « ignore unrecognized fields » survivent aux ajouts.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** un schéma de version est en place ; un changement cassant introduit une nouvelle version sans casser l'ancienne.
- ✅ **Bon :** `GET /v2/customers/3` (versionnement par URI) ; champ ajouté sans bump si non-cassant.
- ❌ **Mauvais :** renommer/supprimer un champ dans la version courante consommée par des clients.

### R12 — HATEOAS : liens hypermedia vers les ressources/opérations liées {#api-design.r12}

- **Règle :** inclure dans les représentations des **liens** vers les ressources liées et les opérations disponibles (relation, URI, méthode, types de média), plus un lien `self`. Le jeu de liens peut varier selon l'état de la ressource.
- **Pourquoi :** « Each HTTP GET request should return the information necessary to find the resources related… through hyperlinks… This principle is known as HATEOAS. » (Note : pas de standard universel — choisir une convention et s'y tenir.)
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** les réponses portent des liens cohérents (au moins `self`) si la convention HATEOAS est adoptée.
- ✅ **Bon :** `links: [{ rel:"customer", href:"…/customers/3", action:"GET" }, { rel:"self", … }]`.
- ❌ **Mauvais :** obliger le client à connaître/dériver les URI liées de son côté.

### R13 — Opérations longues en asynchrone (202 + endpoint de statut) {#api-design.r13}

- **Règle :** pour un POST/PUT/PATCH/DELETE coûteux, répondre **202 Accepted** et exposer un **endpoint de statut** dont l'URI est dans l'en-tête `Location` ; le client poll ce statut. Si l'opération crée une ressource, renvoyer **303 See Other** vers son URI à la fin.
- **Pourquoi :** « An asynchronous method should return HTTP status code 202 (Accepted)… Include the URI of the status endpoint in the Location header… return status code 303 (See Other) after the operation completes. »
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** les opérations longues ne bloquent pas la réponse ; 202 + statut pollable ; 303 vers la ressource créée.
- ✅ **Bon :** `202 Accepted` + `Location: /api/status/12345`, puis `303 See Other`.
- ❌ **Mauvais :** garder la connexion ouverte le temps d'un traitement long.

## Anti-patterns

- Verbe d'action dans l'URI (`/create-order`) → #api-design.r1
- Collection au singulier / `getXById` → #api-design.r2
- URI imbriquée plus profonde que collection/item/collection → #api-design.r3
- API qui reflète 1:1 les tables de la base → #api-design.r4
- API bavarde (cascade de petites requêtes) → #api-design.r5
- Méthode HTTP détournée de sa sémantique → #api-design.r6
- GET avec effet de bord / PUT non idempotent → #api-design.r7
- 200 générique au lieu du code adéquat (201+Location, 204, 409…) → #api-design.r8
- `Accept`/`Content-Type` ignorés ; pas de 415/406 → #api-design.r9
- Collection renvoyée sans pagination/plafond ; `fields` non validés → #api-design.r10
- Breaking change sans nouvelle version → #api-design.r11
- Pas de liens hypermedia alors que la convention HATEOAS est adoptée → #api-design.r12
- Opération longue bloquant la réponse au lieu d'un 202 asynchrone → #api-design.r13

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Principes RESTful (source principale) :** _platform independence_ (HTTP standard + format familier JSON/XML)
et _loose coupling_ (client et service évoluent indépendamment). Concepts : **URI** (chaque ressource a un
identifiant unique), **représentation** (encodage JSON/XML transporté en HTTP), **interface uniforme** (verbes
HTTP standard), **modèle sans état** (« HTTP requests are independent… each request should be an atomic
operation »), **liens hypermedia** (HATEOAS).

**Anatomie d'une requête/réponse REST (source `rest/api/azure`) — 5 composants :** 1) **URI**
`{scheme}://{host}/{resource-path}?{query-string}` ; 2) **en-têtes de requête** (méthode HTTP + en-têtes
comme `Authorization`, `Content-Type`) ; 3) **corps de requête** (MIME, `Content-Type` requis pour POST/PUT) ; 4) **en-têtes de réponse** (code de statut 2xx/4xx/5xx + `Content-Type`) ; 5) **corps de réponse** (objet MIME,
typiquement JSON). Toutes les requêtes REST exigent **HTTPS** (canal sécurisé) — voir aussi `security.md`.

**Codes de statut par méthode (récap, source principale) :** GET → 200 / 204 / 404 ; POST → 200 / 201 (+Location)
/ 204 / 400 / 405 ; PUT → 200 / 201 / 204 / 409 ; PATCH → 200 / 400 / 409 / 415 ; DELETE → 204 / 404. Négociation :
415 (Unsupported Media Type), 406 (Not Acceptable). Asynchrone : 202 (Accepted), 303 (See Other).

**Formats PATCH (source) :** _JSON merge patch_ (`application/merge-patch+json`, RFC 7396 — même structure que
la ressource, `null` = suppression ; inadapté si la ressource peut contenir des `null` explicites) et _JSON
patch_ (`application/json-patch+json`, RFC 6902 — séquence d'opérations add/remove/replace/copy/test).

**Stratégies de versionnement (source) :** _URI_ (`/v2/customers/3`) et _query string_ (`?version=2`) sont
**cache-friendly** ; _header_ (en-tête custom `api-version`) et _media type_ (`Accept: application/vnd.contoso.v1+json`)
demandent plus de logique et compliquent le cache et HATEOAS.

**Réponses partielles (source) :** pour de gros binaires, supporter `Accept-Ranges`/`Range` (GET partiel → 206
Partial Content) et `HEAD` (en-têtes seuls) pour décider de télécharger.

**Réconciliation avec Nest (`tech: []` ici, mais utile sur tes backends Nest) :** les codes de statut et les
erreurs se posent via les exceptions HTTP de Nest et la couche d'exceptions (`nest.r12`) ; la sérialisation
JSON / le retour standard relèvent de `nest.r7` ; la validation des entrées (DTO/pipes) de `validation.md` et
`nest.r9` ; l'abstraction des ressources vis-à-vis de la base (R4) prolonge `clean-archi-back.md`.

**Note sur les sources :** le guide _« RESTful web API design »_ (Azure Architecture Center) est la source
normative principale. La page _rest/api/azure_ sert pour l'anatomie requête/réponse. Le wiki **UMontreal**
décrit une **API particulière** (lecture seule, GET-only, JSON, version en URI, pagination `start`/`rows`) :
il **corrobore** ponctuellement (JSON, version en URI, codes 200/400/500) mais n'est pas une source de
conception générale.

**Liens :** RESTful web API design → https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design ·
composants requête/réponse → https://learn.microsoft.com/fr-fr/rest/api/azure/
