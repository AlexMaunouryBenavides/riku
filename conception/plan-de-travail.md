# Plan de travail — QuizDev _(titre de travail)_

> **Tableau de bord du projet CDA.** Une tâche = une action atomique, cochable, avec un critère de validation.
> Tu coches au fur et à mesure ; tu peux demander à Claude de **valider une étape** ou de **vérifier ton code**.

## Comment s'en servir

- **Faire une tâche** → tu la réalises, tu remplaces `- [ ]` par `- [x]`.
- **Faire valider une étape** → « _Claude, valide la tâche 1.2 : voici mon MCD_ » → il contrôle contre le « ✔ Validé si ».
- **Faire vérifier ton code** → « _Claude, vérifie mon diff contre les règles du kit_ » (cf. `kit/AGENTS.kit.md` §5).
- **Légende :** `↗` = extension hors-MVP (à faire seulement si le temps le permet) · `kit:` = règle du kit qui gouverne la tâche.

## Ordre conseillé & lignes de force

Tu suis les phases dans l'ordre. Ce qui est **noté par le jury** avant tout : le **composant métier** (répétition espacée, phase 3),
l'**accès SQL + NoSQL** (phase 3), la **sécurité** (transverse) et les **tests** (phase 5). Vise le MVP de bout en bout **avant** les `↗`.

---

## Vue d'ensemble (progression par phase)

- [x] **Phase 0** — Cadrage & environnement de travail
- [x] **Phase 1** — Conception _(tu es ici)_
- [ ] **Phase 2** — Socle technique (squelettes + infra locale)
- [ ] **Phase 3** — Implémentation backend
- [ ] **Phase 4** — Implémentation frontend
- [ ] **Phase 5** — Tests & qualité
- [ ] **Phase 6** — Déploiement & DevOps
- [ ] **Phase 7** — Dossier & soutenance

---

## Phase 0 — Cadrage & environnement de travail

_(CDA : « Installer et configurer son environnement de travail »)_

- [x] **0.1 — Figer le périmètre MVP** · ✔ Validé — `conception/cas-utilisation.md` §1 (périmètre + hors-scope).
- [ ] **0.2 — Installer la boîte à outils** (Node LTS, pnpm/npm, Nest CLI, Vite, Git, Docker Desktop) · ✔ Validé si : `node -v`, `docker -v`, `git -v`, `nest --version` répondent.
- [ ] **0.3 — Installer MySQL + MongoDB en local** (via Docker) · ✔ Validé si : les deux conteneurs démarrent et acceptent une connexion.
- [ ] **0.4 — Initialiser le dépôt Git + structure monorepo** · `kit: monorepo.md`, `git-workflow.md` · ✔ Validé si : repo `git init`, `.gitignore`, dossiers `apps/api` + `apps/web` (ou équivalent).
- [ ] **0.5 — Appliquer le kit** (config.yaml + tooling eslint/prettier/tsconfig/hadolint) · `kit: AGENTS.kit.md` · ✔ Validé si : `lint` et `format` tournent, résumé des règles appliquées/écartées produit.

---

## Phase 1 — Conception

- [x] **1.1 — Cas d'utilisation** (acteurs, CU, mésusages, RG) · `conception/cas-utilisation.md` · ✔ _fait_.
- [x] **1.2 — MCD (Merise)** · `kit: mcd.md` · ✔ Validé — `conception/mcd.drawio` (identifiants, cardinalités, association `PRACTICE` porteuse d'attributs, contraintes d'intégrité).
- [x] **1.3 — MLD (schéma relationnel)** · `kit: mld.md` · ✔ Validé — `conception/mld.drawio` (FK + table de jointure `Practice`).
- [x] **1.4 — MPD** · `kit: mpd.md` · ✔ Validé — `conception/mpd.drawio` (types, `UNIQUE`, `NULL`/`NOT NULL`, `ON DELETE`). Le **script de création** sera produit par une **migration TypeORM** (`migration:generate`) en phase d'implémentation — pas de `schema.sql` manuel, pas de `synchronize`.
- [x] **1.5 — Modèle documentaire MongoDB** · ✔ Validé — `conception/modele-donnees.md` §4 (structure du document `sessions`, réponses imbriquées, justification du choix documentaire).
- [x] **1.6 — Diagramme de classes (UML)** · ✔ Validé si : entités du domaine + services métier (dont le service de répétition espacée), attributs/méthodes et relations cohérents avec le MCD.
- [x] **1.7 — Diagramme de séquence — UC10 (session de révision)** _(CU pivot)_ · ✔ Validé si : flux front→API→métier→MySQL/Mongo complet, y compris la sélection des cartes dues et le recalcul d'échéance.
- [x] **1.8 — Diagramme(s) de séquence — UC01 & UC11** · ✔ Validé — `diagramme-sequence-inscription.drawio` (Argon2id + anti-énumération) et `diagramme-sequence.drawio` (correction côté serveur).
- [ ] **1.9 — Maquettes + enchaînement** (wireframes des écrans clés) · ✔ Validé si : écrans connexion, thèmes, session, bilan, progression, admin ; schéma d'enchaînement fourni.
- [x] **1.10 — Spécifications techniques** · `kit: clean-archi-back.md`, `security.md` · ✔ Validé — `conception/specifications-techniques.md` (stack complète, archi en couches + rôles, stratégie sécurité mappée OWASP, éco-conception).
- [ ] **1.11 — Plan de tests (définition)** · `kit: _strategy.md` · ✔ Validé si : ce qui est testé (unitaire/intégration/e2e/sécurité) et la fonctionnalité représentative (UC10) sont désignés.

