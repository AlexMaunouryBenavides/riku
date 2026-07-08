---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: passport
title: Passport (NestJS) & JWT
discipline: authentication
kind: code
tech: [nestjs, passport]      # ne s'active que sur un projet NestJS + Passport.
layer: backend
phase: [implementation, review]
level: preference             # défaut du fichier ; les règles JWT de sécurité (r3, r4, r6) sont guardrail.
status: active
version: 1.0
sources:
  - https://docs.nestjs.com/recipes/passport
  - https://docs.nestjs.com/security/authentication
  - https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html
---

# Passport (NestJS) & JWT

> **Intention :** instancier l'authentification (`authentication.md`) avec NestJS + Passport — une Strategy
> par méthode, des routes protégées par `AuthGuard`, et des JWT dont on **vérifie la signature, l'algorithme
> et l'expiration**, sans secret dans le payload. Le **câblage des Guards** (deny-by-default, ordre, RBAC)
> est dans `nest-authz.md` ; ici on ne porte que le specific **Passport + JWT**.
> **Applies to :** `**/*.strategy.ts`, modules d'auth (`JwtModule`, `PassportModule`), handlers protégés par une Strategy.

<!-- Ce fichier INSTANCIE authentication.md (flux/login) pour NestJS+Passport et ajoute les specifics JWT
     sourcés OWASP. Le contrôle d'accès Nest générique (Guards/RBAC) vit dans nest-authz.md. -->

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Une Strategy par méthode, logique dans validate()             {#passport.r1}
- **Règle :** implémenter chaque méthode d'auth via une classe **étendant `PassportStrategy`**. Mettre la vérification dans **`validate()`** : son retour est attaché à `req.user`, et lever `UnauthorizedException` en cas d'échec.
- **Pourquoi :** « Passport will call the verify function… and the return value is attached to the `Request` object as `req.user`. » C'est le point d'extension prévu ; y centraliser la vérif évite de la disperser dans les controllers.
- **Vérifié par :** manuel.
- **Check (review) :** la vérif vit dans `validate()` (pas dans le controller) ; un échec lève `UnauthorizedException` ; `validate()` ne renvoie que ce qui doit peupler `req.user`.
- ✅ **Bon :**
  ```ts
  export class LocalStrategy extends PassportStrategy(Strategy) {
    async validate(username: string, password: string) {
      const user = await this.authService.validateUser(username, password);
      if (!user) throw new UnauthorizedException();
      return user; // → req.user
    }
  }
  ```
- ❌ **Mauvais :** vérifier les identifiants à la main dans le handler du controller, hors Strategy.

### R2 — Protéger les routes via AuthGuard de la Strategy              {#passport.r2}
- **Règle :** protéger les routes avec **`AuthGuard('jwt'|'local')`** (le nom correspond à la Strategy). Encapsuler dans un Guard réutilisable (`class JwtAuthGuard extends AuthGuard('jwt')`) quand on en a besoin ailleurs. Le **deny-by-default** (Guard global `APP_GUARD` + `@Public()`) et l'ordre des Guards sont traités dans `nest-authz.md` (`#nest-authz.r1`, `#nest-authz.r2`).
- **Pourquoi :** NestJS protège une route via « `@UseGuards(AuthGuard('jwt'))` » ; le `AuthGuard` déclenche la Strategy Passport correspondante (qui peuple `req.user`). Réutiliser via une sous-classe évite de répéter la chaîne.
- **Vérifié par :** manuel.
- **Check (review) :** les routes authentifiées utilisent `AuthGuard('<strategy>')` ; le deny-by-default global est bien posé (cf. `nest-authz.md`).
- ✅ **Bon :** `@UseGuards(AuthGuard('jwt'))` ; ou `class JwtAuthGuard extends AuthGuard('jwt') {}` réutilisé.
- ❌ **Mauvais :** réécrire l'extraction/validation du token dans le handler au lieu d'`AuthGuard`.

### R3 — JWT : vérifier la signature et épingler l'algorithme           {#passport.r3}
- **Règle :** valider la **signature** du JWT et **épingler l'algorithme attendu** côté vérification. Rejeter `alg: none` et les confusions d'algorithme (ex. HS/RS).
- **Pourquoi :** OWASP : « During token validation, explicitly request that the expected algorithm was used » — sinon l'attaque `none` (« attackers indicate token integrity is pre-verified ») contourne la signature.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** la config de vérification fixe `algorithms: ['<attendu>']` ; aucune acceptation implicite de `none` ; clé de vérif cohérente avec l'algo.
- ✅ **Bon :** `super({ ..., algorithms: ['RS256'], secretOrKey: publicKey })`.
- ❌ **Mauvais :** vérifier sans contraindre `algorithms` → `none`/confusion possible.

### R4 — JWT : valider les claims, expiration en tête                   {#passport.r4}
- **Règle :** valider les **claims standard** — surtout l'**expiration** (`ignoreExpiration: false`) — et, quand c'est pertinent, l'**émetteur**/**audience** (`iss`/`aud`).
- **Pourquoi :** NestJS configure la JwtStrategy avec « validating expiration (`ignoreExpiration: false`) » ; OWASP recommande de valider `exp` et l'`issuer` (`withIssuer()`) avant d'accepter un token.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** `ignoreExpiration` n'est jamais `true` ; `iss`/`aud` vérifiés si l'architecture les utilise.
- ✅ **Bon :**
  ```ts
  super({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    ignoreExpiration: false,
    secretOrKey: jwtConstants.secret,
  });
  ```
- ❌ **Mauvais :** `ignoreExpiration: true` → des tokens expirés restent acceptés.

### R5 — JWT : durée de vie courte                                      {#passport.r5}
- **Règle :** émettre des access tokens **à courte durée de vie** (ex. ~15 min) ; gérer la continuité via un refresh token séparé plutôt que d'allonger l'access token.
- **Pourquoi :** OWASP montre « Create the token with a validity of 15 minutes. » Un token court limite la fenêtre d'exploitation d'un token volé.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** `expiresIn` est court ; pas de token de plusieurs jours utilisé comme access token.
- ✅ **Bon :** `signOptions: { expiresIn: '15m' }` + refresh token dédié.
- ❌ **Mauvais :** `expiresIn: '30d'` sur l'access token.

### R6 — JWT : aucune donnée sensible dans le payload                   {#passport.r6}
- **Règle :** ne mettre **aucune donnée sensible** dans le payload du JWT (mots de passe, secrets, PII non nécessaire). Le payload est **lisible**.
- **Pourquoi :** « The contents of JWTs are base64 encoded, but is not encrypted by default » — un JWT signé n'est **pas** chiffré, quiconque le possède lit son contenu.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** le payload ne contient que des identifiants/claims non sensibles (`sub`, rôles, `exp`…) ; rien qui fuiterait s'il était décodé.
- ✅ **Bon :** `{ sub: user.id, username }`.
- ❌ **Mauvais :** placer un mot de passe, un secret ou des données personnelles inutiles dans le payload.

### R7 — JWT : révocation par denylist stable                          {#passport.r7}
- **Règle :** pour invalider un token avant son expiration (logout, compromission), tenir une **denylist** keyée sur des claims **stables** — `jti` (+ `iss`) — **jamais** sur le JWT brut ni un hash du token.
- **Pourquoi :** OWASP : « Do not use the raw JWT or a hash of it as the denylist key… the denylist must be keyed on a value that is stable across these malleable encodings », via `jti` et `iss`.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** s'il existe une révocation, sa clé est `jti`(+`iss`) ; le logout invalide effectivement le token côté serveur (cf. `#authentication.r11`).
- ✅ **Bon :** émettre un `jti` unique, denylister `jti` au logout, vérifier la denylist à chaque requête.
- ❌ **Mauvais :** stocker le JWT entier comme clé de denylist (encodages malléables → contournable).

## Anti-patterns
- Vérification d'identifiants dans le controller au lieu de `validate()` → #passport.r1
- Validation du token recodée dans le handler au lieu d'`AuthGuard('<strategy>')` → #passport.r2
- Vérification JWT sans `algorithms` épinglé (`none`/confusion) → #passport.r3
- `ignoreExpiration: true` / claims non validés → #passport.r4
- Access token longue durée → #passport.r5
- Donnée sensible dans le payload JWT → #passport.r6
- Denylist keyée sur le JWT brut/son hash → #passport.r7

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Paquets (NestJS) :** « For **any** Passport strategy you choose, you'll always need the `@nestjs/passport`
and `passport` packages. Then… the strategy-specific package » (`passport-local`, `passport-jwt`, …). Pour
le JWT : `@nestjs/jwt` + `passport-jwt`.

**Guard réutilisable (Passport) :**
```ts
@Injectable() export class JwtAuthGuard extends AuthGuard('jwt') {}
```
Le **binding global** (`APP_GUARD`), le **deny-by-default** + `@Public()`, l'**ordre** des Guards et le
**RBAC** (`@Roles`/`RolesGuard`/Reflector, claims, CASL) ne sont **pas** ici : ils sont keyés `nestjs`
(indépendants de Passport) dans `nest-authz.md` (`#nest-authz.r1`–`#nest-authz.r6`). Un `JwtAuthGuard`
Passport peut être enregistré comme Guard global d'authentification au sens de `#nest-authz.r1`.

**Stockage du token côté client (OWASP) :** « Store tokens in `sessionStorage` or private closures, not
automatically-sent cookies or persistent `localStorage` » pour limiter l'exposition au XSS. C'est une
responsabilité **front** — voir `#data-fetching.r6` (ne pas exposer de secret côté client).

**Frontière avec les autres disciplines :** les principes neutres (messages génériques, anti-bruteforce,
MFA, session) sont dans `authentication.md` ; les principes neutres d'autorisation (deny-by-default, objet
précis, ABAC) dans `authorization.md` ; leur **câblage Nest** (Guards globaux, ordre, RBAC `@Roles`/CASL)
dans `nest-authz.md` ; le **stockage** des mots de passe dans `password-hashing.md` ; le **secret JWT** est
géré comme un secret de config (`configuration.md`). Ce fichier ne porte que l'instanciation **Passport +
JWT** (Strategy, `validate()`, `AuthGuard`, vérification des tokens).

**Liens :** Passport (NestJS) → https://docs.nestjs.com/recipes/passport ·
Authentication → https://docs.nestjs.com/security/authentication ·
Authorization → https://docs.nestjs.com/security/authorization ·
OWASP JWT → https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html
