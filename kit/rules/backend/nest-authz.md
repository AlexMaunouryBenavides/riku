---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: nest-authz
title: NestJS — Guards & contrôle d'accès (implémentation)
discipline: authorization
kind: code
tech: [nestjs]                # se déclenche dès que Nest est détecté, indépendamment de Passport.
layer: backend
phase: [implementation, review]
level: preference             # défaut ; deny-by-default (r1) et ordre des Guards (r2) sont guardrail.
status: active
version: 1.0
sources:
  - https://docs.nestjs.com/guards
  - https://docs.nestjs.com/security/authorization
---

# NestJS — Guards & contrôle d'accès (implémentation)

> **Intention :** câbler correctement l'autorisation **dans Nest** — protection par défaut via un Guard
> global, ordre authn→authz, RBAC par métadonnées, refus propre. C'est l'**instanciation Nest** de
> `authentication.md`/`authorization.md` (les principes neutres) ; le fait d'utiliser des Guards comme
> responsabilité unique est posé par `nest.md R10`.
> **Applies to :** `**/*.guard.ts`, décorateurs de métadonnées (`@Roles`, `@Public`…), `main.ts`/module racine (binding global).

<!-- Ce fichier INSTANCIE authorization.md (deny-by-default, objet précis, ABAC) et authentication.md, pour
     NestJS. Il complète nest.md R10 (Guards = responsabilité unique) sans le dupliquer. Indépendant de Passport. -->

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Deny-by-default via un Guard global + @Public                  {#nest-authz.r1}
- **Règle :** appliquer la protection **par défaut** en enregistrant un Guard **global** (`APP_GUARD`), et n'ouvrir les routes publiques qu'**explicitement** via un décorateur `@Public()` (métadonnée) lu par le Guard. Préférer `APP_GUARD` à `useGlobalGuards(new …)` pour bénéficier de l'injection de dépendances.
- **Pourquoi :** Nest recommande de « Register a guard globally to protect all endpoints by default… [then] mark specific routes as public » ; le binding par `APP_GUARD` (provider) « support[s]… dependency injection ». C'est l'instanciation de `#authorization.r1` (deny-by-default).
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** un `APP_GUARD` protège globalement ; les routes ouvertes portent `@Public()` ; aucune route sensible n'est accessible faute de Guard.
- ✅ **Bon :**
  ```ts
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }], // protégé par défaut
  // @Public() sur /login, /health
  ```
- ❌ **Mauvais :** `@UseGuards` posé au cas par cas → une route oubliée reste ouverte.

### R2 — Ordre des Guards : authentification avant autorisation         {#nest-authz.r2}
- **Règle :** garantir que le Guard d'**authentification** s'exécute **avant** le Guard d'**autorisation** (rôles/permissions). Le Guard de rôles lit `request.user` : il doit déjà être peuplé.
- **Pourquoi :** « Guards are executed after all middleware, but before any interceptor or pipe » ; et le `RolesGuard` « assumes `request.user` contains the user instance and allowed roles » — association faite « in your custom authentication guard ». Si l'authz s'exécute sans `req.user`, le contrôle est faussé.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** quand plusieurs Guards sont enregistrés, l'authn précède l'authz (ordre des `APP_GUARD` / des `@UseGuards`) ; le Guard de rôles ne lit jamais un `req.user` non peuplé.
- ✅ **Bon :** `APP_GUARD` = `[AuthGuard, RolesGuard]` dans cet ordre.
- ❌ **Mauvais :** `RolesGuard` enregistré avant l'authn → `user` indéfini, décision erronée.

### R3 — RBAC par métadonnées : @Roles + RolesGuard + Reflector        {#nest-authz.r3}
- **Règle :** exprimer les exigences d'accès par un **décorateur de métadonnées** (`@Roles(...)` via `SetMetadata`) et les lire dans un Guard avec `reflector.getAllAndOverride(KEY, [context.getHandler(), context.getClass()])` — le niveau **méthode prime** sur le niveau classe.
- **Pourquoi :** c'est le pattern officiel Nest : « `Roles = (...roles) => SetMetadata(ROLES_KEY, roles)` » + un `RolesGuard` qui « reads metadata using the Reflector service and compares user roles against requirements ». `getAllAndOverride([handler, class])` permet une config par méthode **et** par classe.
- **Vérifié par :** manuel.
- **Check (review) :** les exigences d'accès passent par le décorateur + Reflector, pas par des `if (role === …)` éparpillés (cf. `#authorization.r5`).
- ✅ **Bon :**
  ```ts
  export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required) return true;
    const { user } = ctx.switchToHttp().getRequest();
    return required.some((r) => user.roles?.includes(r));
  }
  ```
- ❌ **Mauvais :** lire le rôle à la main dans chaque handler au lieu d'un Guard + métadonnée.

### R4 — Le RBAC par rôle est « basique » : viser permissions/CASL     {#nest-authz.r4}
- **Règle :** traiter le RBAC par simple présence de rôle comme un **point de départ**. Pour des besoins réels (plusieurs opérations par endpoint, droits fins), passer à une autorisation par **permissions/claims** ou à des **policies** (CASL).
- **Pourquoi :** Nest prévient : « This example is named 'basic' as we only check for the presence of roles on the route handler level » et qu'il n'existe alors « no centralized place that associates permissions with specific actions ». C'est l'instanciation Nest de `#authorization.r6` (préférer ABAC/ReBAC).
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** au-delà de cas triviaux, l'accès est décidé sur des **permissions/policies**, pas sur des noms de rôle figés ; les rôles ne sont qu'un regroupement de permissions.
- ✅ **Bon :** `@CheckPolicies((ability) => ability.can(Action.Update, Article))` (CASL) / `@RequirePermission('article:update')`.
- ❌ **Mauvais :** multiplier les `@Roles('admin','manager',…)` pour encoder une logique de droits fine.

### R5 — Refuser proprement (false → 403), jamais ouvrir sur erreur     {#nest-authz.r5}
- **Règle :** un Guard renvoie `true` pour autoriser, `false` pour refuser (Nest répond **403 Forbidden**) ou lève une exception dédiée. Ne jamais « ouvrir » l'accès en cas d'erreur/exception du Guard.
- **Pourquoi :** « if it returns `true`, the request will be processed. if it returns `false`, Nest will deny the request » (403 par défaut, ou exception custom). Instancie `#authorization.r7` (fail-closed).
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** pas de `catch { return true }` dans un Guard ; le refus produit un 403/une exception explicite ; les erreurs ne contournent pas le contrôle.
- ✅ **Bon :** `return required.some(...)` (false → 403) ou `throw new ForbiddenException()`.
- ❌ **Mauvais :** `try { … } catch { return true; }` dans un `canActivate`.

### R6 — Contrôle de l'objet précis : dans le service, pas le Guard     {#nest-authz.r6}
- **Règle :** un Guard de rôles décide de l'autorisation **fonctionnelle** (métadonnées de route + `req.user`), pas de la propriété d'un enregistrement précis. La vérification « cet utilisateur a-t-il le droit sur *cet* objet » (anti-IDOR) se fait **là où l'objet est chargé** (service/handler).
- **Pourquoi :** le Guard s'exécute **avant** le controller et ne connaît que la route + `req.user` (« assumes `request.user` contains the user instance and allowed roles ») ; il n'a pas l'objet ciblé. La règle d'objet précis vient de `#authorization.r4` (OWASP) — ici on la place au bon endroit du pipeline Nest.
- **Vérifié par :** manuel.
- **Check (review) :** les accès par id vérifient la propriété/le droit sur l'objet dans le service ; on ne compte pas sur un Guard de rôles générique pour ça.
- ✅ **Bon :**
  ```ts
  const order = await this.orders.findById(id);
  if (order.ownerId !== user.id) throw new ForbiddenException();
  ```
- ❌ **Mauvais :** se fier au seul `@Roles('user')` et renvoyer `findById(id)` sans contrôle de propriété (IDOR).

## Anti-patterns
- `@UseGuards` au cas par cas sans Guard global deny-by-default → #nest-authz.r1
- Guard de rôles enregistré avant l'authn (`req.user` indéfini) → #nest-authz.r2
- `if (role === 'admin')` dans les handlers au lieu de `@Roles` + Reflector → #nest-authz.r3
- Logique de droits fine encodée en empilant des rôles → #nest-authz.r4
- `catch { return true }` dans un `canActivate` → #nest-authz.r5
- Aucune vérification de propriété d'objet (IDOR) hors du Guard → #nest-authz.r6

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Place des Guards dans le pipeline (source `guards` + `nest.md` Reference) :** « Guards are executed after
all middleware, but before any interceptor or pipe. » L'**authentification** peut se faire en middleware ou
en Guard, mais l'**autorisation** va dans un Guard (cf. `nest.md R10`), qui connaît le handler à venir via
l'`ExecutionContext` (ce que le middleware ignore).

**Binding (source `guards`) :** par décorateur `@UseGuards(XGuard)` (controller/méthode) ; ou global —
`app.useGlobalGuards(new XGuard())` (setup immédiat, **sans** DI) **ou** provider `APP_GUARD` (**avec** DI,
recommandé pour le deny-by-default R1). `CanActivate.canActivate()` renvoie
`boolean | Promise<boolean> | Observable<boolean>`.

**@Public (source `security/authentication`) :** créer une métadonnée (`SetMetadata`/
`Reflector.createDecorator`) et la lire dans le Guard global :
`this.reflector.getAllAndOverride(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])` ; si vrai, le
Guard laisse passer.

**Claims / CASL (source `security/authorization`) :** l'autorisation par **claims** compare des
**permissions** plutôt que des rôles (« each resource/endpoint would define what permissions are
required »). Avec **CASL**, un `PoliciesGuard` évalue des *ability handlers*. ⚠️ Caveat DI : « we must
instantiate the policy handler in-place using the `new` keyword » → pas d'injection directe ; passer par
`ModuleRef#get`/`ModuleRef#create` si le handler a des dépendances.

**Frontières :** principes neutres → `authentication.md` / `authorization.md` ; Guard comme responsabilité
unique + ordre du cycle de requête → `nest.md` (R10 + Reference) ; specifics **Passport/JWT** (Strategy,
`validate()`, `AuthGuard('jwt')`, vérif des tokens) → `passport.md`. Ce fichier porte l'**implémentation Nest
de l'autorisation**, indépendante de Passport.

**Liens :** Guards → https://docs.nestjs.com/guards ·
Authorization → https://docs.nestjs.com/security/authorization
