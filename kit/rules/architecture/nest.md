---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: nest
title: NestJS — socle d'architecture (à ne pas modifier)
discipline: architecture
kind: code
tech: [nestjs]
layer: backend
phase: [design, implementation, review]
level:
  guardrail # défaut : c'est le socle imposé par le framework. Les points que la doc
  # formule comme « recommended / best practice / not recommended » sont en preference.
status: active
version: 1.0
sources:
  - https://docs.nestjs.com/modules
  - https://docs.nestjs.com/providers
  - https://docs.nestjs.com/controllers
  - https://docs.nestjs.com/pipes
  - https://docs.nestjs.com/guards
  - https://docs.nestjs.com/interceptors
  - https://docs.nestjs.com/exception-filters
  - https://docs.nestjs.com/custom-decorators
  - https://docs.nestjs.com/fundamentals/injection-scopes
  - https://docs.nestjs.com/fundamentals/dependency-injection
  - https://docs.nestjs.com/fundamentals/dynamic-modules
  - https://docs.nestjs.com/fundamentals/lifecycle-events
  - https://docs.nestjs.com/fundamentals/circular-dependency
  - https://docs.nestjs.com/faq/request-lifecycle
---

# NestJS — socle d'architecture (à ne pas modifier)

> **Intention :** poser les conventions structurelles **imposées par NestJS** — modules, injection de
> dépendances, séparation controller/provider, pipeline de requête — que l'on **n'adapte pas**. La Clean
> Architecture (découpage en couches, règle de dépendance) se réconcilie par-dessus dans
> `clean-archi-back.md`, en cédant devant ce socle en cas de conflit.
> **Applies to :** `**/*.module.ts`, `**/*.controller.ts`, `**/*.service.ts`, `**/*.guard.ts`,
> `**/*.pipe.ts`, `**/*.interceptor.ts`, `**/*.filter.ts`, `**/*.middleware.ts`, `main.ts`.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Structurer l'application en modules {#nest.r1}

- **Règle :** toute application a au moins un **module racine** ; organiser le code en **modules de fonctionnalité** qui encapsulent un ensemble de capacités d'un même domaine.
- **Pourquoi :** « Every Nest application has at least one module, the root module », point de départ du graphe d'application ; les modules de fonctionnalité « maintain clear boundaries » et « align with the SOLID principles ».
- **Vérifié par :** manuel.
- **Check (review) :** un module racine existe ; les classes liées à un domaine sont regroupées dans un module dédié, pas éparpillées.
- ✅ **Bon :** `CatsController` + `CatsService` regroupés dans `CatsModule`, importé par `AppModule`.
- ❌ **Mauvais :** tout déclarer dans `AppModule`, sans frontières de domaine.

### R2 — Enregistrer chaque classe dans le bon tableau du module {#nest.r2}

- **Règle :** déclarer les providers dans `providers`, les controllers dans `controllers`, les modules requis dans `imports`, et l'API publique dans `exports`. Un provider doit être enregistré pour que Nest puisse résoudre son injection.
- **Pourquoi :** ce sont les métadonnées que Nest lit pour construire le graphe et résoudre les dépendances ; sans enregistrement, l'injection échoue.
- **Vérifié par :** manuel (+ erreur de résolution DI au démarrage si oublié).
- **Check (review) :** chaque provider injecté est enregistré (dans le module ou exporté par un module importé) ; controllers dans `controllers`.
- ✅ **Bon :** `@Module({ controllers: [CatsController], providers: [CatsService] })`
- ❌ **Mauvais :** injecter `CatsService` sans l'enregistrer ni importer le module qui l'exporte.

### R3 — Respecter l'encapsulation des modules {#nest.r3}

- **Règle :** un provider est **privé** à son module ; il n'est injectable ailleurs que s'il est listé dans `exports`. Les providers exportés constituent l'**interface publique** du module.
- **Pourquoi :** « The module encapsulates providers by default… you can only inject providers that are either part of the current module or explicitly exported from other imported modules. »
- **Vérifié par :** manuel (+ erreur de résolution DI si non exporté).
- **Check (review) :** un provider consommé hors de son module figure bien dans `exports` ; on n'ouvre pas l'API du module au-delà du nécessaire.
- ✅ **Bon :** exporter `CatsService` puis importer `CatsModule` là où on en a besoin.
- ❌ **Mauvais :** re-déclarer le même provider dans chaque module qui en a besoin (instances multiples, états incohérents).

