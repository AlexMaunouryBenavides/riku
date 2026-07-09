# Spécifications techniques — Riku

> Livrable de conception (tâche 1.10). Décrit **l'architecture logicielle**, la **stack**, la **stratégie de sécurité**
> et l'**éco-conception**. S'appuie sur `kit/rules/architecture/clean-archi-back.md`, `nest.md`, `react.md`,
> `shared/security.md`. Complète `cas-utilisation.md` (le *quoi*) et `modele-donnees.md` (le *stocker*).

---

## 1. Nature de l'application

Application web **multicouche répartie** : un client **React (SPA)** et une **API REST NestJS**, séparés,
communiquant en HTTPS/JSON. Deux bases : **MySQL** (relationnel, via TypeORM) et **MongoDB** (documentaire, via Mongoose).

---

## 2. Stack technique

| Domaine | Choix | Statut |
| --- | --- | --- |
| Runtime | **Node.js 26.x** | décidé (G) — **écart assumé à `docker.r2`** |
| Langage | **TypeScript** | figé (`kit typescript.md`) |
| Backend | **NestJS** | figé (`kit nest.md`) |
| Style d'API | **REST** | figé (`kit api-design.md`) |
| ORM SQL | **TypeORM → MySQL** | figé |
| Accès NoSQL | **Mongoose (`@nestjs/mongoose`) → MongoDB** | décidé (A) |
| Validation entrées | **class-validator + ValidationPipe** | figé (`kit validation.md`) |
| Auth | **JWT (access) en cookie `httpOnly` + Passport (`passport-jwt`)** | décidé (C) |
| Hash mot de passe | **Argon2id** | figé (`kit security.md` r4) |
| Frontend | **React + Vite** | figé (`kit react.md`) |
| Données serveur (front) | **TanStack Query (React Query)** | figé (`kit data-fetching.md`) |
| Formulaires | **React Hook Form + Zod** | décidé (E) |
| UI / style | **Tailwind CSS + shadcn/ui** | décidé (B) |
| Tests | **Jest** (back) · **Vitest** (front) · **Cypress** (e2e) | figé (`kit`) |
| Monorepo | **pnpm workspaces** (`apps/api`, `apps/web`) | décidé (D) |
| Conteneurs | **Docker + docker-compose** | figé (`kit docker.md`) |
| CI | **GitHub Actions** | figé (`kit ci-cd.md`) |
| Déploiement | démo **locale `docker compose`** en priorité ; en ligne = bonus | décidé (F, à finaliser en phase 6) |

> **(G) — Écart délibéré à `docker.r2` (« image de base épinglée à une LTS »).**
> Le poste de développement, les images Docker (`node:26-alpine`) et la CI tournent tous sur **Node 26.x**,
> une version _Current_ : Node 26 est sortie le 5 mai 2026 et ne passera LTS que le 28 octobre 2026,
> soit après la soutenance. Le tag `lts` de l'image officielle désigne donc Node 24 (Krypton, EOL avril 2028).
>
> **Pourquoi cet écart :** privilégier la **cohérence dev ↔ image ↔ CI** sur un même runtime plutôt que de faire
> diverger le poste et la production. Node 26 n'est pas en fin de vie (EOL avril 2029) et reçoit les correctifs
> de sécurité ; l'écosystème du projet la supporte (`engines` de `typeorm@1.0.0` : `>=24.11.0` ; `argon2` expose
> des binaires **N-API**, à ABI stable, donc aucun recompilage natif requis — vérifié).
>
> **Ce qu'on accepte :** Node.js ne recommande pas une version _Current_ pour la production, et la règle
> `docker.r2` est un `guardrail`. L'écart est donc conscient et limité dans le temps : au 28 octobre 2026,
> Node 26 devient LTS et l'écart se referme de lui-même, sans changer une ligne.

---

## 3. Architecture logicielle (multicouche, Clean Architecture)

Règle de dépendance (`kit clean-archi-back.md`) : **les dépendances pointent vers l'intérieur**. Le **domaine** ne
dépend d'aucun framework ; l'**infrastructure** implémente les ports définis plus au centre.

```
┌──────────────────────────────────────────────────────────────┐
│  PRÉSENTATION — React SPA (apps/web)                          │
│  composants, pages, React Query, RHF+Zod, Tailwind/shadcn     │
└───────────────┬──────────────────────────────────────────────┘
                │ HTTPS / JSON (REST)
┌───────────────▼──────────────────────────────────────────────┐
│  API / ADAPTERS — NestJS (apps/api)                          │
│  Controllers · DTOs · Guards · Pipes · Exception filter      │
├──────────────────────────────────────────────────────────────┤
│  APPLICATION — Services / cas d'usage                        │
│  AuthService · RevisionService · CatalogService · …          │
├──────────────────────────────────────────────────────────────┤
│  DOMAINE — Métier pur (aucun framework)                      │
│  Entités · SpacedRepetitionPolicy (RG-01→07) · ports         │
├──────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE — Implémentations                            │
│  TypeORM repositories (MySQL) · Mongoose models (MongoDB)    │
└──────────────────────────────────────────────────────────────┘
```

**Rôle de chaque couche :**

