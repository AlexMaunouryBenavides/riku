# Plan de travail — Riku

> **Tableau de bord du projet CDA.** Une tâche = une action atomique, cochable, avec un critère de validation.
> Les tâches sont dans l'**ordre où il faut les faire**. Tu coches au fur et à mesure.

## Comment s'en servir

- **Légende de propriété :**
  - 👤 **Toi** — tu écris le code. C'est le cas par défaut : le projet est un exercice d'apprentissage.
  - 🤖 **Claude** — amorçage et outillage seulement (scaffolding, configs, CI). Il ne code pas de métier.
  - 🔍 **Revue** — chaque tâche 👤 se termine par une revue : tu lances `pnpm verify`, **puis** tu demandes
    « _Claude, vérifie cette tâche_ ». Il confronte ton code aux règles du kit (`kit/AGENTS.kit.md` §5)
    et ne relève que les règles `Vérifié par: manuel`.
- **Dépendances :** tu n'installes une dépendance qu'au moment où la tâche qui l'utilise arrive.
  Pas d'installation « au cas où ».
- **Autres marqueurs :** `↗` = hors-MVP (seulement si le temps le permet) · `kit:` = règle du kit qui gouverne la tâche.

## Lignes de force

Ce que le jury note avant tout : le **composant métier** (répétition espacée, §5), l'**accès SQL + NoSQL** (§5),
la **sécurité** (transverse) et les **tests** (§7). Vise le MVP de bout en bout **avant** les `↗`.

---

## Vue d'ensemble

- [x] **1. Cadrage & environnement** _(CDA : « installer et configurer son environnement de travail »)_
- [ ] **2. Conception** _(reste les maquettes et le plan de tests)_
- [x] **3. Socle technique**
- [ ] **4. Fondations backend** (config, bases, sécurité transverse) _(tu es ici)_
- [ ] **5. Métier backend** (auth, catalogue, répétition espacée, sessions)
- [ ] **6. Frontend**
- [ ] **7. Tests & qualité**
- [ ] **8. Déploiement & DevOps**
- [ ] **9. Dossier & soutenance**

---

## 1. Cadrage & environnement de travail ✅

- [x] **1.1 🤖 Figer le périmètre MVP** · ✔ `conception/cas-utilisation.md` §1 (périmètre + hors-scope).
- [x] **1.2 👤 Installer la boîte à outils** · ✔ Node **v26.4.0** · npm 11.14.1 · pnpm 10.0.0 · git 2.47.0 · Docker 29.5.2 + Compose v5.1.4 · Nest CLI 11.0.21.
      _Note :_ Node 26 est une version _Current_, pas la LTS. Choix assumé — `specifications-techniques.md` §2, écart **(G)** à `docker.r2`.
- [x] **1.3 🤖 Bases MySQL + MongoDB en local** (via Docker) · ✔ Les deux conteneurs passent `healthy` et acceptent une connexion **authentifiée** (MySQL 8.4.9 en `riku@%`, MongoDB 8.0.26 sur la base `riku`).
      _Note :_ les services **MySQL80 et MongoDB natifs** de Windows ont été arrêtés et passés en `Disabled`. Les conteneurs occupent les ports standards **3306 / 27017**.
- [x] **1.4 🤖 Dépôt Git + monorepo pnpm** · `kit: monorepo.md`, `git-workflow.md` · ✔ commit `4a3a0ac`.
- [x] **1.5 🤖 Appliquer le kit** (tooling eslint/prettier/tsconfig/hadolint + `openspec/config.yaml`) · `kit: AGENTS.kit.md` · ✔ commit `e608b08`.

---

## 2. Conception

- [x] **2.1 👤 Cas d'utilisation** (acteurs, CU, mésusages, RG-01→07) · ✔ `conception/cas-utilisation.md`.
- [x] **2.2 👤 MCD (Merise)** · `kit: mcd.md` · ✔ `conception/merise/mcd.drawio`.
- [x] **2.3 👤 MLD (schéma relationnel)** · `kit: mld.md` · ✔ `conception/merise/mld.drawio`.
- [x] **2.4 👤 MPD** · `kit: mpd.md` · ✔ `conception/merise/mpd.drawio`. Le script de création sera produit par une **migration TypeORM**, jamais à la main, jamais `synchronize`.
- [x] **2.5 👤 Modèle documentaire MongoDB** · ✔ `conception/modele-donnees.md` §4.
- [x] **2.6 👤 Diagramme de classes (UML)** · ✔ `conception/uml/diagramme-classes.drawio`.
- [x] **2.7 👤 Diagramme de séquence — UC10** _(CU pivot)_ · ✔ `conception/uml/diagramme-sequence.drawio`.
- [x] **2.8 👤 Diagrammes de séquence — UC01 & UC11** · ✔ `conception/uml/diagramme-sequence-inscription.drawio` (Argon2id + anti-énumération) et correction côté serveur.
- [x] **2.9 👤 Spécifications techniques** · `kit: clean-archi-back.md`, `security.md` · ✔ `conception/specifications-techniques.md`.
- [ ] **2.10 👤 Plan de tests (définition)** · `kit: _strategy.md` · ✔ Validé si : ce qui est testé (unitaire / intégration / e2e / sécurité) et la fonctionnalité représentative (UC10) sont désignés.
      _À faire avant d'écrire le premier test (§7). Peut se faire dès maintenant._