### R4 — Controllers fins : frontière HTTP, pas de logique métier {#nest.r4}

- **Règle :** un controller (`@Controller()`, **requis**) reçoit la requête et renvoie la réponse ; il **délègue** toute tâche complexe aux providers. Pas de logique métier dans le controller.
- **Pourquoi :** « Controllers are responsible for handling incoming requests and sending responses » ; « Controllers should handle HTTP requests and delegate more complex tasks to providers. »
- **Vérifié par :** manuel.
- **Check (review) :** les handlers se contentent d'orchestrer (appel d'un service + retour) ; aucune règle métier inline.
- ✅ **Bon :** `create(@Body() dto) { return this.catsService.create(dto); }`
- ❌ **Mauvais :** calculs/règles métier ou accès données directement dans le handler.

### R5 — Logique métier dans des providers `@Injectable` {#nest.r5}

- **Règle :** placer la logique applicative dans des **providers** (services, repositories, factories, helpers) annotés `@Injectable()`, gérés par le conteneur IoC.
- **Pourquoi :** le décorateur `@Injectable()` « signals that [the class] can be managed by the Nest IoC container » ; les providers sont le lieu prévu pour la logique et le « wiring » est pris en charge par le runtime.
- **Vérifié par :** manuel.
- **Check (review) :** la logique vit dans des classes `@Injectable`, pas dans les controllers ni des fonctions libres non injectées.
- ✅ **Bon :** `@Injectable() export class CatsService { … }`
- ❌ **Mauvais :** un singleton maison instancié à la main pour porter la logique.

### R6 — Injection par constructeur ; laisser l'IoC instancier {#nest.r6}

- **Règle :** déclarer les dépendances dans le **constructeur** (résolues par type) et laisser Nest les instancier. Ne pas faire de `new` manuel d'un provider. Réserver l'injection par propriété (`@Inject` sur un champ) aux cas d'héritage.
- **Pourquoi :** la DI est résolue par type via le constructeur ; « if your class doesn't extend another class, it's generally better to use **constructor-based** injection… better visibility ».
- **Vérifié par :** manuel.
- **Check (review) :** dépendances au constructeur ; pas d'instanciation manuelle ; injection par propriété justifiée par un `super()` lourd.
- ✅ **Bon :** `constructor(private catsService: CatsService) {}`
- ❌ **Mauvais :** `private svc = new CatsService()` dans la classe.

### R7 — Réponse : approche standard, pas l'objet réponse de la lib {#nest.r7}

- **Règle :** renvoyer la valeur depuis le handler (Nest sérialise en JSON, statut 200/201 par défaut). N'utiliser l'objet réponse spécifique à la lib (`@Res()`) que si nécessaire, et alors avec `passthrough: true` si on veut garder le traitement standard.
- **Pourquoi :** approche « Standard (**recommended**) » ; utiliser `@Res()`/`@Next()` **désactive automatiquement** l'approche standard sur cette route.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** les handlers `return` une valeur ; `@Res()` est l'exception justifiée (cookies/headers) avec `passthrough`.
- ✅ **Bon :** `findAll(): Cat[] { return this.catsService.findAll(); }`
- ❌ **Mauvais :** `findAll(@Res() res) { res.status(200).send(...) }` par défaut.

### R8 — Lire les entrées via les décorateurs dédiés {#nest.r8}

- **Règle :** extraire les données via `@Body()`, `@Query()`, `@Param()` (etc.) plutôt que d'accéder à l'objet `req` brut (`@Req()`).
- **Pourquoi :** « In most cases, you don't need to manually access these properties. Instead, you can use dedicated decorators like `@Body()` or `@Query()`. »
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** pas de `request.body`/`request.query` manuel quand un décorateur dédié existe.
- ✅ **Bon :** `create(@Body() dto: CreateCatDto)`
- ❌ **Mauvais :** `create(@Req() req) { const dto = req.body; }`

### R9 — Valider/transformer les entrées avec des Pipes, à la frontière {#nest.r9}