| Couche | Responsabilité | Ne fait PAS |
| --- | --- | --- |
| Présentation | Afficher, capter les actions, gérer l'état serveur (React Query) | de logique métier |
| API / Adapters | Traduire HTTP ↔ application : validation (DTO), autorisation (guards), erreurs | de règles métier |
| Application | Orchestrer un cas d'usage (transaction, appels domaine + infra) | de détails HTTP ni SQL |
| Domaine | Les **règles métier** pures et testables (répétition espacée) | aucune I/O, aucun framework |
| Infrastructure | Parler à MySQL / MongoDB, implémenter les ports | de décisions métier |

## 4. Découpage backend (modules NestJS)

| Module | Contenu | Couches |
| --- | --- | --- |
| `auth` | inscription, connexion, JWT, guards (rôle + propriété) | API + application + domaine |
| `users` | entité `User`, accès utilisateur | application + infra |
| `catalog` | `Theme`, `Question`, `Response` — CRUD admin | API + application + infra |
| `revision` | sessions, réponse, **`SpacedRepetitionPolicy`**, progression | les 4 couches |
| `shared` | config, sécurité, filtre d'exceptions, logging | transverse |

> Le **cœur noté** vit dans `revision/domain` : `SpacedRepetitionPolicy` = fonctions pures (`nextState`,
> `intervalForBox`) sans dépendance → testables unitairement (RG-01→07).

## 5. Accès aux données (SQL + NoSQL)

- **MySQL (TypeORM)** — catalogue et état courant : `users`, `themes`, `questions`, `responses`, `practice` (cartes).
  Repositories injectés, **requêtes paramétrées** (jamais de concaténation).
- **MongoDB (Mongoose)** — journal fonctionnel : collection `sessions` (réponses imbriquées). Alimente la
  progression (UC13). *Justification documentaire : voir `modele-donnees.md` §0 et §4.*

---

## 6. Stratégie de sécurité (mappée OWASP Top 10:2025 — `kit security.md`)

| Risque OWASP | Mesure dans Riku | Règle kit |
| --- | --- | --- |
| **A01** Broken Access Control | Guards **deny-by-default** ; `RolesGuard` (admin vs student) ; **vérification de propriété** (un apprenant n'accède qu'à ses données) | `security.r1` |
| **A02** Misconfiguration | `helmet` (en-têtes de sécurité) ; config validée au boot ; **aucun secret en dur** (`.env`) | `security.r2`, `configuration.md` |
| **A03** Supply chain | `pnpm audit` / SCA en CI ; lockfile commité ; dépendances minimales | `security.r3`, `ci-cd.md` |
| **A04** Cryptographic | Mots de passe **Argon2id** (salés) ; TLS en prod ; JWT **signé** | `security.r4` |
| **A05** Injection | TypeORM **paramétré** ; `ValidationPipe` (validation positive) ; Mongoose (pas de `$where` dynamique) | `security.r5`, `validation.md` |
| **A06** Insecure Design | **cas de mésusage** rédigés (`cas-utilisation.md` §7) ; threat modeling de l'auth et de la révision | `security.r6` |
| **A07** Auth Failures | **rate-limit** du login (`@nestjs/throttler`) ; pas de compte par défaut ; cookie JWT **`httpOnly` + `secure` + `sameSite`** ; anti-énumération de comptes | `security.r7` |
| **A08** Data Integrity | pipeline CI contrôlé ; pas de désérialisation de données non fiables | `security.r8` |
| **A09** Logging | journaliser les **événements de sécurité** (login OK/KO, refus d'accès) avec contexte, sans secret/PII | `security.r9`, `observability.md` |
| **A10** Exceptional Conditions | **filtre d'exceptions global** fail-closed ; message générique au client (pas de stack trace) ; quotas/throttling | `security.r10`, `error-handling.md` |

**Point sécurité spécifique au métier :** la **correction se fait côté serveur uniquement** ; la bonne réponse
n'est **jamais** envoyée au client avant soumission (anti-triche, MUC01).

---

## 7. Éco-conception (identifiée — exigence référentiel)

- **Requêtes maîtrisées** : sélection limitée à `N` cartes/session ; pagination des listes admin ; index sur les FK et sur `practice.next_service_date` (le filtre des cartes dues).
- **Pas de sur-transfert** : DTO renvoyant le strict nécessaire (jamais le `hashed_password`, jamais les bonnes réponses avant soumission).
- **Cache côté client** : React Query évite les appels réseau redondants.
- **Sobriété des dépendances** : stack minimale, pas de librairie superflue (impact bundle + supply chain).
- **Soft-delete** (`is_active`) plutôt que suppressions/réécritures massives.

---

## 8. Tests & déploiement (renvois)

- **Plan de tests** détaillé : tâche 1.11 (`kit _strategy.md`). Résumé : unitaires sur le domaine (répétition
  espacée), intégration sur les endpoints + accès SQL/NoSQL, e2e Cypress sur le parcours pivot, tests des mésusages.
- **Déploiement** : conteneurs Docker, `docker compose up` en local (démo prioritaire), CI GitHub Actions
  (lint + test + build). Cible en ligne = bonus (phase 6).
