---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: authentication
title: Authentication (login & session)
discipline: authentication
kind: code
tech: []                      # agnostique : flux de connexion + gestion de session valables sur tout backend.
layer: backend
phase: [implementation, review]
level: guardrail              # défaut du fichier : l'authentification est sécurité-critique.
                              # Politique de mot de passe, MFA et timeouts (contextuels) sont "preference".
status: active
version: 1.0
sources:
  - https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
  - https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
  - https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html
---

# Authentication (login & session)

> **Intention :** prouver « qui es-tu » sans fuiter d'information, résister au brute-force, et maintenir
> l'état authentifié par une session imprévisible, régénérée et expirable. Le *stockage* des identifiants
> est traité dans `password-hashing.md` ; les *droits* dans `authorization.md`.
> **Applies to :** services de connexion/inscription/déconnexion, configuration de session/cookies, garde d'authentification.

<!-- Ce fichier INSTANCIE security.md R7 (A07 Authentication Failures). Il le concrétise, ne le remplace pas. -->

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Message d'erreur générique au login                           {#authentication.r1}
- **Règle :** en cas d'échec de connexion, renvoyer **un seul message générique**, identique que l'identifiant existe ou non, que ce soit le login ou le mot de passe qui soit faux. Idem pour « mot de passe oublié » et l'inscription.
- **Pourquoi :** « An application must respond with a generic error message regardless of whether the user ID or password was incorrect. » Sinon l'attaquant énumère les comptes valides.
- **Vérifié par :** manuel.
- **Check (review) :** aucun chemin ne distingue « utilisateur inconnu » de « mot de passe invalide » (message, code HTTP, timing grossier).
- ✅ **Bon :** `throw new UnauthorizedException('Invalid credentials')` dans les deux cas.
- ❌ **Mauvais :** `'No account for this email'` vs `'Wrong password'` — révèle l'existence du compte.

### R2 — Anti brute-force : verrouillage par compte + délais            {#authentication.r2}
- **Règle :** limiter les tentatives de connexion. Associer le compteur d'échecs **au compte** (pas seulement à l'IP) et appliquer un **verrouillage** et/ou des **délais exponentiels** croissants.
- **Pourquoi :** « The counter of failed logins should be associated with the account itself, rather than the source IP address. » et « exponential lockout, where the lockout duration… doubles after each failed login attempt. » Bloque le credential stuffing et le password spraying distribués.
- **Vérifié par :** manuel.
- **Check (review) :** un mécanisme borne les essais par compte ; pas de tentatives illimitées ; le déblocage est sûr.
- ✅ **Bon :** compteur d'échecs par compte + délai doublant (1s, 2s, 4s…) / verrouillage temporaire.
- ❌ **Mauvais :** endpoint de login sans aucune limite, ou limite uniquement par IP.

### R3 — Identifiants uniquement sur TLS                               {#authentication.r3}
- **Règle :** la page/endpoint de login **et** toutes les pages authentifiées ne sont accessibles que via **TLS/HTTPS**. Jamais d'identifiant transmis en clair.
- **Pourquoi :** « The login page and all subsequent authenticated pages must be exclusively accessed over TLS or other strong transport. » En clair, l'identifiant est interceptable.
- **Vérifié par :** manuel.
- **Check (review) :** pas d'authentification servie en HTTP ; redirection/HSTS en place ; cookies de session en `Secure` (cf. R9).
- ✅ **Bon :** tout le trafic authentifié en HTTPS, HSTS activé.
- ❌ **Mauvais :** formulaire de login accessible en `http://`.

### R4 — Vérifier le mot de passe en temps constant                    {#authentication.r4}
- **Règle :** comparer le mot de passe fourni au hash stocké via la **fonction de vérification dédiée** du langage/framework, qui s'exécute en **temps constant**. Ne jamais comparer des hash avec `==`/`===`.
- **Pourquoi :** « the user-supplied password should be compared… using a secure password comparison function provided by the language or framework » qui « returns in constant time, to protect against timing attacks. » (Le *stockage*/algorithme relève de `password-hashing.md`.)
- **Vérifié par :** manuel.
- **Check (review) :** la vérification passe par `argon2.verify`/équivalent ; aucune comparaison de chaînes de hash maison.
- ✅ **Bon :** `await argon2.verify(user.passwordHash, plain)`.
- ❌ **Mauvais :** `if (sha256(plain) === user.hash)` — non adaptatif **et** comparaison à temps variable.

