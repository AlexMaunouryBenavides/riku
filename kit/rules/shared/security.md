---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: security
title: Security (OWASP Top 10:2025)
discipline: security
kind: code
tech: [] # agnostique : risques applicatifs valables quelle que soit la stack.
layer: shared
phase: [design, implementation, review]
level: guardrail # défaut du fichier : la sécurité est non négociable. Tout est guardrail.
status: active
version: 1.0
sources:
  - https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/
  - https://owasp.org/Top10/2025/A02_2025-Security_Misconfiguration/
  - https://owasp.org/Top10/2025/A03_2025-Software_Supply_Chain_Failures/
  - https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/
  - https://owasp.org/Top10/2025/A05_2025-Injection/
  - https://owasp.org/Top10/2025/A06_2025-Insecure_Design/
  - https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/
  - https://owasp.org/Top10/2025/A08_2025-Software_or_Data_Integrity_Failures/
  - https://owasp.org/Top10/2025/A09_2025-Security_Logging_and_Alerting_Failures/
  - https://owasp.org/Top10/2025/A10_2025-Mishandling_of_Exceptional_Conditions/
  - https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
---

# Security (OWASP Top 10:2025)

> **Intention :** couvrir les dix risques applicatifs les plus critiques (OWASP Top 10:2025) sous forme de
> garde-fous actionnables. Pour les risques **possédés par un autre fichier** du kit (injection, secrets,
> conteneur, _comment_ logger, _comment_ gérer une erreur), on énonce l'exigence de sécurité et on
> **délègue** au fichier propriétaire — jamais de duplication.
> **Applies to :** transverse. En particulier `**/*.{ts,js}`, `**/*.controller.ts`, `**/*.guard.ts`,
> `**/*auth*.{ts,js}`, `**/package.json` (dépendances), et tout point d'authentification, d'autorisation,
> de cryptographie ou de gestion d'erreur.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — A01 Broken Access Control : deny-by-default, centralisé, côté serveur {#security.r1}

- **Règle :** refuser l'accès par défaut (sauf ressources publiques) ; implémenter le contrôle d'accès **une seule fois** et le réutiliser dans toute l'application ; faire respecter la **propriété des enregistrements** (un utilisateur n'agit que sur ses propres données) ; logger les échecs de contrôle d'accès et limiter le débit des API.
- **Pourquoi :** OWASP A01:2025 — « Except for public resources, deny by default » ; « Implement access control mechanisms once and reuse them throughout the application » ; le modèle « should enforce record ownership rather than allowing users to create, read, update, or delete any record » ; « Log access control failures, alert admins when appropriate ».
- **Vérifié par :** manuel (revue) + tests d'accès en unitaire/intégration.
- **Check (review) :** autorisation décidée **côté serveur** de confiance, centralisée et deny-by-default ; vérification de propriété sur chaque accès à une ressource identifiée ; aucune décision d'accès laissée au client.
- ✅ **Bon :**
  ```ts
  // contrôle côté serveur + propriété de l'enregistrement
  const order = await orders.findById(id);
  if (order.ownerId !== currentUser.id) throw new ForbiddenError();
  ```
- ❌ **Mauvais :**
  ```ts
  // IDOR : on sert la ressource sur simple id fourni, sans vérifier le propriétaire
  return orders.findById(req.params.id);
  ```

### R2 — A02 Security Misconfiguration : durcissement répétable, surface minimale {#security.r2}

