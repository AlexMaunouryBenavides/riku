---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: error-handling
title: Error Handling
discipline: error-handling
kind: code
tech: []                      # agnostique : principes d'API/HTTP error handling valables sur tout backend.
                              # NestJS n'apparaît que dans les exemples (réconciliation), jamais dans la règle.
layer: backend
phase: [implementation, review]
level: guardrail              # défaut du fichier : codes corrects, schéma cohérent et non-fuite sont
                              # sécurité/contrat-critiques. Les règles de confort sont marquées "preference".
status: active
version: 1.0
sources:
  - https://blog.postman.com/best-practices-for-api-error-handling/
  - https://techcommunity.microsoft.com/discussions/appsonazure/best-practices-for-api-error-handling-a-comprehensive-guide/4088121
  - https://docs.nestjs.com/exception-filters
---

# Error Handling

> **Intention :** une erreur sortante est un **contrat** : le bon code HTTP, un schéma de réponse
> constant, un message actionnable, et **zéro fuite** d'interne. La logique métier lève des erreurs
> typées ; un seul endroit les transforme en réponse HTTP.
> **Applies to :** `**/*.controller.ts`, `**/*.service.ts`, filtres/handlers d'exception, `**/*.exception.ts`.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Le code HTTP reflète la nature de l'erreur                     {#error-handling.r1}
- **Règle :** renvoyer le **statut HTTP adapté à chaque cas** — `4xx` pour une faute du client (`400` requête invalide, `401` non authentifié, `403` interdit, `404` introuvable, `429` quota dépassé), `5xx` pour une faute serveur (`500`). Jamais de `200` qui enveloppe une erreur, jamais de `500` pour une faute d'entrée.
- **Pourquoi :** « It's important to ensure you use the appropriate status code for each scenario » (Postman) ; « Use status codes such as 200 (OK), 400 (Bad Request), 404 (Not Found), and 500 (Internal Server Error) » et « 429 - Too Many Requests when rate limits are exceeded » (Microsoft). Le statut est la première information machine-lisible du client.
- **Vérifié par :** manuel.
- **Check (review) :** chaque chemin d'erreur renvoie un code de la bonne classe ; pas de `2xx` masquant un échec, pas de `5xx` pour une donnée client invalide.
- ✅ **Bon :**
  ```ts
  // NestJS : la sous-classe porte le bon code
  if (!user) throw new NotFoundException('User not found'); // → 404
  ```
- ❌ **Mauvais :**
  ```ts
  return { ok: false, error: 'not found' }; // HTTP 200 alors que la ressource manque
  ```

### R2 — Un schéma de réponse d'erreur unique et constant              {#error-handling.r2}
- **Règle :** toutes les erreurs de l'API partagent **le même schéma JSON** (mêmes champs, même forme), quel que soit l'endpoint.
- **Pourquoi :** « Your API error response should follow an established structure that is consistent across all requests » (Postman) ; « Maintain a consistent format for your error responses across all endpoints » (Microsoft). Un consommateur écrit **un seul** code de gestion d'erreur.
- **Vérifié par :** manuel.
- **Check (review) :** aucune erreur ne renvoie une forme ad hoc divergente ; tous passent par le même format (cf. R6).
- ✅ **Bon :**
  ```jsonc
  // forme standard NestJS d'une HttpException
  { "statusCode": 404, "message": "User not found", "error": "Not Found" }
  ```
- ❌ **Mauvais :** un endpoint renvoie `{ "msg": "..." }`, un autre `{ "error": { "text": "..." } }`.

### R3 — Messages clairs, descriptifs et actionnables                  {#error-handling.r3}
- **Règle :** rédiger des messages d'erreur **compréhensibles et orientés résolution** : ce qui ne va pas, et comment le corriger. Pas de message vide, vague (`"Error"`) ou purement technique côté client.
- **Pourquoi :** « Error messages should be clear and descriptive. The consumer… should be able to understand the problem and how to fix it » (Postman) ; « clear, concise, and provide actionable information » (Microsoft).
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** le message dit *quoi* et idéalement *comment corriger* ; pas de `"something went wrong"` seul sur une faute client.
- ✅ **Bon :** `throw new BadRequestException('startDate must be before endDate')`
- ❌ **Mauvais :** `throw new BadRequestException('invalid')` — l'appelant ne sait pas quoi corriger.

### R4 — Ne jamais fuiter d'information interne                        {#error-handling.r4}
- **Règle :** ne **jamais** exposer au client de stack trace, requête SQL, chemin de fichier, détail de dépendance, secret ou identifiant interne. Une faute serveur (`5xx`) renvoie un message **générique** ; le détail va dans les logs (R8).
- **Pourquoi :** « Be careful not to leak any sensitive information in your error messages » (Postman) ; « Error messages do not expose sensitive information such as database details, API keys, or user credentials. Use generic error messages » (Microsoft). C'est une règle de sécurité.
- **Vérifié par :** manuel.
- **Check (review) :** aucun chemin de code ne sérialise `error.stack`, `error.message` brut d'une erreur d'infra, ou un objet d'exception complet vers la réponse.
- ✅ **Bon :**
  ```jsonc
  // NestJS : une exception non reconnue devient un 500 générique
  { "statusCode": 500, "message": "Internal server error" }
  ```
- ❌ **Mauvais :**
  ```ts
  catch (e) { return res.status(500).json({ stack: e.stack, query: sql }); } // fuite
  ```

### R5 — Lever des exceptions typées, jamais d'objet/chaîne brut        {#error-handling.r5}
- **Règle :** signaler une erreur en **levant une exception typée** issue d'une hiérarchie dédiée. Ne jamais `throw` une chaîne, un littéral ou un objet nu, ni renvoyer un code d'erreur implicite.
- **Pourquoi :** « it's good practice to create your own exceptions hierarchy, where your custom exceptions inherit from the base `HttpException` class » (NestJS). Des erreurs typées sont catchables par classe, mappables centralement (R6) et auto-documentées.
- **Niveau :** preference
- **Vérifié par :** `eslint: @typescript-eslint/only-throw-error` (interdit `throw 'string'` / littéral).
- **Check (review) :** chaque `throw` lève une instance d'`Error`/exception du domaine ; pas de `throw 'msg'` ni `throw { code: 1 }`.
- ✅ **Bon :**
  ```ts
  export class InsufficientFundsException extends HttpException {
    constructor() { super('Insufficient funds', HttpStatus.CONFLICT); }
  }
  throw new InsufficientFundsException();
  ```
- ❌ **Mauvais :**
  ```ts
  throw 'insufficient funds';        // littéral : non typé, non mappable
  throw { code: 'E_FUNDS' };         // objet nu
  ```

### R6 — Centraliser la transformation erreur → réponse               {#error-handling.r6}
- **Règle :** transformer les exceptions en réponse HTTP dans **un seul endroit** (filtre/middleware d'erreur global), pas par des `try/catch` qui re-formattent la réponse dans chaque handler. Les handlers lèvent ; la couche centrale formate.
- **Pourquoi :** NestJS fournit une « built-in exceptions layer… responsible for processing all unhandled exceptions across an application ». Centraliser garantit le schéma unique (R2) et la non-fuite (R4) sans les redupliquer partout.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** pas de logique de formatage de réponse d'erreur dispersée ; les `try/catch` locaux servent à *enrichir/retraduire* une erreur, pas à fabriquer la réponse HTTP.
- ✅ **Bon :** un `@Catch()` `ExceptionFilter` global applique le schéma R2 à toutes les exceptions.
- ❌ **Mauvais :** chaque controller fait son `catch (e) { res.status(500).json({...}) }` à sa façon.

### R7 — Réponse d'erreur enrichie d'un code stable et d'une corrélation {#error-handling.r7}
- **Règle :** inclure dans la réponse un **code d'erreur stable** (machine-lisible, indépendant du wording) et des champs de corrélation utiles au support : `requestId`/`traceId`, `timestamp`, `path`.
- **Pourquoi :** Postman recommande une structure incluant `code`, `requestId`, `timestamp`, `path` ; Microsoft cite les champs `code` et `details`. Un code stable laisse le client réagir programmatiquement ; la corrélation relie la réponse aux logs (R8).
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** la réponse d'erreur expose un `code` métier stable et au moins un identifiant de corrélation.
- ✅ **Bon :** `{ "statusCode": 409, "code": "INSUFFICIENT_FUNDS", "requestId": "…", "timestamp": "…", "path": "/payments" }`
- ❌ **Mauvais :** une erreur réduite à un message libre, impossible à tester ou à tracer.

### R8 — Logger l'erreur côté serveur, séparément du message client     {#error-handling.r8}
- **Règle :** **logger** chaque erreur serveur avec son contexte (cause, stack, corrélation) côté serveur, **distinctement** du message renvoyé au client (générique pour les 5xx, cf. R4).
- **Pourquoi :** « Implement API monitoring and logging, which makes it easier to trace API interactions and debug errors » (Postman) ; « Implement logging and monitoring to track API errors » (Microsoft). Le détail vit dans les logs, pas dans la réponse. (Le *comment* — format, niveaux, corrélation — relève de `observability.md`.)
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** les fautes serveur sont loggées avec leur cause ; le détail sensible va au log, pas au client.
- ✅ **Bon :** filtre global qui `logger.error(err)` puis renvoie le 500 générique.
- ❌ **Mauvais :** erreur avalée silencieusement (`catch {}`) ou, à l'inverse, stack renvoyée au client au lieu d'être loggée.

### R9 — Documenter les erreurs courantes                              {#error-handling.r9}
- **Règle :** documenter, pour chaque endpoint, ses **erreurs possibles** : codes HTTP, codes d'erreur métier, messages types et piste de remédiation.
- **Pourquoi :** « The API documentation should include possible error codes, common error messages, and remediation suggestions » (Postman) ; documentation des « common error codes, messages, and their meanings » (Microsoft).
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** les réponses d'erreur d'un endpoint figurent dans sa doc (ex. décorateurs OpenAPI `@ApiResponse`).
- ✅ **Bon :** la spec OpenAPI liste 400/404/409 avec leur `code` et leur signification.
- ❌ **Mauvais :** des codes d'erreur connus seulement en lisant le code source.

## Anti-patterns
- `200 OK` qui enveloppe une erreur, ou `500` pour une faute d'entrée → #error-handling.r1
- Schéma de réponse d'erreur différent d'un endpoint à l'autre → #error-handling.r2
- Message vague (`"error"`, `"invalid"`) non actionnable → #error-handling.r3
- `stack`, SQL, secret renvoyés au client → #error-handling.r4
- `throw 'string'` / `throw { … }` au lieu d'une exception typée → #error-handling.r5
- Formatage de réponse d'erreur dupliqué dans chaque handler → #error-handling.r6
- Réponse sans code stable ni corrélation → #error-handling.r7
- `catch {}` silencieux ou stack non loggée → #error-handling.r8
- Codes d'erreur non documentés → #error-handling.r9

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Pourquoi agnostique :** ces règles décrivent le *contrat d'erreur* d'une API HTTP, indépendant du
framework, pour ne pas entrer en conflit avec un outil précis. Les exemples utilisent NestJS comme
*instanciation concrète* — un autre framework applique les mêmes règles avec ses propres primitives.

**Réconciliation NestJS (instanciation des règles) :**
- R1/R2 — les sous-classes `HttpException` (`BadRequestException`, `UnauthorizedException`,
  `NotFoundException`, `ForbiddenException`, …, « exposed from the `@nestjs/common` package ») portent le
  bon code et produisent la forme standard `{ statusCode, message, error }`.
- R4 — « When an exception is **unrecognized** (is neither `HttpException` nor a class that inherits from
  `HttpException`), the built-in exception filter generates » un `{"statusCode":500,"message":"Internal
  server error"}` générique : la non-fuite est le comportement par défaut, ne pas le contourner.
- R5 — « create your own **exceptions hierarchy**, where your custom exceptions inherit from the base
  `HttpException` class » :
  ```ts
  export class ForbiddenException extends HttpException {
    constructor() { super('Forbidden', HttpStatus.FORBIDDEN); }
  }
  ```
- R6 — un `ExceptionFilter` global (`@Catch()`) est l'endroit unique qui applique R2/R4/R7 ; il s'appuie
  sur la « built-in exceptions layer » de Nest plutôt que de la dupliquer.

**Champs de réponse recommandés (Postman) :** `status`, `statusCode`, `code`, `message`, `details`,
`timestamp`, `path`, `suggestion`, `requestId`, `documentation_url`. Choisir un sous-ensemble **constant**
(au minimum `statusCode` + `code` + `message`, plus une corrélation) et s'y tenir partout (R2).

**Frontière avec les autres disciplines :** la **validation** des entrées (forme, types) relève de
`validation.md` (elle produit les `400`) ; le **format/niveaux de log** et la corrélation relèvent de
`observability.md` ; la **non-fuite** rejoint `security.md`. Ce fichier porte le *contrat d'erreur* lui-même.

**Liens :** Postman → https://blog.postman.com/best-practices-for-api-error-handling/ ·
Microsoft → https://techcommunity.microsoft.com/discussions/appsonazure/best-practices-for-api-error-handling-a-comprehensive-guide/4088121 ·
NestJS Exception filters → https://docs.nestjs.com/exception-filters