### R5 — Politique de mot de passe par longueur, pas par composition    {#authentication.r5}
- **Règle :** imposer un **minimum de longueur** (≥ 8 caractères si MFA activée, ≥ 15 sinon), autoriser un **maximum élevé** (≥ 64 pour les passphrases) et **tous** les caractères (unicode/espaces inclus). **Pas** de règles de composition ni de rotation périodique. **Bloquer** les mots de passe courants ou déjà compromis.
- **Pourquoi :** OWASP : « passwords shorter than 8 characters are considered weak [avec MFA] ; … 15 characters [sans MFA] » ; « Maximum password length should be at least 64 characters » ; « There should be no password composition rules » ; « Block common and previously breached passwords. »
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** la validation applique min/max de longueur ; aucune contrainte de composition/expiration ; un contrôle anti-compromis (ex. Pwned Passwords) est branché.
- ✅ **Bon :** min 15 (sans MFA), max ≥64, tous caractères, vérif contre une liste de mots de passe compromis.
- ❌ **Mauvais :** « 8 caractères, 1 majuscule, 1 chiffre, 1 symbole, change tous les 90 jours » — composition + rotation, sans contrôle de compromission.

### R6 — Exiger la MFA (login + actions sensibles)                     {#authentication.r6}
- **Règle :** proposer/exiger la **MFA**, au minimum **au login** et pour les **actions sensibles** (changement de mot de passe/email, désactivation MFA, élévation admin). Combiner des **facteurs de catégories différentes** ; éviter SMS/email comme facteur fort.
- **Pourquoi :** « MFA is by far the best defense… [it] would have stopped 99.9% of account compromises » ; « The most important place to require MFA… is when the user logs in » ; « SMS… [is a] restricted authenticator » ; « requiring multiple instances of the same authentication factor… does not constitute MFA. »
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** un second facteur (de catégorie différente) protège le login et les opérations sensibles ; SMS/email ne sont pas le facteur principal quand un facteur plus fort est possible.
- ✅ **Bon :** mot de passe (savoir) + TOTP/clé U2F (possession) ; re-challenge MFA avant un changement d'email.
- ❌ **Mauvais :** « mot de passe + PIN » présenté comme MFA (même catégorie) ; MFA uniquement par SMS.

### R7 — ID de session imprévisible, généré par le framework           {#authentication.r7}
- **Règle :** générer l'identifiant de session avec le **CSPRNG du framework**, avec **≥ 64 bits d'entropie**. Ne pas fabriquer son propre générateur ni dériver l'ID de données prévisibles.
- **Pourquoi :** « A strong CSPRNG… must be used to generate session IDs » et « Session identifiers must have at least 64 bits of entropy to prevent brute-force session guessing attacks. »
- **Vérifié par :** manuel.
- **Check (review) :** l'ID vient du mécanisme de session du framework ; pas d'ID séquentiel, basé sur le temps, ou maison.
- ✅ **Bon :** laisser le store de session du framework émettre l'ID.
- ❌ **Mauvais :** `sessionId = userId + Date.now()` — prévisible.

### R8 — Régénérer la session au changement de privilège               {#authentication.r8}
- **Règle :** **régénérer** l'identifiant de session **après le login** et à tout **changement de niveau de privilège** (élévation de rôle, passage en zone sensible).
- **Pourquoi :** « The session ID must be renewed or regenerated by the web application after any privilege level change » — c'est « mandatory to prevent session fixation attacks. »
- **Vérifié par :** manuel.
- **Check (review) :** un nouvel ID de session est émis à la connexion et aux élévations ; l'ancien est invalidé.
- ✅ **Bon :** `session.regenerate()` juste après authentification réussie.
- ❌ **Mauvais :** conserver le même ID de session avant et après login (fixation possible).

### R9 — Cookies de session durcis                                     {#authentication.r9}
- **Règle :** poser sur le cookie de session les attributs **`Secure`**, **`HttpOnly`**, **`SameSite`** (`Strict` de préférence, sinon `Lax`), et un **scope restreint** (`Path`/`Domain`).
- **Pourquoi :** `Secure` → « only send the cookie through an encrypted HTTPS connection » ; `HttpOnly` → « not allow scripts to access cookies via… document.cookie » (anti-vol XSS) ; `SameSite=Strict (preferred) or Lax` (anti-CSRF) ; scope « narrow or restricted ».
- **Vérifié par :** manuel.
- **Check (review) :** le cookie de session a `Secure`+`HttpOnly`+`SameSite` et un scope minimal ; pas de secret de session lisible par JS.
- ✅ **Bon :** `{ httpOnly: true, secure: true, sameSite: 'strict', path: '/' }`.
- ❌ **Mauvais :** cookie de session sans `HttpOnly`/`Secure` ou `SameSite=None` sans raison.

