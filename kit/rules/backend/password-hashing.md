---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: password-hashing
title: Password Hashing (stockage des identifiants)
discipline: password-hashing
kind: code
tech: []                      # agnostique : règles de stockage des mots de passe valables sur tout backend.
                              # Argon2id n'est pas une "lib au choix" mais le défaut recommandé par OWASP/RFC.
layer: backend
phase: [implementation, review]
level: guardrail              # défaut du fichier : le stockage des identifiants est sécurité-critique.
                              # Les réglages fins (pepper, repli, montée du coût) sont "preference".
status: active
version: 1.0
sources:
  - https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
  - https://www.rfc-editor.org/rfc/rfc9106
---

# Password Hashing (stockage des identifiants)

> **Intention :** un mot de passe n'est jamais récupérable depuis la base. On le transforme par une
> fonction de hachage **adaptative, à sens unique** (Argon2id par défaut), salée, idéalement poivrée, dont
> le coût se durcit dans le temps. Le hachage (sens unique) n'est **pas** du chiffrement (réversible).
> **Applies to :** code qui crée/vérifie un identifiant — service d'inscription, de connexion, de changement de mot de passe.

<!-- Ce fichier INSTANCIE security.md R4 (A04 Cryptographic Failures) pour le cas précis du stockage des
     mots de passe. Il ne remplace pas le garde-fou A04, il le concrétise. -->

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Jamais de mot de passe en clair ni chiffré réversible          {#password-hashing.r1}
- **Règle :** ne stocker qu'un **hash** du mot de passe. Jamais le mot de passe en clair, jamais un chiffrement **réversible** (le chiffrement se déchiffre — un mot de passe ne doit pas pouvoir l'être). Ne jamais le logger ni le renvoyer.
- **Pourquoi :** « Passwords should never be stored in plain text. » Une base compromise ne doit pas livrer les mots de passe. Le hachage à sens unique garantit qu'on ne peut pas remonter au secret.
- **Vérifié par :** manuel.
- **Check (review) :** aucune colonne/clé stocke le mot de passe en clair ou chiffré ; aucune trace dans logs/réponses.
- ✅ **Bon :** `user.passwordHash = await argon2.hash(plain);` puis on jette `plain`.
- ❌ **Mauvais :** `user.password = plain;` ou `encrypt(plain, key)` (réversible).

### R2 — Pas de hash rapide/général pour les mots de passe              {#password-hashing.r2}
- **Règle :** **interdire** les fonctions de hachage rapides et généralistes (MD5, SHA-1, SHA-256, SHA-512…) pour les mots de passe. Utiliser une fonction **adaptative** conçue pour ça (Argon2id, scrypt, bcrypt).
- **Pourquoi :** « Fast hashing algorithms such as SHA-256 are not suitable for password storage. » Leur rapidité même permet le brute-force massif ; une fonction adaptative impose un coût calculatoire élevé par essai.
- **Vérifié par :** manuel.
- **Check (review) :** aucun `crypto.createHash('sha256'…)` / MD5 / SHA-1 appliqué à un mot de passe ; seule une fonction adaptative est utilisée.
- ✅ **Bon :** `argon2.hash(plain)`.
- ❌ **Mauvais :** `createHash('sha256').update(plain).digest('hex')` — cassable en masse.

### R3 — Argon2id par défaut, avec des paramètres suffisants           {#password-hashing.r3}
- **Règle :** utiliser **Argon2id** par défaut. Respecter au minimum le plancher OWASP — **mémoire ≥ 19 MiB, itérations t=2, parallélisme p=1** — et viser plus haut quand la plateforme le permet (RFC 9106 : `m=2^21` ≈ 2 GiB, `t=1`, `p=4` ; ou `m=2^16` = 64 MiB, `t=3`, `p=4`).
- **Pourquoi :** OWASP : « Use Argon2id with a minimum configuration of 19 MiB of memory, an iteration count of 2, and 1 degree of parallelism. » RFC 9106 : « If you do not know the difference between the types or you consider side-channel attacks to be a viable threat, choose Argon2id. »
- **Vérifié par :** manuel.
- **Check (review) :** la variante est `argon2id` ; les paramètres `memoryCost`/`timeCost`/`parallelism` atteignent au moins le plancher OWASP.
- ✅ **Bon :**
  ```ts
  await argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB (plancher OWASP), monter si possible
    timeCost: 2,
    parallelism: 1,
  });
  ```
- ❌ **Mauvais :** `argon2.hash(plain, { type: argon2.argon2i, memoryCost: 1024 })` — mauvaise variante, mémoire trop faible.