---

## Phase 2 — Socle technique

- [ ] **2.1 — `docker-compose` local** (api, web, mysql, mongo) · `kit: docker.md` · ✔ Validé si : `docker compose up` démarre toute la stack.
- [ ] **2.2 — Squelette backend NestJS en couches** · `kit: nest.md`, `clean-archi-back.md` · ✔ Validé si : modules vides mais démarrables, découpage domaine/application/infra respecté.
- [ ] **2.3 — Squelette frontend React** · `kit: react.md`, `clean-archi-front.md` · ✔ Validé si : app démarre, routing en place, structure de dossiers conforme.
- [ ] **2.4 — Config & secrets** (`.env`, validation de config, `.env.example`) · `kit: configuration.md` · ✔ Validé si : config typée et validée au boot, aucun secret en dur.
- [ ] **2.5 — CI minimale** (lint + test au push) · `kit: ci-cd.md` · ✔ Validé si : pipeline vert sur un commit de base.

---

## Phase 3 — Implémentation backend _(par module)_

- [ ] **3.1 — Module Auth : inscription** (DTO + validation, hachage Argon2id, anti-énumération) · `kit: validation.md`, `security.md` · ✔ Validé si : compte créé, mot de passe haché salé, tests verts.
- [ ] **3.2 — Module Auth : connexion + JWT + rôles** (guards, rate-limit login) · `kit: security.md` · ✔ Validé si : login renvoie un JWT valide, routes protégées, tentatives limitées.
- [ ] **3.3 — Guards de rôle & propriété** (deny-by-default, ownership) · `kit: security.md` (r1) · ✔ Validé si : un apprenant ne peut ni agir en admin (MUC04) ni lire les données d'autrui (MUC03) — tests d'accès verts.
- [ ] **3.4 — Module Catalogue : thèmes (CRUD admin)** · `kit: api-design.md`, `data-access.md` · ✔ Validé si : CRUD complet réservé à l'admin, entrées validées, tests verts.
- [ ] **3.5 — Module Questions/Réponses (CRUD admin)** · ✔ Validé si : QCM avec 2..N réponses dont ≥1 correcte ; contrainte « au moins une bonne réponse » vérifiée ; tests verts.
- [ ] **3.6 — Composant métier : répétition espacée** (fonctions pures RG-01→07) · **cœur noté** · `kit: jest.md` · ✔ Validé si : `appliquerResultat()` et `selectionnerCartesDues()` sont des fonctions pures, **couvertes par tests unitaires** (dont le jeu d'essai `boîte2+faux → boîte1`).
- [ ] **3.7 — Accès données SQL** (repository `cartes`, requêtes paramétrées) · `kit: data-access.md`, `security.md` (r5) · ✔ Validé si : lecture/écriture des cartes, aucune concaténation dans les requêtes, tests d'intégration verts.
- [ ] **3.8 — Accès données NoSQL** (journal `sessions` + `reponses_donnees` dans Mongo) · **exigence SQL+NoSQL** · ✔ Validé si : session et réponses persistées en documents, relues pour la progression, tests d'intégration verts.
- [ ] **3.9 — Endpoints session de révision** (UC10/11/12 : démarrer, répondre, bilan) · ✔ Validé si : correction **côté serveur** (MUC01), bonne réponse jamais renvoyée avant validation ; tests verts.
- [ ] **3.10 — Endpoint progression** (UC13, agrégation par thème/boîte) · ✔ Validé si : répartition des cartes par boîte renvoyée pour l'utilisateur courant.
- [ ] **3.11 — Sécurité transverse** (headers, handler d'erreur global fail-closed, pas de fuite de stack) · `kit: security.md` (r2,r10), `error-handling.md` · ✔ Validé si : erreurs génériques au client (MUC07), en-têtes de sécurité présents.
- [ ] **3.12 — Journalisation des événements de sécurité** (login/accès, succès+échec) · `kit: security.md` (r9), `observability.md` · ✔ Validé si : événements loggés avec contexte, sans secret/PII.

---

## Phase 4 — Implémentation frontend _(par écran)_

- [ ] **4.1 — Layout + navigation + routes protégées** · `kit: react.md`, `state-management.md` · ✔ Validé si : redirection si non connecté, menu selon rôle.
- [ ] **4.2 — Écrans Auth** (inscription, connexion) · `kit: data-fetching.md`, `accessibility.md` · ✔ Validé si : formulaires validés, messages neutres (anti-énumération), conformes aux maquettes.
- [ ] **4.3 — Écran « Parcourir les thèmes »** (UC30) · ✔ Validé si : liste des thèmes + nb de questions, lancement d'une session.
- [ ] **4.4 — Écran « Session de révision »** (UC10/11 : question → feedback) · **écran pivot** · ✔ Validé si : QCM interactif, verdict après validation, enchaînement des questions.
- [ ] **4.5 — Écran « Bilan de session »** (UC12) · ✔ Validé si : score, cartes revues, ce qui reste à réviser.
- [ ] **4.6 — Écran « Progression »** (UC13) · ✔ Validé si : visualisation de la maîtrise par thème (boîtes).
- [ ] **4.7 — Écrans Admin** (thèmes, questions/réponses) · ✔ Validé si : CRUD complet réservé à l'admin, cohérent avec le back.
- [ ] **4.8 — Responsive + charte graphique + accessibilité** · `kit: accessibility.md`, `performance-frontend.md` · ✔ Validé si : s'adapte aux tailles d'écran, contrastes/labels corrects.

---

## Phase 5 — Tests & qualité

_(CDA : « Préparer et exécuter les plans de tests »)_

- [ ] **5.1 — Tests unitaires du composant métier** + jeu d'essai documenté · `kit: jest.md` · ✔ Validé si : RG-01→07 couvertes, jeu d'essai (entrée/attendu/obtenu) rédigé pour le dossier.
- [ ] **5.2 — Tests d'intégration** (endpoints + accès SQL & NoSQL) · ✔ Validé si : parcours session complet testé de l'API à la base.
- [ ] **5.3 — Tests e2e du parcours pivot** (connexion → réviser → bilan) · `kit: cypress.md` · ✔ Validé si : scénario e2e vert.
- [ ] **5.4 — Tests de sécurité (misuse cases)** MUC01→07 · `kit: security.md` · ✔ Validé si : au moins triche/IDOR/élévation de privilège couverts par des tests qui échouent côté attaquant.
- [ ] **5.5 — Rapport de couverture** · ✔ Validé si : couverture générée, points faibles identifiés.

---

## Phase 6 — Déploiement & DevOps

_(CDA : « Préparer le déploiement » + « Mise en production DevOps »)_

- [ ] **6.1 — Dockerfiles durcis** (api + web) · `kit: docker.md` · ✔ Validé si : `hadolint` passe, images multi-stage, non-root.
- [ ] **6.2 — Pipeline CI complet** (lint + test + build + SCA/SBOM) · `kit: ci-cd.md`, `security.md` (r3) · ✔ Validé si : toutes les étapes vertes, SBOM généré.
- [ ] **6.3 — Procédure de déploiement documentée** · ✔ Validé si : étapes de déploiement + rollback écrites (pour l'entretien technique).
- [ ] **6.4 — Déploiement sur l'environnement cible** ↗ · ✔ Validé si : appli accessible en ligne (bonus, non exigé).

---

## Phase 7 — Dossier & soutenance (CDA)

- [ ] **7.1 — Rédiger le dossier de projet** (plan « formation », 40–60 p.) · ✔ Validé si : suit le plan du référentiel (besoins, archi, MCD/MPD, maquettes, code, sécurité, tests, veille).
- [ ] **7.2 — Sélectionner les extraits de code significatifs** (UI, métier, accès données) · ✔ Validé si : extraits commentés avec justification des choix.
- [ ] **7.3 — Jeu d'essai de la fonctionnalité représentative (UC10)** · ✔ Validé si : données en entrée / attendues / obtenues + analyse des écarts.
- [ ] **7.4 — Veille sécurité** (vulnérabilités trouvées / corrigées) · ✔ Validé si : démarche de veille décrite + exemples concrets.
- [ ] **7.5 — Support de présentation (diaporama)** · ✔ Validé si : suit le plan de présentation du référentiel.
- [ ] **7.6 — Répétition orale** (timing ~40 min présentation) · ✔ Validé si : blanc chronométré réalisé au moins une fois.

---

## Notes

- Ce plan couvre **tout le cycle**, mais tu peux te concentrer sur la **Phase 1** pour l'instant.
- Les `↗` sont optionnels : ne les fais que si tu es en avance sur ton budget (~40 h de dev, échéance début septembre).
- À chaque fin de phase : demande à Claude « _valide la phase N_ » — il repasse les « ✔ Validé si » un par un.