- **Règle :** appliquer un **processus de durcissement répétable** ; déployer une **plateforme minimale** (pas de fonctionnalités, comptes, échantillons ni docs inutiles) ; **envoyer les en-têtes de sécurité** au client ; ne **pas** embarquer de clés/secrets statiques dans le code, la config ou les pipelines — préférer identités fédérées, credentials à durée de vie courte ou RBAC de la plateforme.
- **Pourquoi :** OWASP A02:2025 — « A repeatable hardening process… » ; « A minimal platform without any unnecessary features, components, documentation, or samples » ; « Sending security directives to clients, e.g., Security Headers » ; « Use identity federation, short-lived credentials, or role-based access mechanisms… instead of embedding static keys or secrets in code, configuration files, or pipelines ».
- **Vérifié par :** manuel + processus automatisé de vérification de configuration en CI.
- **Check (review) :** en-têtes de sécurité présents ; pas de défauts/comptes/fonctions inutiles exposés ; pas de clé statique en dur. _(Durcissement de l'image/conteneur → `docker.md` ; chargement/validation de la config et `.env` → `configuration.md`.)_

### R3 — A03 Software Supply Chain Failures : sources de confiance + SCA continue {#security.r3}

- **Règle :** n'obtenir les composants que depuis des **sources officielles de confiance** via liens sûrs, en préférant les **paquets signés** ; **inventorier en continu** les dépendances directes **et transitives** (outils SCA) et surveiller les vulnérabilités (CVE/NVD/OSV) ; générer/gérer un **SBOM** ; retirer les dépendances inutilisées ; **choisir délibérément** les versions et ne mettre à jour qu'en cas de besoin.
- **Pourquoi :** OWASP A03:2025 — « Only obtain components from official (trusted) sources over secure links. Prefer signed packages… » ; « Track not just your direct dependencies, but their (transitive) dependencies… » ; « Centrally generate and manage the Software Bill of Materials (SBOM)… » ; « Deliberately choose which version of a dependency you use and upgrade only when there is need ».
- **Vérifié par :** SCA en CI (p. ex. OWASP Dependency-Track / Dependency-Check / retire.js) + manuel.
- **Check (review) :** SCA actif sur direct + transitif ; SBOM généré ; sources de confiance/signées ; pas de dépendance inutilisée.

### R4 — A04 Cryptographic Failures : chiffrer en transit & au repos, primitives fortes {#security.r4}

- **Règle :** **classer** les données sensibles ; **chiffrer en transit** (TLS ≥ 1.2 uniquement, ciphers à forward secrecy) **et au repos** ; utiliser des algorithmes/protocoles **forts et à jour** avec une gestion de clés appropriée (clés les plus sensibles en HSM) ; **chiffrement authentifié** ; **éviter** les primitives dépréciées (MD5, SHA-1, mode CBC, PKCS#1 v1.5) ; stocker les **mots de passe** avec un hash **adaptatif et salé** — **Argon2id** recommandé (sinon scrypt, bcrypt, ou PBKDF2), **jamais** un hash rapide (SHA-256) pour un mot de passe.
- **Pourquoi :** OWASP A04:2025 — « Encrypt all data in transit with protocols >= TLS 1.2 only, with forward secrecy ciphers » ; « encrypt all sensitive data at rest » ; « Always use authenticated encryption… » ; « Avoid deprecated cryptographic functions… such as MD5, SHA1, CBC mode, PKCS number 1 v1.5 » ; « Store passwords using strong adaptive and salted hashing functions ». _Password Storage Cheat Sheet_ : Argon2id recommandé (p. ex. `m=19456, t=2, p=1`), « A unique salt must be added to each password » ; « Fast hashing algorithms such as SHA-256 are not suitable for password storage ».
- **Vérifié par :** manuel + grep CI sur les primitives faibles (`md5`, `sha1`, hash direct de mot de passe).
- **Check (review) :** TLS ≥ 1.2 ; données sensibles chiffrées au repos ; mots de passe en Argon2id/scrypt/bcrypt/PBKDF2 **salés** ; aucune primitive dépréciée.
- ✅ **Bon :**
  ```ts
  const hash = await argon2.hash(password, { type: argon2.argon2id }); // adaptatif + salé
  ```
- ❌ **Mauvais :**
  ```ts
  const hash = sha256(password); // hash rapide, non salé → cassable en masse
  ```

### R5 — A05 Injection : séparer données et commandes (requêtes paramétrées) {#security.r5}

- **Règle :** garder les **données séparées** des commandes/requêtes : privilégier une **API sûre / requête paramétrée / ORM** ; appliquer une **validation positive côté serveur** ; pour toute requête dynamique résiduelle, **échapper** les caractères spéciaux avec la syntaxe propre à l'interpréteur.
- **Pourquoi :** OWASP A05:2025 — « The preferred option is to use a safe API, which avoids using the interpreter entirely, provides a parameterized interface, or migrates to Object Relational Mapping Tools (ORMs) » ; « Use positive server-side input validation » ; « escape special characters using the specific escape syntax for that interpreter ». _(La validation des entrées HTTP — DTO, ValidationPipe — est détaillée dans `validation.md`.)_
- **Vérifié par :** manuel + grep CI sur la concaténation de chaînes dans des requêtes.
- **Check (review) :** requêtes paramétrées partout ; aucune concaténation de variable dans une requête ; validation serveur présente.
- ✅ **Bon :**
  ```ts
  db.query('SELECT * FROM users WHERE email = $1', [email]); // paramétré
  ```
- ❌ **Mauvais :**
  ```ts
  db.query(`SELECT * FROM users WHERE email = '${email}'`); // injection SQL
  ```

### R6 — A06 Insecure Design : threat modeling & sécurité dès la conception {#security.r6}

- **Règle :** pratiquer le **threat modeling** sur les parties critiques (authentification, contrôle d'accès, logique métier, flux clés) ; s'appuyer sur une **bibliothèque de patterns de conception sûrs** / composants « paved-road » ; **intégrer les exigences de sécurité dans les user stories** ; écrire des tests couvrant **cas d'usage ET de mésusage** ; **ségréguer** les tiers et les tenants.
- **Pourquoi :** OWASP A06:2025 — « Use threat modeling for critical parts of the application such as authentication, access control, business logic, and key flows » ; « Establish and use a library of secure design patterns or paved-road components » ; « Integrate security language and controls into user stories » ; « Compile use-cases _and_ misuse-cases for each tier… » ; « Segregate tenants robustly by design throughout all tiers ».
- **Vérifié par :** manuel (revue de conception).
- **Check (review) :** flux critiques threat-modelés ; misuse-cases testés ; séparation des tiers/tenants assurée par conception.

### R7 — A07 Authentication Failures : MFA, anti-bruteforce, sessions sûres {#security.r7}

- **Règle :** **imposer la MFA** ; **aucun credential par défaut** (surtout admin) ; tester les mots de passe contre les listes des pires/compromis (p. ex. haveibeenpwned) et aligner les politiques sur **NIST 800-63b** ; **limiter ou retarder** les tentatives échouées (sans créer de DoS) ; durcir contre l'**énumération de comptes** (mêmes messages quel que soit le résultat) ; gestionnaire de **session côté serveur** régénérant un **ID aléatoire à haute entropie après login** ; pour les JWT, valider `aud`, `iss` et les scopes.
- **Pourquoi :** OWASP A07:2025 — « implement and enforce use of multi-factor authentication… » ; « Do not ship or deploy with any default credentials… » ; « validate against lists of known breached credentials… » ; « Limit or increasingly delay failed login attempts but be careful not to create a denial of service scenario » ; « generates a new random session ID with high entropy after login » ; « for JWTs validate `aud`, `iss` claims and scopes ».
- **Vérifié par :** manuel.
- **Check (review) :** MFA disponible/forcée ; pas de credential par défaut ; rate-limit sur le login ; session régénérée après login ; claims JWT validés.

### R8 — A08 Software or Data Integrity Failures : vérifier provenance & intégrité {#security.r8}

- **Règle :** vérifier que logiciel et données proviennent de la **source attendue** et n'ont **pas été altérés** (signatures numériques) ; ne consommer que des **dépôts de confiance** ; **revoir** les changements de code et de configuration ; garantir un **pipeline CI/CD ségrégué** et à accès contrôlé ; ne **jamais** recevoir puis utiliser des **données sérialisées non signées/non chiffrées** depuis des clients non fiables sans contrôle d'intégrité.
- **Pourquoi :** OWASP A08:2025 — « Use digital signatures or similar mechanisms to verify the software or data is from the expected source and has not been altered » ; « only consuming trusted repositories » ; « your CI/CD pipeline has proper segregation, configuration, and access control… » ; « unsigned or unencrypted serialized data is not received from untrusted clients… without some form of integrity check ».
- **Vérifié par :** manuel + contrôle d'intégrité (signatures) en CI.
- **Check (review) :** artefacts/dépendances vérifiés par signature ; pas de désérialisation de données non fiables ; pipeline contrôlé et revu.

### R9 — A09 Security Logging & Alerting Failures : journaliser & alerter les événements de sécurité {#security.r9}

- **Règle :** journaliser **tous** les événements de sécurité avec un **contexte utilisateur** suffisant — succès **et** échecs des connexions, des contrôles d'accès et des validations d'entrée côté serveur, ainsi que les transactions à forte valeur ; garantir une **piste d'audit** avec contrôles d'intégrité (anti-altération) ; **alerter** sur activité suspecte ; disposer d'un **plan de réponse à incident** (p. ex. NIST 800-61).
- **Pourquoi :** OWASP A09:2025 — « Ensure all login, access control, and server-side input validation failures can be logged with sufficient user context… » ; « every part of your app that contains a security control is logged, whether it succeeds or fails » ; « all transactions have an audit trail with integrity controls… » ; « establish effective monitoring and alerting… ». _(Le **comment** journaliser — format structuré, niveaux, et **ne pas** logger de secrets/PII — est dans `observability.md`.)_
- **Vérifié par :** manuel.
- **Check (review) :** événements de sécurité (login/accès/validation, succès+échec) loggés avec contexte ; piste d'audit intègre ; alerting défini. _(Interdiction de logger secrets/PII = #observability.r4.)_

### R10 — A10 Mishandling of Exceptional Conditions : fail-closed, sans fuite d'info {#security.r10}

- **Règle :** **échouer de façon sûre (fail-closed)** — annuler (rollback) l'intégralité de la transaction plutôt que tenter une récupération partielle ; ne **jamais** exposer à l'utilisateur les détails système, erreurs de base de données ou stack traces ; **centraliser** la gestion d'erreur (« one place, the same way each time ») avec un **gestionnaire global** pour les exceptions non gérées ; appliquer **rate limiting / quotas / throttling** contre l'épuisement de ressources.
- **Pourquoi :** OWASP A10:2025 — « roll back every part of the transaction and start again » ; éviter d'exposer « the full system error to the user » qui permet la reconnaissance ; gestion d'erreur en « one place, the same way each time » ; « rate limiting, resource quotas, throttling ». _(Le **comment** gérer/typer les erreurs — try/catch, types — est dans `error-handling.md`.)_
- **Vérifié par :** manuel.
- **Check (review) :** réponses d'erreur sans détails internes ; comportement fail-closed sur les chemins d'erreur ; handler global présent ; quotas/rate limit en place.
- ✅ **Bon :**
  ```ts
  catch (err) {
    logger.error('checkout failed', { type: err.name, message: err.message }); // détail côté serveur
    return res.status(500).json({ error: 'Internal error' });                   // message générique au client
  }
  ```
- ❌ **Mauvais :**
  ```ts
  catch (err) {
    return res.status(500).json({ error: err.stack }); // fuite de stack trace → reconnaissance
  }
  ```

## Anti-patterns

- Autorisation décidée côté client / accès à une ressource sans vérifier le propriétaire (IDOR) → #security.r1
- En-têtes de sécurité absents, comptes/défauts inutiles exposés, clé statique en dur → #security.r2
- Dépendance d'une source non fiable / pas de SCA / transitives non suivies → #security.r3
- TLS < 1.2, donnée sensible en clair au repos, mot de passe en hash rapide non salé, MD5/SHA-1/CBC → #security.r4
- Requête construite par concaténation de variables → #security.r5
- Flux critique conçu sans threat modeling / pas de misuse-cases → #security.r6
- Credential par défaut, pas de MFA, pas de rate-limit login, session non régénérée → #security.r7
- Artefact/dépendance non vérifié, désérialisation de données non fiables, pipeline non contrôlé → #security.r8
- Échec de sécurité non loggé / pas de piste d'audit / pas d'alerting → #security.r9
- Stack trace ou erreur BDD renvoyée au client, pas de fail-closed → #security.r10

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Édition.** Ce fichier suit **OWASP Top 10:2025** (8ᵉ édition). Changements notables vs 2021 : A02
Security Misconfiguration monte au #2 ; A03 _Software Supply Chain Failures_ élargit l'ancien
« Vulnerable and Outdated Components » ; A10 _Mishandling of Exceptional Conditions_ est une **nouvelle**
catégorie.

**Hash de mot de passe (Password Storage Cheat Sheet).** Argon2id recommandé ; jeux de paramètres
équivalents en sécurité, p. ex. `m=47104 (46 MiB), t=1, p=1` ou `m=19456 (19 MiB), t=2, p=1`. Repli :
scrypt, puis bcrypt (systèmes legacy), ou PBKDF2 (si conformité FIPS-140). Sel unique par mot de passe
obligatoire. Les hash rapides (SHA-256…) sont **inadaptés** au stockage de mots de passe.

**Délégations (ne pas dupliquer ici) :**

- validation des entrées HTTP (DTO, ValidationPipe) → `rules/backend/validation.md` (détaille A05) ;
- chargement/validation de la config, `.env`, `.env.example`, accès typé → `rules/shared/configuration.md` ;
- durcissement de l'image/conteneur, non-inclusion des `.env` dans l'image → `rules/infra/docker.md` ;
- **comment** journaliser (format structuré, niveaux) et **ne pas** logger secrets/PII → `rules/shared/observability.md` (R9 ci-dessus dit _quoi_ logger) ;
- **comment** gérer/typer/propager une erreur (try-catch, types) → `rules/backend/error-handling.md` (R10 dit l'angle _sécurité_ : fail-closed, pas de fuite).

**Pour aller plus loin (OWASP Cheat Sheet Series, par titre) :** Authorization · Authentication ·
Session Management · Cryptographic Storage · Transport Layer Security · Injection Prevention ·
Threat Modeling · Deserialization · Error Handling.

**Liens (vérifiés) :**
A01 → https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/ ·
A02 → https://owasp.org/Top10/2025/A02_2025-Security_Misconfiguration/ ·
A03 → https://owasp.org/Top10/2025/A03_2025-Software_Supply_Chain_Failures/ ·
A04 → https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/ ·
A05 → https://owasp.org/Top10/2025/A05_2025-Injection/ ·
A06 → https://owasp.org/Top10/2025/A06_2025-Insecure_Design/ ·
A07 → https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/ ·
A08 → https://owasp.org/Top10/2025/A08_2025-Software_or_Data_Integrity_Failures/ ·
A09 → https://owasp.org/Top10/2025/A09_2025-Security_Logging_and_Alerting_Failures/ ·
A10 → https://owasp.org/Top10/2025/A10_2025-Mishandling_of_Exceptional_Conditions/ ·
Password Storage → https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
