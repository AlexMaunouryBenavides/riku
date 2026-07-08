---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: configuration
title: Configuration (env, 12-factor)
discipline: configuration
kind: config
tech: [] # agnostique : 12-Factor est "language- and OS-agnostic" ; valable quel que soit le framework.
layer: shared
phase: [implementation, review]
level: guardrail # défaut : une mauvaise config = secret fuité ou crash en prod. Non négociable.
status: active
version: 1.0
sources:
  - https://12factor.net/config
---

# Configuration (env, 12-factor)

> **Intention :** la config (ce qui varie selon le déploiement) est strictement séparée du code (identique
> partout), stockée dans l'environnement, validée au démarrage, et lue via un point d'accès unique et typé.
> **Méta-principe :** implémenter la config via le **mécanisme recommandé par le framework** utilisé ; ne pas
> réinventer un système parallèle. N'ajouter des conventions maison que là où le framework laisse un choix.
> **En cas de conflit, le framework gagne.**
> **Applies to :** `**/.env*`, `**/*config*.{ts,js}`, `**/main.ts`, `**/index.ts`.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — EXIGENCES (injectée)                                          -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Requirements

### R1 — Suivre le mécanisme de config recommandé par le framework {#configuration.r1}

- **Exige :** implémenter le chargement, la validation et l'accès à la config via le mécanisme **officiel** du framework détecté (son module de config, son loader d'`.env`, sa validation de schéma). Ne pas recoder un système de config maison à côté. N'écrire des conventions propres au projet que sur ce que le framework laisse réellement ouvert.
- **Pourquoi :** les auteurs du framework ont résolu ces problèmes mieux et de façon mieux intégrée (typage, cycle de vie, tests) ; un système parallèle diverge, double la maintenance et perd les garanties du framework.
- **Vérifié par :** revue manuelle (setup).
- **Check :** la config passe par l'outil recommandé du framework (voir exemples en Reference), pas par un wrapper maison qui le contourne ; les écarts au framework sont justifiés par un choix qu'il laisse ouvert.
- 📦 **Repère :** « quel est le mécanisme de config documenté par mon framework ? » → c'est lui le défaut. Les règles R2–R6 ci-dessous sont _ce que ce mécanisme doit satisfaire_ (et ce qu'on applique directement en l'absence d'outil dédié).

### R2 — Config dans l'environnement, séparée du code {#configuration.r2}

- **Exige :** stocker dans l'environnement tout ce qui **varie selon le déploiement** : handles de ressources (BDD, caches, services backing), identifiants d'API tierces, valeurs par déploiement (hôte canonique, etc.). Aucune de ces valeurs codée en dur ni par-branche dans le source.
- **Pourquoi :** « strict separation of config from code » (12-Factor). Le code est identique entre déploiements ; seule la config change. Les variables d'env se modifient sans toucher au code et sont un standard agnostique langage/OS.
- **Vérifié par :** revue manuelle + grep CI sur les valeurs sensibles/d'environnement codées en dur.
- **Check :** aucune URL de BDD, clé, hôte ou credential littéral dans le code ; ces valeurs viennent de l'environnement.
- 📦 **Repère :**
  ```dotenv
  # .env (non commité)
  DATABASE_URL=postgres://user:pass@host:5432/app
  STRIPE_API_KEY=sk_live_...
  ```

### R3 — Valider la config au démarrage (fail-fast) {#configuration.r3}