- **Règle :** confier la **validation** et la **transformation** des entrées à des **Pipes**, qui opèrent sur les arguments du handler **juste avant** son invocation. Voir `validation.md` pour le `ValidationPipe` et les DTO.
- **Pourquoi :** un pipe « operate[s] on the arguments… just before a method is invoked » ; lever une exception dans un pipe empêche l'exécution du handler → « best-practice technique for validating data coming into the application from external sources at the **system boundary** ».
- **Vérifié par :** manuel.
- **Check (review) :** la validation/transformation passe par un pipe (built-in ou custom), pas par du code défensif dans le service.
- ✅ **Bon :** `ParseIntPipe` sur un param ; `ValidationPipe` global sur les DTO.
- ❌ **Mauvais :** valider/convertir les entrées à la main dans le controller ou le service.

### R10 — Autorisation via des Guards (responsabilité unique) {#nest.r10}

- **Règle :** décider si une requête atteint le handler dans un **Guard** (`CanActivate`) — c'est le rôle prévu pour l'**autorisation**. Ne pas disperser cette décision dans les controllers/services.
- **Pourquoi :** « Guards have a **single responsibility**… determine whether a given request will be handled… (authorization) » ; ils ont accès à l'`ExecutionContext` et savent quel handler suit.
- **Vérifié par :** manuel.
- **Check (review) :** les contrôles d'accès sont dans des guards ; les handlers ne ré-implémentent pas l'autorisation.
- ✅ **Bon :** `@UseGuards(AuthGuard)` sur la route/le controller.
- ❌ **Mauvais :** `if (!user.isAdmin) throw …` au début de chaque handler.

### R11 — Logique transverse via des Interceptors (AOP) {#nest.r11}

- **Règle :** placer la logique transverse (logging, mesure, cache, transformation de réponse/exception) dans des **Interceptors** (`NestInterceptor`), qui enveloppent l'exécution du handler (avant/après).
- **Pourquoi :** les interceptors, inspirés de l'AOP, permettent de « bind extra logic before / after method execution », « transform the result », « transform the exception » — sans polluer la logique métier.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** les préoccupations transverses répétées sont factorisées en interceptors, pas copiées dans chaque handler/service.
- ✅ **Bon :** un `LoggingInterceptor` global mesurant la durée des requêtes.
- ❌ **Mauvais :** recopier le même `console.time`/mapping de réponse dans chaque méthode.

### R12 — Erreurs : `HttpException` + couche d'exceptions centralisée {#nest.r12}

- **Règle :** signaler les conditions d'erreur en levant une `HttpException` (ou sous-classe) et laisser la **couche d'exceptions** / les **exception filters** produire la réponse. Ne pas fabriquer les réponses d'erreur à la main.
- **Pourquoi :** Nest a « a built-in exceptions layer… responsible for processing all unhandled exceptions » ; « it's best practice to send standard HTTP response objects » via `HttpException`.
- **Vérifié par :** manuel.
- **Check (review) :** les erreurs métier lèvent des exceptions HTTP typées ; la mise en forme des erreurs est centralisée (filter), pas dupliquée.
- ✅ **Bon :** `throw new ForbiddenException()` / `throw new HttpException('Forbidden', HttpStatus.FORBIDDEN)`.
- ❌ **Mauvais :** `res.status(500).json({ … })` à la main dans un handler.

### R13 — Scope singleton par défaut ; REQUEST/TRANSIENT délibérément {#nest.r13}