### R4 — Repli scrypt/bcrypt encadré ; limite des 72 octets de bcrypt   {#password-hashing.r4}
- **Règle :** n'utiliser **scrypt** ou **bcrypt** que si Argon2 est indisponible ; bcrypt est réservé aux **systèmes legacy**. Avec bcrypt, **plafonner l'entrée à 72 octets** (au-delà, c'est ignoré).
- **Pourquoi :** OWASP : « bcrypt password hashing function should only be used for password storage in legacy systems where Argon2 and scrypt are not available » et « bcrypt has a maximum length input length of 72 bytes, so you should enforce a maximum password length of 72 bytes. »
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** bcrypt n'apparaît que faute d'Argon2/scrypt ; quand bcrypt est utilisé, une limite de 72 octets est imposée à l'entrée.
- ✅ **Bon :** Argon2id partout ; bcrypt seulement sur un service hérité, avec longueur bornée.
- ❌ **Mauvais :** choisir bcrypt par défaut sur un projet neuf, ou accepter un mot de passe > 72 octets sous bcrypt (fin silencieusement tronquée).

### R5 — Sel unique par mot de passe, géré par la fonction             {#password-hashing.r5}
- **Règle :** chaque mot de passe a un **sel unique**. Laisser la fonction adaptative moderne le générer et l'encoder dans le hash ; ne pas réimplémenter le salage ni partager un sel global.
- **Pourquoi :** « Modern functions automatically handle salting. » Le sel unique empêche les rainbow tables et fait que deux mots de passe identiques produisent des hash différents.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** pas de sel codé en dur ni partagé ; on s'appuie sur le sel intégré de la fonction (présent dans la chaîne de hash stockée).
- ✅ **Bon :** stocker la chaîne complète renvoyée par `argon2.hash` (elle contient le sel).
- ❌ **Mauvais :** `sha256(salt_global + plain)` avec un sel unique pour toute l'app.

### R6 — Poivre (pepper) stocké séparément de la base                  {#password-hashing.r6}
- **Règle :** en défense supplémentaire, ajouter un **poivre** (secret applicatif) **stocké hors de la base** (variable d'env/secret manager/HSM), distinct du sel.
- **Pourquoi :** « peppering is a class of strategies that can be used in addition to salting to provide an additional layer of protection » et il doit être « stored separately from the database. » Si seule la base fuit, les hash restent protégés par un secret que l'attaquant n'a pas.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** si un pepper est utilisé, il vient de la config/secret (cf. `configuration.md`), jamais du dépôt ni de la même base que les hash.
- ✅ **Bon :** pepper injecté via secret manager, combiné avant le hachage.
- ❌ **Mauvais :** pepper en dur dans le code, ou stocké dans la même table que les hash.

### R7 — Monter le facteur de coût dans le temps                       {#password-hashing.r7}
- **Règle :** prévoir d'**augmenter** les paramètres de coût à mesure que le matériel progresse, et **re-hasher** le mot de passe lors d'une connexion réussie quand les paramètres stockés sont en dessous de la cible courante.
- **Pourquoi :** « a key advantage of having a work factor is that it can be increased over time as hardware becomes more powerful and cheaper. » Un hash figé à des paramètres de 2015 devient faible.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** un mécanisme détecte les hash sous-paramétrés (`argon2.needsRehash`/équivalent) et re-hashe au login ; les paramètres cibles sont centralisés.
- ✅ **Bon :** au login, si `needsRehash(hash, options)` → re-hasher avec les paramètres courants.
- ❌ **Mauvais :** paramètres choisis une fois et jamais revus, sans chemin de migration.

## Anti-patterns
- Mot de passe en clair ou chiffré réversible en base / dans les logs → #password-hashing.r1
- MD5/SHA-1/SHA-256 appliqué à un mot de passe → #password-hashing.r2
- Mauvaise variante Argon ou mémoire/itérations sous le plancher OWASP → #password-hashing.r3
- bcrypt par défaut sur projet neuf, ou entrée > 72 octets non bornée → #password-hashing.r4
- Sel global/codé en dur au lieu d'un sel unique par mot de passe → #password-hashing.r5
- Pepper dans le dépôt ou dans la même base que les hash → #password-hashing.r6
- Facteur de coût figé, aucun re-hash au login → #password-hashing.r7

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Hachage ≠ chiffrement :** un mot de passe se **hache** (transformation à sens unique, non réversible) ;
il ne se **chiffre** pas (réversible) ni ne se stocke en clair (R1). Le chiffrement réversible (TLS,
données au repos) relève de `security.md R4 (A04)`, pas de ce fichier.

**Jeux de paramètres Argon2id (OWASP, équivalents — un coût mémoire plus bas demande plus d'itérations) :**
- `m=47104` (46 MiB), `t=1`, `p=1`
- `m=19456` (19 MiB), `t=2`, `p=1`  ← plancher cité en R3
- `m=12288` (12 MiB), `t=3`, `p=1`
- `m=9216` (9 MiB), `t=4`, `p=1`
- `m=7168` (7 MiB), `t=5`, `p=1`

**Cibles RFC 9106 (plus fortes, si la plateforme le permet) :**
- *First recommended* : Argon2id, `t=1`, `p=4`, `m=2^21` (2 GiB), sel 128 bits, tag 256 bits.
- *Second recommended* : Argon2id, `t=3`, `p=4`, `m=2^16` (64 MiB), sel 128 bits, tag 256 bits.

**bcrypt — pré-hachage et password shucking :** pré-hacher pour contourner la limite des 72 octets est
« dangerous because of null bytes in the hash output value and because of password shucking ». Si c'est
indispensable, OWASP donne la forme : `bcrypt(base64(hmac-sha384(data:$password, key:$pepper)))`.

**Poivre (pepper) :** secret partagé par toute l'application, **distinct du sel** (qui est par mot de
passe) et conservé hors de la base. Le gérer comme un secret de config (`configuration.md R4`) avec une
stratégie de rotation.

**Frontière avec les autres disciplines :** la **politique de mot de passe** (longueur min, MFA,
anti-bruteforce, verrouillage) relève de `authentication.md` ; le **garde-fou crypto général** (chiffrement
en transit/au repos, primitives) relève de `security.md R4 (A04)` que ce fichier instancie ; la **gestion
du pepper** s'appuie sur `configuration.md`.

**Liens :** OWASP Password Storage → https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html ·
RFC 9106 (Argon2) → https://www.rfc-editor.org/rfc/rfc9106
