---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: authorization
title: Authorization (contrôle d'accès)
discipline: authorization
kind: code
tech: []                      # agnostique : principes de contrôle d'accès valables sur tout backend.
layer: backend
phase: [implementation, review]
level: guardrail              # défaut du fichier : le contrôle d'accès est sécurité-critique.
                              # La centralisation et le choix ABAC/RBAC (design) sont "preference".
status: active
version: 1.0
sources:
  - https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
---

# Authorization (contrôle d'accès)

> **Intention :** une fois l'identité prouvée, décider « qu'as-tu le droit de faire » — par défaut **rien**,
> vérifié **à chaque requête côté serveur**, jusqu'à l'**objet précis** demandé. L'identité (« qui es-tu »)
> est traitée dans `authentication.md`.
> **Applies to :** Guards/policies, handlers de controller et services qui accèdent à une ressource identifiée.

<!-- Ce fichier INSTANCIE security.md R1 (A01 Broken Access Control) + nest.md R10 (Guards). Il les
     concrétise, ne les remplace pas. -->

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Deny by default                                                {#authorization.r1}
- **Règle :** refuser l'accès **par défaut**. Une ressource/route n'est accessible que si une autorisation l'**accorde explicitement** ; en l'absence de règle, c'est refus.
- **Pourquoi :** « For security purposes an application should be configured to deny access by default. » Un oubli de règle doit fermer l'accès, pas l'ouvrir.
- **Vérifié par :** manuel.
- **Check (review) :** aucune route sensible n'est ouverte faute de règle ; le défaut (Guard global / policy) est « refus », l'ouverture est explicite (ex. `@Public()`).
- ✅ **Bon :** Guard d'autorisation global ; chaque accès autorisé est déclaré explicitement.
- ❌ **Mauvais :** routes accessibles tant qu'on n'a pas pensé à poser un Guard dessus.

### R2 — Moindre privilège                                              {#authorization.r2}
- **Règle :** n'accorder à chaque utilisateur/rôle/service que le **minimum** de droits nécessaires à sa tâche. Pas de privilège « au cas où ».
- **Pourquoi :** « Least Privileges refers to the principle of assigning users only the minimum privileges necessary to complete their job. » Réduit la surface en cas de compte compromis.
- **Vérifié par :** manuel.
- **Check (review) :** les permissions accordées correspondent au besoin réel ; pas de rôle large par commodité, pas de droits admin par défaut.
- ✅ **Bon :** un rôle « éditeur » qui peut écrire ses contenus, pas administrer les utilisateurs.
- ❌ **Mauvais :** donner un rôle admin pour « simplifier », ou des scopes plus larges que l'usage.

### R3 — Vérifier à chaque requête, côté serveur                        {#authorization.r3}
- **Règle :** valider l'autorisation **à chaque requête**, **côté serveur** (gateway/handler), quelle que soit l'origine (AJAX, navigation, autre service). Ne **jamais** se fier à un contrôle côté client (masquage d'UI, flag dans le token non vérifié).
- **Pourquoi :** « Permission should be validated correctly on every request, regardless of whether the request was initiated by an AJAX script, server-side, or any other source » et « Access control checks must be performed server-side… rather than relying on client-side checks. » Le client est sous contrôle de l'attaquant.
- **Vérifié par :** manuel.
- **Check (review) :** chaque endpoint sensible re-vérifie l'autorisation serveur ; cacher un bouton ne tient pas lieu de contrôle.
- ✅ **Bon :** Guard/policy serveur appliqué à chaque requête protégée.
- ❌ **Mauvais :** l'API autorise l'action parce que « le front ne montre le bouton qu'aux admins ».

### R4 — Contrôler l'objet précis (anti-IDOR/BOLA)                      {#authorization.r4}
- **Règle :** vérifier l'accès à **l'objet spécifique** demandé (par son id), pas seulement le droit d'accéder au **type** d'objet ou à l'endpoint. Confirmer que l'utilisateur possède/peut accéder à *cette* ressource.
- **Pourquoi :** « Perform access control checks on *every* request for the *specific* object or functionality being accessed. Just because a user has access to an object of a particular type does not mean they should have access to every object of that particular type. » C'est la faille IDOR/BOLA, n°1 des fuites d'API.
- **Vérifié par :** manuel.
- **Check (review) :** les handlers qui prennent un id vérifient l'appartenance/le droit sur **cet** id (souvent dans le service, le Guard ne connaît pas l'objet) ; pas de `findById(id)` renvoyé sans contrôle de propriété.
- ✅ **Bon :**
  ```ts
  const order = await this.orders.findById(id);
  if (order.ownerId !== user.id) throw new ForbiddenException(); // contrôle sur l'objet précis
  ```
- ❌ **Mauvais :**
  ```ts
  // Guard "role=user" OK, mais aucun contrôle que l'order appartient à l'appelant
  return this.orders.findById(id); // IDOR : /orders/123 accède à la commande d'autrui
  ```

### R5 — Centraliser le contrôle d'accès                                {#authorization.r5}
- **Règle :** appliquer le contrôle d'accès via un **mécanisme central** configurable globalement (Guard/policy/middleware), plutôt que de redécliner la logique à la main dans chaque méthode.
- **Pourquoi :** la technologie de contrôle « should allow for global, application-wide configuration rather than needing to be applied individually to every method or class. » Centraliser évite les oublis et les divergences.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** la décision d'autorisation passe par une couche commune (Guard global + métadonnées de route) ; pas de `if (user.role === 'admin')` éparpillés et divergents.
- ✅ **Bon :** `APP_GUARD` global + décorateurs de permission par route.
- ❌ **Mauvais :** des checks de rôle copiés-collés, légèrement différents, dans chaque service.

### R6 — Préférer ABAC/ReBAC aux rôles codés en dur                     {#authorization.r6}
- **Règle :** modéliser les droits par **attributs/permissions** (ABAC) ou **relations** (ReBAC) plutôt que par des tests de **rôle codés en dur** dans la logique. Vérifier des *permissions/policies*, pas des noms de rôle.
- **Pourquoi :** « ABAC and ReBAC should typically be preferred for application development » car ils gèrent une « fine-grained, complex Boolean logic » plus robuste que le rôle figé.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** le code teste une capacité (`can('update', resource)`) plutôt qu'un rôle littéral ; les rôles ne sont qu'un moyen d'attribuer des permissions.
- ✅ **Bon :** `@RequirePermission('invoice:read')` + policy évaluée sur les attributs.
- ❌ **Mauvais :** `if (user.role === 'manager' || user.role === 'admin')` disséminé dans le métier.

### R7 — Échouer en sécurité et journaliser les refus                   {#authorization.r7}
- **Règle :** en cas d'échec ou d'exception du contrôle d'accès, **refuser** (fail-closed) et **journaliser** l'événement d'autorisation dans un format exploitable. Ne pas laisser passer « par défaut » sur erreur.
- **Pourquoi :** « Ensure all exception and failed access control checks are handled no matter how unlikely they seem » et « Log using consistent, well-defined formats that can be readily parsed for analysis. » Une erreur de contrôle ne doit jamais ouvrir l'accès, et les refus doivent être traçables.
- **Vérifié par :** manuel.
- **Check (review) :** un `try/catch` autour du contrôle ne « ouvre » pas en cas d'erreur ; les refus d'accès sont loggés (sans fuite, cf. error-handling).
- ✅ **Bon :** toute exception du contrôle → `403` + log d'événement de sécurité.
- ❌ **Mauvais :** `catch { return true; }` dans une policy, ou refus silencieux non journalisé.

## Anti-patterns
- Route accessible faute de règle (défaut ouvert) → #authorization.r1
- Rôle large « pour simplifier » / droits au cas où → #authorization.r2
- Contrôle d'accès uniquement côté client (UI masquée) → #authorization.r3
- `findById(id)` renvoyé sans vérifier la propriété de l'objet (IDOR) → #authorization.r4
- Checks de rôle copiés-collés et divergents partout → #authorization.r5
- `if (role === 'admin')` codé en dur dans le métier → #authorization.r6
- `catch { allow }` / refus non journalisé → #authorization.r7

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Authentification ≠ autorisation :** prouver l'identité (`authentication.md`) précède la décision de
droits (ce fichier). Un utilisateur authentifié n'est pas pour autant autorisé sur une ressource donnée.

**RBAC vs ABAC vs ReBAC :** RBAC attribue des droits via des **rôles** ; ABAC décide selon des **attributs**
(de l'utilisateur, de la ressource, du contexte) ; ReBAC selon des **relations** (ex. « est propriétaire
de », « est membre de l'équipe »). OWASP recommande de **préférer ABAC/ReBAC** pour leur granularité ; les
rôles restent utiles comme regroupement de permissions, pas comme test final dans le métier (R6).

**IDOR/BOLA (R4) :** distinguer l'autorisation **fonctionnelle** (a-t-il le droit d'appeler cet endpoint /
ce type d'action) de l'autorisation **sur l'objet** (a-t-il le droit sur *cet* enregistrement précis). Un
Guard couvre souvent la première ; la seconde se fait là où l'objet est chargé (service/handler). C'est la
cause racine de la majorité des fuites de données d'API.

**Instanciation Nest :** `@UseGuards`/`APP_GUARD` (global, R5), un décorateur de permission lu via
`Reflector`, un `@Public()` pour les exceptions explicites au deny-by-default (R1). Le contrôle d'objet
(R4) ne doit pas vivre dans un Guard générique mais près du chargement de la ressource.

**Frontière avec les autres disciplines :** le **garde-fou** A01 et la vue d'ensemble OWASP sont dans
`security.md R1` (que ce fichier instancie) ; le **format des logs** d'événements de sécurité relève de
`observability.md` et `security.md R9 (A09)` ; la **réponse d'erreur** (403 sans fuite) relève de
`error-handling.md`.

**Lien :** OWASP Authorization → https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