- **Exige :** au boot de l'application, valider la présence **et** le format des variables requises ; si une variable obligatoire manque ou est invalide, **l'application refuse de démarrer** avec un message clair. Ne jamais laisser une config invalide atteindre le runtime.
- **Pourquoi :** un échec au démarrage est immédiat et visible ; sans validation, l'erreur surgit à la première requête (ou pire, silencieusement en prod) et est bien plus coûteuse à diagnostiquer.
- **Vérifié par :** revue manuelle (présence d'une étape de validation au boot) + test de démarrage avec une variable requise absente.
- **Check :** un schéma/validation des variables existe et est exécuté au bootstrap ; les valeurs sont typées/converties à ce moment-là, pas castées à la main partout.
- 📦 **Repère :** valider via le validateur du framework si fourni (schéma de config), sinon un schéma validé au point d'entrée. Variable requise manquante ⇒ exception au boot.

### R4 — Aucun secret dans le dépôt ; `.env.example` documente les clés {#configuration.r4}

- **Exige :** aucun secret commité. `.env` (et variantes) sont **git-ignorés**. Un fichier **`.env.example`** versionné liste **toutes** les clés attendues, **sans valeurs sensibles** (placeholders/valeurs de dev inoffensives). Les secrets réels viennent de l'environnement / d'un gestionnaire de secrets.
- **Pourquoi :** test décisif 12-Factor : « le code pourrait-il devenir open source à tout instant sans compromettre un credential ? ». `.env.example` garde l'onboarding simple sans fuiter de secret. _(Le stockage/rotation des secrets relève de `security.md`.)_
- **Vérifié par :** présence de `.env*` dans `.gitignore` + présence de `.env.example` (check setup) + scan de secrets en CI.
- **Check :** `.gitignore` couvre `.env*` ; `.env.example` existe et couvre les mêmes clés que `.env`, sans valeur sensible ; aucun secret dans l'historique.
- 📦 **Repère :**
  ```dotenv
  # .env.example (commité)
  DATABASE_URL=
  STRIPE_API_KEY=
  ```

### R5 — Accès centralisé et typé à la config {#configuration.r5}

- **Exige :** lire la config via **un seul point d'accès typé** (le service/objet de config du framework, ou un module dédié). Pas de lecture brute de l'environnement (`process.env.X`, `import.meta.env.X`) dispersée dans le code métier.
- **Pourquoi :** centraliser donne une seule source de vérité validée et typée, rend les clés découvrables et refactorables, et évite les fautes de frappe silencieuses disséminées.
- **Vérifié par :** grep CI sur les accès bruts à l'environnement hors du module de config.
- **Check :** le code applicatif consomme un objet de config typé ; les accès directs à l'environnement sont confinés au module/loader de config.
- 📦 **Repère :** un `config` typé exposé une fois ; le reste du code dépend de lui, pas de l'environnement brut.

### R6 — Variables granulaires, pas d'« environnements » nommés {#configuration.r6}

- **Exige :** modéliser la config en **variables granulaires et orthogonales**, chacune indépendante. Ne **pas** regrouper la config en environnements nommés en dur (blocs/fichiers `development`/`staging`/`production` figés, ou `if (env === 'prod') …` qui dupliquent des valeurs).
- **Pourquoi :** les groupes nommés « ne passent pas à l'échelle » et mènent à une « explosion combinatoire » dès qu'un nouveau déploiement apparaît (12-Factor). Des variables orthogonales se composent librement.
- **Vérifié par :** revue manuelle.
- **Check :** pas de branche `if (NODE_ENV === '…')` qui sélectionne des valeurs de config en dur ; les différences entre déploiements passent par des variables, pas par des blocs de code.
- 📦 **Repère :** `FEATURE_X_ENABLED=true` (granulaire) plutôt qu'un mode `production` qui décide en dur de dix réglages.

## Anti-patterns

- Valeur d'environnement (URL BDD, clé, hôte) codée en dur dans le source → #configuration.r2
- Pas de validation au boot : config invalide qui plante à la 1ʳᵉ requête → #configuration.r3
- Secret commité / `.env` non git-ignoré / pas de `.env.example` → #configuration.r4
- `process.env` / `import.meta.env` lus un peu partout dans le code métier → #configuration.r5
- `if (env === 'prod') { … }` qui duplique des valeurs de config → #configuration.r6
- Wrapper de config maison qui contourne le mécanisme du framework → #configuration.r1

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Test décisif 12-Factor :** « le codebase pourrait-il devenir open source à tout instant sans compromettre
aucun credential ? » Si non, des secrets sont mal rangés.

**Ce qui compte comme config (12-Factor) :** handles de ressources (BDD, Memcached, services backing),
credentials de services externes (S3, Twitter, Stripe…), valeurs par déploiement (hôte canonique). **Pas**
config : les constantes internes qui ne varient pas entre déploiements (elles restent dans le code).

**Exemples de mécanismes recommandés par framework (illustrations de R1, pas des règles) :**

- **NestJS** → `@nestjs/config` : `ConfigModule.forRoot({ isGlobal: true, validationSchema })` (validation
  Joi) ou `validate()` (class-validator), accès via `ConfigService.get<T>(…, { infer: true })`, regroupement
  par domaine avec `registerAs()` + `ConfigType`. C'est _sa_ voie recommandée → on la suit telle quelle.
- **Vite / React** → `import.meta.env` avec préfixe **`VITE_`** pour exposer une variable au client.
- **Node brut** → `process.env` (+ `--env-file` depuis Node 20) confiné à un module de config validé.
  Le défaut, c'est toujours la voie documentée par le framework du projet.

**Précédence des sources (cas courant, ex. dotenv) :** une variable définie dans l'environnement runtime
(ex. `export DATABASE_URL=…`) prime sur la même clé dans un fichier `.env`.

**⚠️ Frontend — secrets :** les variables exposées au client (ex. `VITE_*`) sont **embarquées dans le bundle
public** et donc lisibles par tous. **Jamais** de secret côté frontend ; seules des valeurs publiques
(URL d'API publique, clé publishable). Voir `security.md`.

**Délégations (ne pas dupliquer ici) :**

- stockage, rotation et non-logging des secrets → `rules/shared/security.md` ;
- injection des variables au niveau **conteneur** + exclusion des `.env` de l'image → `rules/infra/docker.md` (R5/R6) ;
- validation des **entrées HTTP** (DTO, ValidationPipe) → `rules/backend/validation.md` (≠ validation de la config).

**Lien :** 12-Factor « Config » → https://12factor.net/config