- [ ] **2.11 👤 Maquettes + enchaînement des écrans** · ✔ Validé si : connexion, thèmes, session, bilan, progression, admin ; schéma d'enchaînement fourni.
      _Bloquant pour le §6 (frontend), pas avant._

---

## 3. Socle technique

- [x] **3.1 🤖 `docker-compose` local** (mysql, mongo) · `kit: docker.md`, `configuration.md` · ✔ Tags épinglés `mysql:8.4` / `mongo:8.0` (`docker.r2`), volumes nommés, `healthcheck` par service, ports liés à `127.0.0.1`, credentials depuis `.env` + `.env.example` versionné (`configuration.r4`).
      _Choix :_ `api` et `web` ne sont pas conteneurisés en dev (perte du hot-reload sans contrepartie) ; leurs images arrivent en §8.
- [x] **3.2 🤖 Amorçage `apps/api` (NestJS) et `apps/web` (React + Vite)** · ✔ Les deux démarrent, `pnpm verify` est vert.
      Livré : `@riku/api` (`main.ts` + `AppModule` vide, Jest) · `@riku/web` (`App.tsx` minimal, Vitest + Testing Library) ·
      configs générées supprimées au profit de celles de la racine (une seule source de vérité pour ESLint et Prettier) ·
      couche ESLint React (`react-hooks`, `jsx-a11y`) · catalogue pnpm sur **TypeScript 6.0**.
      **Aucune dépendance métier installée**, aucun module créé : c'est ton travail, à partir de 3.3.
- [x] **3.3 🤖 CI minimale** (GitHub Actions : install + `pnpm verify` au push/PR) · `kit: ci-cd.md` · ✔ Validé — `.github/workflows/ci.yml` : déclencheurs `push` (main) + `pull_request` (`r1`), `pnpm/action-setup` puis `actions/setup-node` avec `cache: pnpm` et install `--frozen-lockfile` (`r2`), actions épinglées au **SHA complet** (`r3`), `permissions: contents: read` (`r4`), `concurrency` + `cancel-in-progress` (`r6`), portes `pnpm format` et `pnpm verify` bloquantes (`r5`, `r7`).
      Workflow validé localement par `actionlint` (0 erreur). `.github/dependabot.yml` maintient les SHA à jour — sans lui, l'épinglage devient de l'obsolescence.
      _La version de pnpm n'est pas répétée dans le workflow : `pnpm/action-setup` la lit depuis `packageManager` du `package.json`._

---

## 4. Fondations backend

> Tout est 👤 à partir d'ici. Ordre important : la config avant les bases, les bases avant le métier.

- [ ] **4.1 👤 Config typée & validée au boot** (`@nestjs/config`, schéma de validation, `.env.example` complété avec `JWT_SECRET`, `NODE_ENV`…) · `kit: configuration.md` (r1, r3, r5) · ✔ Validé si : l'API **refuse de démarrer** si une variable requise manque ; aucun `process.env` lu hors du module de config.
      _`main.ts` lit encore `process.env.PORT` en direct : cette tâche doit le supprimer._
- [ ] **4.2 👤 Structure en couches des modules** (dossiers `domain` / `application` / `infrastructure` pour `auth`, `users`, `catalog`, `revision`) · `kit: clean-archi-back.md`, `nest.md` · ✔ Validé si : modules déclarés et démarrables, `AppModule` les importe, aucun import d'une couche externe vers l'intérieur (`clean-archi-back.r1`).
- [ ] **4.3 👤 Connexion MySQL via TypeORM** (`DataSource`, migrations configurées, **jamais `synchronize`**) · `kit: data-access.md` · ✔ Validé si : l'API démarre et se connecte au conteneur MySQL ; `migration:generate` est opérationnel.
      _Rappel :_ une classe annotée `@Entity()` est un **modèle de persistance**, pas une entité de domaine (`clean-archi-back.r2`).