### R10 — Timeouts d'inactivité et absolu                              {#authentication.r10}
- **Règle :** appliquer un **timeout d'inactivité** (idle) **et** un **timeout absolu** (durée de vie max, quelle que soit l'activité). Calibrer selon la sensibilité de l'application.
- **Pourquoi :** « All sessions should implement an idle or inactivity timeout » et « an absolute timeout, regardless of session activity. » Limite la fenêtre d'exploitation d'une session volée.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** les deux bornes existent ; ordres de grandeur cohérents (OWASP : 2–5 min haute valeur, 15–30 min risque faible).
- ✅ **Bon :** idle 15 min + absolu 8 h pour une app à risque modéré.
- ❌ **Mauvais :** session sans expiration, ou seulement idle sans plafond absolu.

### R11 — Invalider la session côté serveur                            {#authentication.r11}
- **Règle :** à la **déconnexion** et à l'**expiration**, invalider la session **côté serveur** (pas seulement supprimer le cookie côté client).
- **Pourquoi :** « When a session expires, the web application must take active actions to invalidate the session on both sides, client and server. » Un simple effacement de cookie laisse l'ID valide côté serveur.
- **Vérifié par :** manuel.
- **Check (review) :** logout/expiration suppriment l'entrée de session serveur ; un ID expiré/déconnecté est refusé.
- ✅ **Bon :** `session.destroy()` (ou suppression du store) au logout, en plus d'effacer le cookie.
- ❌ **Mauvais :** logout qui ne fait qu'effacer le cookie ; l'ID reste accepté.

## Anti-patterns
- Message de login distinguant « compte inconnu » de « mot de passe faux » → #authentication.r1
- Login sans limite d'essais, ou limite uniquement par IP → #authentication.r2
- Authentification servie en HTTP → #authentication.r3
- Comparaison de hash maison `===` (timing) → #authentication.r4
- Règles de composition + rotation, sans min de longueur ni anti-compromission → #authentication.r5
- MFA absente, ou « password + PIN », ou SMS comme seul second facteur → #authentication.r6
- ID de session prévisible / généré maison → #authentication.r7
- Même ID de session avant/après login (fixation) → #authentication.r8
- Cookie de session sans `HttpOnly`/`Secure`/`SameSite` → #authentication.r9
- Session sans timeout idle/absolu → #authentication.r10
- Logout qui n'invalide pas la session côté serveur → #authentication.r11

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Authentification ≠ autorisation :** ce fichier prouve l'identité et gère la session. Ce que l'utilisateur
a le **droit** de faire (rôles, permissions, deny-by-default) relève de `authorization.md`.

**Catégories de facteurs (MFA CS) :** savoir (mot de passe, PIN), possession (OTP/TOTP, clés U2F,
certificats, smart cards, SMS/email/appel), inhérence (biométrie), localisation, comportement. La MFA
exige des facteurs de **catégories différentes** — « requiring multiple instances of the same
authentication factor… does not constitute MFA. » SMS/PSTN sont *restricted* (SS7, SIM-swap,
number-porting) et l'email « relies entirely on the security of the email account, which often lacks MFA. »

**Où exiger la MFA (MFA CS) :** au login d'abord, puis sur les actions sensibles — changement de mot de
passe, changement d'email, désactivation de la MFA, élévation vers une session administrative.

**Longueurs de mot de passe (Auth CS) :** seuils de faiblesse < 8 (avec MFA) / < 15 (sans MFA) ; maximum
≥ 64 pour autoriser les passphrases ; aucun jeu de caractères interdit ; pas de rotation périodique
imposée ; blocage des mots de passe courants/compromis (ex. service *Pwned Passwords*).

**Timeouts (Session CS) :** plages courantes d'inactivité — 2–5 min pour les applications à haute valeur,
15–30 min pour celles à faible risque ; toujours doubler d'un timeout **absolu**.

**Portée & frontières :** ces règles couvrent l'authentification **par session**. Le traitement
**token/JWT** (signature, `exp`, stockage, révocation) n'est **pas** sourcé ici — à ajouter via l'OWASP
*JWT Cheat Sheet*, ou à instancier dans `passport.md` selon la stratégie choisie. Le **stockage** des
identifiants → `password-hashing.md` ; le **chiffrement en transit** (TLS) recoupe `security.md R4 (A04)` ;
le secret de session/pepper → `configuration.md`.

**Liens :** Authentication → https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html ·
Session Management → https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html ·
Multifactor Authentication → https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html