- **Règle :** garder les providers en scope **singleton** (`DEFAULT`) sauf besoin avéré. N'employer `REQUEST` ou `TRANSIENT` que pour un cas réel (cache par requête, multi-tenancy, suivi), en connaissant la propagation.
- **Pourquoi :** « Using singleton scope is **recommended** for most use cases » (instance mise en cache, init une seule fois). Le scope `REQUEST` « bubbles up the injection chain » (un consommateur d'un provider request-scoped le devient).
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** un `Scope.REQUEST/TRANSIENT` est justifié ; on mesure son impact (toute la chaîne en amont devient request-scoped).
- ✅ **Bon :** services sans état partagé laissés en singleton.
- ❌ **Mauvais :** passer un service en `Scope.REQUEST` « par prudence », sans besoin.

### R14 — Éviter les dépendances circulaires {#nest.r14}

- **Règle :** éviter les dépendances circulaires entre providers/modules. Si inévitable, utiliser `forwardRef()` (des deux côtés) en **dernier recours**, ou refactorer via `ModuleRef`. Ne pas utiliser de **barrel files** (`index.ts`) pour regrouper modules/providers.
- **Pourquoi :** « circular dependencies should be avoided where possible » ; « Barrel files should be omitted when it comes to module/provider classes » (cause fréquente de cycles). L'ordre d'instanciation avec `forwardRef` est indéterminé.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** pas de cycle évitable ; `forwardRef` documenté comme dernier recours ; pas d'import de module/provider via un barrel.
- ✅ **Bon :** extraire une responsabilité commune dans un troisième provider pour casser le cycle.
- ❌ **Mauvais :** `forwardRef` posé par réflexe + imports via `index.ts`.

### R15 — Modules globaux (`@Global`) avec parcimonie {#nest.r15}

- **Règle :** préférer rendre l'API d'un module disponible via `imports` explicites. Réserver `@Global()` (ou `global: true`) aux providers vraiment ubiquitaires (helpers, connexion DB), enregistrés **une seule fois** (module racine/core).
- **Pourquoi :** « Making everything global is not recommended as a design practice » ; « it's generally better to use the `imports` array… avoiding unnecessary coupling ». Les modules globaux doivent être « registered **only once** ».
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** `@Global` rare et justifié, enregistré une fois ; le reste passe par `imports`.
- ✅ **Bon :** un `CoreModule` global unique pour la connexion DB.
- ❌ **Mauvais :** marquer global la plupart des modules pour éviter d'écrire `imports`.

### R16 — Modules configurables & providers custom : utiliser les mécanismes prévus {#nest.r16}

- **Règle :** pour un module paramétrable au runtime, utiliser le **module dynamique** (`static forRoot()/forFeature()` renvoyant un `DynamicModule`), dont les métadonnées **étendent** (n'écrasent pas) celles du `@Module()`. Pour une dépendance qui n'est pas une simple classe, utiliser un **custom provider** (`useClass`/`useValue`/`useFactory`/`useExisting`) avec un **token** d'injection.
- **Pourquoi :** les modules dynamiques « can be configured at runtime » ; les propriétés renvoyées « **extend** (rather than override) the base module metadata ». Le conteneur IoC supporte « plain values, classes, and both asynchronous or synchronous factories ».
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** la configuration passe par `forRoot/forFeature` ; les non-classes sont fournies par un custom provider tokenisé, pas par un hack.
- ✅ **Bon :** `DatabaseModule.forRoot([User])` ; `{ provide: 'HTTP_OPTIONS', useValue: {...} }`.
- ❌ **Mauvais :** lire un singleton de config global au lieu d'un provider injecté.

### R17 — Init/teardown via les lifecycle hooks {#nest.r17}

- **Règle :** utiliser les **lifecycle hooks** (`onModuleInit`, `onApplicationBootstrap`, `onModuleDestroy`, `beforeApplicationShutdown`, `onApplicationShutdown`) pour l'initialisation et la libération de ressources, plutôt que du code ad hoc. Activer `enableShutdownHooks()` pour un arrêt **gracieux**.
- **Pourquoi :** Nest fournit ces hooks « to act… when [lifecycle events] occur » ; les shutdown hooks gèrent la fermeture propre des connexions. Ils **ne sont pas** déclenchés pour les classes request-scoped.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** l'init/teardown des ressources passe par les interfaces de hook ; shutdown hooks activés si arrêt gracieux requis ; pas de hook attendu sur du request-scoped.
- ✅ **Bon :** `implements OnApplicationShutdown` pour fermer un pool DB.
- ❌ **Mauvais :** ouvrir/fermer des ressources globales hors du cycle géré par Nest.

## Anti-patterns

- Tout dans `AppModule`, sans modules de fonctionnalité → #nest.r1
- Provider injecté mais non enregistré/importé → #nest.r2
- Provider consommé hors module sans `exports` (ou re-déclaré partout) → #nest.r3
- Logique métier dans le controller → #nest.r4 / #nest.r5
- `new MonService()` manuel au lieu de l'injection → #nest.r6
- `@Res()` par défaut au lieu du retour standard → #nest.r7
- Lecture de `req.body`/`req.query` brut → #nest.r8
- Validation/transformation à la main hors pipe → #nest.r9
- Autorisation recodée dans chaque handler → #nest.r10
- Logique transverse dupliquée au lieu d'un interceptor → #nest.r11
- Réponses d'erreur fabriquées à la main → #nest.r12
- `Scope.REQUEST` injustifié → #nest.r13
- Dépendance circulaire + barrel files → #nest.r14
- `@Global` à outrance → #nest.r15
- Config lue globalement au lieu d'un module dynamique / custom provider → #nest.r16
- Init/teardown hors lifecycle hooks → #nest.r17

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Ordre du cycle de requête (source `faq/request-lifecycle`)** — utile pour placer chaque préoccupation au bon
niveau (global / controller / route) :

1. Requête entrante → 2. **Middleware** (global puis module) → 3. **Guards** (global → controller → route) →
2. **Interceptors** (pré-controller, global → controller → route) → 5. **Pipes** (global → controller → route →
   paramètre) → 6. **Controller** (handler) → 7. **Service** → 8. **Interceptors** (post, route → controller →
   global) → 9. **Exception filters** (route → controller → global) → 10. Réponse.
   Note : les **filters** résolvent du plus local au plus global (l'inverse des autres) ; ils ne se déclenchent
   que sur une exception **non rattrapée**.

**Middleware (Overview, non érigé en règle distincte) :** fonction exécutée **avant** le route handler, avec
accès à `req`/`res`/`next()`. C'est un bon choix pour des préoccupations non liées au contexte de route
(ex. logging brut) ; l'**authentification** peut s'y faire, mais l'**autorisation** va dans un Guard (R10),
car le middleware « doesn't know which handler will be executed ».

**Pipes intégrés (source) :** `ValidationPipe`, `ParseIntPipe`, `ParseFloatPipe`, `ParseBoolPipe`,
`ParseArrayPipe`, `ParseUUIDPipe`, `ParseEnumPipe`, `DefaultValuePipe`, `ParseFilePipe`, `ParseDatePipe`
(exportés de `@nestjs/common`).

**Décorateurs custom (Overview) :** Nest étant « built around… decorators », on peut créer des **param
decorators** réutilisables (via `createParamDecorator`) pour extraire des données récurrentes de la requête
(ex. l'utilisateur courant), au lieu de répéter l'accès à `req`.

**Scopes — précisions (source) :** Node.js ne suit pas un modèle multi-thread par requête, donc les
singletons sont « fully **safe** ». Limites du request-scoped : non utilisable pour les **WebSocket Gateways**
(doivent être singletons), et les **lifecycle hooks** ne s'y déclenchent pas.

**Custom providers — formes (source `fundamentals/dependency-injection`) :** `useClass` (classe),
`useValue` (valeur/constante), `useFactory` (fabrique sync/async, avec `inject` pour ses dépendances),
`useExisting` (alias d'un provider existant). Un **token** (souvent une string ou un `Symbol`) identifie un
provider non-classe ; on l'injecte avec `@Inject(TOKEN)`. `@Optional()` marque une dépendance facultative.

**Frontière avec `clean-archi-back.md` :** ce fichier = mécanique **imposée par Nest** (modules, DI,
pipeline) = `guardrail`. L'organisation en **couches** (entities / use-cases / interface-adapters /
frameworks), la **règle de dépendance** (les dépendances pointent vers l'intérieur) et l'inversion des
dépendances d'infrastructure relèvent de `clean-archi-back.md` (`preference`, cède devant ce socle ou une
convention du projet en cas de conflit).

**Liens :** doc officielle NestJS, sections _Overview_ et _Fundamentals_ —
https://docs.nestjs.com/modules · /providers · /controllers · /pipes · /guards · /interceptors ·
/exception-filters · /custom-decorators · /fundamentals/injection-scopes · /fundamentals/dependency-injection ·
/fundamentals/dynamic-modules · /fundamentals/lifecycle-events · /fundamentals/circular-dependency ·
/faq/request-lifecycle