- [ ] **4.4 👤 Connexion MongoDB via Mongoose** (`@nestjs/mongoose`) · ✔ Validé si : l'API démarre et se connecte au conteneur Mongo ; schéma de session déclaré.
- [ ] **4.5 👤 Sécurité transverse** (`helmet`, `cookie-parser`, `ValidationPipe` global, filtre d'exceptions global fail-closed) · `kit: security.md` (r2, r10), `error-handling.md`, `validation.md` · ✔ Validé si : erreurs génériques au client (MUC07), aucune fuite de stack, en-têtes de sécurité présents.
- [ ] **4.6 👤 Journalisation des événements de sécurité** · `kit: security.md` (r9), `observability.md` · ✔ Validé si : événements loggés avec contexte, **sans secret ni PII**.

---

## 5. Métier backend

- [ ] **5.1 👤 Auth — inscription** (DTO + validation, hachage **Argon2id**, anti-énumération) · `kit: validation.md`, `password-hashing.md` · ✔ Validé si : compte créé, mot de passe haché et salé, jamais renvoyé ; tests verts.
- [ ] **5.2 👤 Auth — connexion + JWT en cookie httpOnly** (Passport, rate-limit login) · `kit: authentication.md`, `passport.md`, `security.md` (r7) · ✔ Validé si : cookie `httpOnly`+`secure`+`sameSite`, routes protégées, tentatives limitées.
- [ ] **5.3 👤 Guards de rôle & de propriété** (deny-by-default, ownership) · `kit: authorization.md`, `nest-authz.md` (r1, r2) · ✔ Validé si : un apprenant ne peut ni agir en admin (MUC04) ni lire les données d'autrui (MUC03) — tests d'accès verts.
- [ ] **5.4 👤 Catalogue — thèmes (CRUD admin)** · `kit: api-design.md`, `data-access.md` · ✔ Validé si : CRUD réservé à l'admin, entrées validées, entités jamais exposées (DTO de réponse) ; tests verts.
- [ ] **5.5 👤 Catalogue — questions & réponses (CRUD admin)** · ✔ Validé si : QCM à 2..N réponses dont ≥1 correcte ; la contrainte « au moins une bonne réponse » est vérifiée ; tests verts.
- [ ] **5.6 👤 Composant métier — répétition espacée** (fonctions pures, RG-01→07) · **cœur noté** · `kit: clean-archi-back.md` (r2, r9), `jest.md` · ✔ Validé si : `nextState()` et `intervalForBox()` sont **pures** (aucune I/O, aucun framework) et couvertes par des tests unitaires, dont le jeu d'essai `boîte 2 + réponse fausse → boîte 1`.
- [ ] **5.7 👤 Accès données SQL** (repository `cartes`, requêtes paramétrées) · `kit: data-access.md`, `security.md` (r5) · ✔ Validé si : lecture/écriture des cartes, aucune concaténation dans les requêtes, mapping persistance→domaine explicite ; tests d'intégration verts.
- [ ] **5.8 👤 Accès données NoSQL** (journal `sessions` + réponses données) · **exigence SQL+NoSQL** · ✔ Validé si : session et réponses persistées en documents, relues pour la progression ; pas de `$where` dynamique ; tests d'intégration verts.
- [ ] **5.9 👤 Endpoints session de révision** (UC10/11/12 : démarrer, répondre, bilan) · ✔ Validé si : correction **côté serveur** (MUC01), la bonne réponse n'est **jamais** envoyée au front avant soumission ; tests verts.
- [ ] **5.10 👤 Endpoint progression** (UC13, agrégation par thème/boîte) · ✔ Validé si : répartition des cartes par boîte renvoyée **pour l'utilisateur courant uniquement**.

---

## 6. Frontend

> Prérequis : la tâche **2.11** (maquettes) doit être faite.

- [ ] **6.1 👤 Socle front** (React Router, TanStack Query + `QueryClientProvider`, Zustand, Tailwind + shadcn/ui) · `kit: react.md`, `state-management.md` · ✔ Validé si : l'app démarre, le routing fonctionne, un composant shadcn s'affiche.
- [ ] **6.2 👤 Layout + navigation + routes protégées** · ✔ Validé si : redirection si non connecté, menu selon rôle.
      _Rappel :_ une garde de route côté front est **du confort UX**, jamais une mesure de sécurité.
- [ ] **6.3 👤 Écrans Auth** (inscription, connexion) · `kit: data-fetching.md`, `accessibility.md` · ✔ Validé si : formulaires validés (React Hook Form + Zod), messages neutres (anti-énumération).
- [ ] **6.4 👤 Écran « Parcourir les thèmes »** (UC30) · ✔ Validé si : liste des thèmes + nombre de questions, lancement d'une session.
- [ ] **6.5 👤 Écran « Session de révision »** (UC10/11) · **écran pivot** · ✔ Validé si : QCM interactif, verdict après validation, enchaînement des questions.
- [ ] **6.6 👤 Écran « Bilan de session »** (UC12) · ✔ Validé si : score, cartes revues, ce qui reste à réviser.
- [ ] **6.7 👤 Écran « Progression »** (UC13) · ✔ Validé si : visualisation de la maîtrise par thème (boîtes).
- [ ] **6.8 👤 Écrans Admin** (thèmes, questions/réponses) · ✔ Validé si : CRUD complet réservé à l'admin, cohérent avec le back.
- [ ] **6.9 👤 Responsive + charte graphique + accessibilité** · `kit: accessibility.md`, `performance-frontend.md` · ✔ Validé si : s'adapte aux tailles d'écran, contrastes et labels corrects.

---

## 7. Tests & qualité

_(CDA : « préparer et exécuter les plans de tests »)_

- [ ] **7.1 👤 Tests unitaires du composant métier** + jeu d'essai documenté · `kit: jest.md` · ✔ Validé si : RG-01→07 couvertes, jeu d'essai (entrée / attendu / obtenu) rédigé pour le dossier.
- [ ] **7.2 👤 Tests d'intégration** (endpoints + accès SQL & NoSQL) · ✔ Validé si : le parcours de session complet est testé de l'API à la base.
- [ ] **7.3 👤 Tests e2e du parcours pivot** (connexion → réviser → bilan) · `kit: cypress.md` · ✔ Validé si : scénario e2e vert.
- [ ] **7.4 👤 Tests de sécurité (cas de mésusage)** MUC01→07 · `kit: security.md` · ✔ Validé si : triche, IDOR et élévation de privilège sont couverts par des tests qui **échouent côté attaquant**.
- [ ] **7.5 👤 Rapport de couverture** · ✔ Validé si : couverture générée, points faibles identifiés.

---

## 8. Déploiement & DevOps

_(CDA : « préparer le déploiement » + « mise en production DevOps »)_

- [ ] **8.1 👤 Dockerfiles durcis** (api + web) · `kit: docker.md` · ✔ Validé si : `hadolint` passe, images multi-stage, utilisateur non-root.
      _Rappel de l'écart **(G)** :_ image de base `node:26-alpine`, pas la LTS. Se referme le 28 octobre 2026.
- [ ] **8.2 👤 Pipeline CI complet** (lint + test + build + SCA/SBOM) · `kit: ci-cd.md`, `security.md` (r3) · ✔ Validé si : toutes les étapes vertes, SBOM généré.
- [ ] **8.3 👤 Procédure de déploiement documentée** · ✔ Validé si : étapes de déploiement + rollback écrites (pour l'entretien technique).
- [ ] **8.4 👤 Déploiement sur l'environnement cible** ↗ · ✔ Validé si : appli accessible en ligne (bonus, non exigé).

---

## 9. Dossier & soutenance (CDA)

- [ ] **9.1 👤 Rédiger le dossier de projet** (plan « formation », 40–60 p.) · ✔ Validé si : suit le plan du référentiel (besoins, archi, MCD/MPD, maquettes, code, sécurité, tests, veille).
- [ ] **9.2 👤 Sélectionner les extraits de code significatifs** (UI, métier, accès données) · ✔ Validé si : extraits commentés avec justification des choix.
- [ ] **9.3 👤 Jeu d'essai de la fonctionnalité représentative (UC10)** · ✔ Validé si : données en entrée / attendues / obtenues + analyse des écarts.
- [ ] **9.4 👤 Veille sécurité** (vulnérabilités trouvées / corrigées) · ✔ Validé si : démarche de veille décrite + exemples concrets.
- [ ] **9.5 👤 Support de présentation (diaporama)** · ✔ Validé si : suit le plan de présentation du référentiel.
- [ ] **9.6 👤 Répétition orale** (timing ~40 min de présentation) · ✔ Validé si : blanc chronométré réalisé au moins une fois.

---

## Notes

- Les `↗` sont optionnels : ne les fais que si tu es en avance sur ton budget (~40 h de dev, échéance début septembre).
- **Protocole après chaque tâche 👤 :** `pnpm verify` d'abord, puis « _Claude, vérifie_ ». Sans `pnpm verify`,
  la revue perd son temps sur des points que la machine relève gratuitement (format, complexité, types).
- **Prochaine action :** 4.1 — config typée et validée au boot (`@nestjs/config`). C'est à toi.
