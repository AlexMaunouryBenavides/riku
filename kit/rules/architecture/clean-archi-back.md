---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: clean-archi-back
title: Clean Architecture — backend (couches & règle de dépendance)
discipline: architecture
kind: code
tech: [] # principe agnostique ; la réconciliation avec Nest est en Reference.
layer: backend
phase: [design, implementation, review]
level:
  preference # cède devant le socle du framework (nest.md = guardrail) et les conventions
  # du projet. C'est « le reste » par-dessus la mécanique imposée.
status: active
version: 1.0
sources:
  - books/Clean Architecture A Craftsman's Guide to Software Structure and Design.pdf # R. C. Martin, ch. 20 « Business Rules », ch. 22 « The Clean Architecture »
---

# Clean Architecture — backend (couches & règle de dépendance)

> **Intention :** organiser le backend en **couches concentriques** où les détails (web, DB, framework)
> sont à l'extérieur et les règles métier au centre, reliées par la **règle de dépendance**. Ces règles
> se posent **par-dessus** le socle imposé par le framework : en cas de conflit avec `nest.md`
> (`guardrail`) ou une convention du projet, le framework/projet l'emporte (`level: preference`).
> **Applies to :** organisation du code backend en couches (`**/domain/**`, `**/application/**` ou
> use-cases, `**/adapters/**`, `**/infrastructure/**`), indépendamment du nommage exact.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — La règle de dépendance : les dépendances pointent vers l'intérieur {#clean-archi-back.r1}

- **Règle :** les dépendances du **code source** pointent **uniquement vers l'intérieur**, vers les politiques de plus haut niveau. Une couche interne ne connaît **rien** d'une couche externe : ni son nom (classes, fonctions, variables), ni ses formats de données.
- **Pourquoi :** « Source code dependencies must point only inward, toward higher-level policies » ; « Nothing in an inner circle can know anything at all about something in an outer circle. »
- **Vérifié par :** manuel.
- **Check (review) :** aucun `import` d'une couche externe (infra/web/framework) dans une couche interne (use-cases/domain) ; les formats générés par un framework externe ne remontent pas vers l'intérieur.
- ✅ **Bon :** la couche use-cases importe le domaine ; jamais l'inverse, jamais l'infra.
- ❌ **Mauvais :** une entity ou un use case qui importe l'ORM, le client HTTP ou un type du framework.

### R2 — Entities : règles métier critiques, pures {#clean-archi-back.r2}

- **Règle :** les **Entities** encapsulent les _Critical Business Rules_ et leurs _Critical Business Data_ — la logique qui ferait sens même sans système informatique. Aucune préoccupation de DB, d'UI ou de framework tiers.
- **Pourquoi :** « Entities encapsulate enterprise-wide Critical Business Rules… The Entity is pure business and nothing else » ; ce sont les règles « least likely to change when something external changes ».
- **Vérifié par :** manuel.
- **Check (review) :** les entities ne contiennent que des règles/états métier ; pas de décorateur d'ORM, pas d'accès I/O, pas de type framework.
- ✅ **Bon :** une classe `Loan` portant le calcul d'intérêt et ses invariants.
- ❌ **Mauvais :** une entity annotée `@Entity()`/`@Column()` d'un ORM (= modèle de persistance, pas une entity métier).

### R3 — Use cases : règles applicatives qui orchestrent les entities {#clean-archi-back.r3}

- **Règle :** les **use cases** portent les règles **spécifiques à l'application** : ils orchestrent le flux de données vers et depuis les entities et dirigent leurs règles critiques. Ils ignorent l'UI, la DB et les frameworks, et ne décrivent pas _comment_ le système apparaît à l'utilisateur.
- **Pourquoi :** « These use cases orchestrate the flow of data to and from the entities… control the dance of the Entities » ; « isolated from such concerns » (DB/UI/frameworks). Les use cases dépendent des entities, jamais l'inverse.
- **Vérifié par :** manuel.
- **Check (review) :** un use case = une intention applicative ; il appelle les entities et des **ports** (interfaces), sans toucher au web ni à la DB directement.
- ✅ **Bon :** `CreateLoanUseCase` valide la séquence métier puis invoque l'entity `Loan`.
- ❌ **Mauvais :** un use case qui construit une requête SQL ou lit `req`/`res`.

### R4 — Modèles d'entrée/sortie : structures simples, sans dépendance {#clean-archi-back.r4}

- **Règle :** un use case accepte des **request models** simples et renvoie des **response models** simples. Ces structures ne dérivent d'aucune interface de framework (pas de `HttpRequest`/`HttpResponse`) et **ne référencent pas** les entities.
- **Pourquoi :** « accepts simple request data structures… returns simple response data structures… not dependent on anything » ; référencer une Entity « violates the Common Closure and Single Responsibility Principles » (elles changent pour des raisons différentes).
- **Vérifié par :** manuel.
- **Check (review) :** les I/O des use cases sont des DTO/structures plates dédiées, distinctes des entities et des objets du framework.
- ✅ **Bon :** `CreateLoanRequest` / `CreateLoanResponse` propres au use case.
- ❌ **Mauvais :** passer l'entity `Loan` (ou un DTO HTTP du framework) directement en entrée/sortie du use case.

### R5 — Interface adapters : conversion + confinement des détails {#clean-archi-back.r5}

- **Règle :** la couche **interface adapters** convertit les données entre le format interne (entities/use cases) et le format externe (DB, web). Elle contient le MVC (controllers, presenters, views) et **tout le SQL**. Rien en deçà de cette couche ne connaît la DB.
- **Pourquoi :** « adapters that convert data… The presenters, views, and controllers all belong in the interface adapters layer » ; « all SQL should be restricted to this layer… No code inward of this circle should know anything at all about the database. »
- **Vérifié par :** manuel.
- **Check (review) :** SQL/requêtes ORM, mapping persistance↔domaine et (dé)sérialisation HTTP vivent dans les adapters ; pas dans le domaine ni les use cases.
- ✅ **Bon :** un `SqlLoanRepository` (adapter) traduit lignes DB ↔ entity `Loan`.
- ❌ **Mauvais :** du SQL ou un appel ORM dans un use case ou une entity.

### R6 — Frameworks & drivers : les détails restent à l'extérieur {#clean-archi-back.r6}

- **Règle :** la couche externe (DB, serveur web, frameworks) ne contient que du **glue code** vers la couche suivante. Le web, la DB et les frameworks sont des **détails**, tenus à la périphérie.
- **Pourquoi :** « Generally you don't write much code in this layer, other than glue code… The web is a detail. The database is a detail. We keep these things on the outside where they can do little harm. »
- **Vérifié par :** manuel.
- **Check (review) :** changer de DB/serveur/framework n'impacte que cette couche externe ; les couches internes n'y font aucune référence.
- ✅ **Bon :** la config du serveur HTTP et du driver DB isolée en périphérie.
- ❌ **Mauvais :** le choix de framework qui « fuit » jusque dans les règles métier.

### R7 — Franchir les frontières par inversion de dépendance (ports) {#clean-archi-back.r7}

- **Règle :** quand le flux de contrôle doit aller vers l'extérieur (ex. un use case a besoin de persister ou de présenter), passer par une **interface (port) déclarée à l'intérieur** et **implémentée à l'extérieur** (DIP). Les dépendances de code source s'opposent ainsi au flux de contrôle.
- **Pourquoi :** « we resolve this… by using the Dependency Inversion Principle… the use case call an interface (use case output port) in the inner circle, and have the presenter in the outer circle implement it » ; on « create[s] source code dependencies that oppose the flow of control ».
- **Vérifié par :** manuel.
- **Check (review) :** les sorties d'un use case (persistance, présentation, services externes) passent par des interfaces internes ; les implémentations concrètes sont injectées depuis l'extérieur.
- ✅ **Bon :** `LoanRepository` (interface, couche use-cases) implémentée par `SqlLoanRepository` (infra), injectée.
- ❌ **Mauvais :** un use case qui instancie/appelle directement la classe concrète d'infra.

### R8 — Données aux frontières : structures isolées, jamais d'entity ni de ligne DB {#clean-archi-back.r8}

- **Règle :** les données qui **traversent** une frontière sont des **structures simples et isolées**, toujours dans la forme la plus pratique pour la couche **interne**. Ne jamais faire passer une **Entity** ou une **ligne de base de données** vers l'intérieur.
- **Pourquoi :** « isolated, simple data structures are passed across the boundaries. We don't want to cheat and pass Entity objects or database rows… would force an inner circle to know something about an outer circle. »
- **Vérifié par :** manuel.
- **Check (review) :** aux frontières, on échange des DTO/structures plates ; le « row » de l'ORM est mappé avant de franchir vers l'intérieur.
- ✅ **Bon :** mapper la ligne ORM en objet domaine dans l'adapter, puis passer ce dernier au use case.
- ❌ **Mauvais :** renvoyer l'objet ORM brut jusque dans le use case ou le domaine.

### R9 — Indépendance & testabilité des règles métier {#clean-archi-back.r9}

- **Règle :** les règles métier doivent être **testables sans** UI, DB, serveur web ni élément externe, et **indépendantes** du framework, de l'UI, de la DB et de toute agence externe.
- **Pourquoi :** liste des propriétés visées : « Independent of frameworks… Testable… Independent of the UI… Independent of the database… Independent of any external agency. »
- **Vérifié par :** manuel.
- **Check (review) :** les use cases/entities se testent en isolation (doublures sur les ports) ; on peut changer UI/DB sans toucher aux règles métier.
- ✅ **Bon :** tester `CreateLoanUseCase` avec un `LoanRepository` stubé, sans DB.
- ❌ **Mauvais :** ne pouvoir tester une règle métier qu'en démarrant le serveur et la base.

## Anti-patterns

- Import d'une couche externe dans une couche interne → #clean-archi-back.r1
- Entity métier mêlée à l'ORM/au framework → #clean-archi-back.r2
- Use case qui touche web/DB/framework directement → #clean-archi-back.r3
- Entity ou DTO de framework passés en I/O d'un use case → #clean-archi-back.r4
- SQL/ORM ou mapping hors de la couche adapters → #clean-archi-back.r5
- Détail de framework/DB qui fuit vers l'intérieur → #clean-archi-back.r6
- Use case appelant une classe concrète d'infra (pas de port) → #clean-archi-back.r7
- Entity/ligne DB qui franchit une frontière vers l'intérieur → #clean-archi-back.r8
- Règle métier non testable sans DB/serveur → #clean-archi-back.r9

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Les quatre cercles (source, ch. 22), du plus interne au plus externe :**

1. **Entities** — règles métier critiques de l'entreprise (R2) ;
2. **Use Cases** — règles applicatives qui orchestrent les entities (R3) ;
3. **Interface Adapters** — controllers/presenters/views, mapping persistance, tout le SQL (R5) ;
4. **Frameworks & Drivers** — DB, web, frameworks = détails, glue code (R6).
   « There's no rule that says you must always have just these four » — mais la règle de dépendance (R1)
   s'applique toujours : plus on va vers l'intérieur, plus le niveau d'abstraction/politique monte.

**Scénario type (source, ch. 22) :** le serveur web remet l'entrée au **Controller** → il l'empaquette en
objet simple passé via un **InputBoundary** au **UseCaseInteractor** → celui-ci dirige les Entities et
utilise un **DataAccessInterface** pour charger les données depuis la **Database** → il construit
l'**OutputData** (objet simple) passé via un **OutputBoundary** au **Presenter** → le Presenter produit un
**ViewModel** (Strings/flags déjà formatés) que la **View** se contente d'afficher. Toutes les dépendances
de code franchissent les frontières **vers l'intérieur**.

**Réconciliation avec le socle Nest (`nest.md` = guardrail ; ce fichier = preference) :**

- **Controllers Nest = couche interface adapters.** Le rôle « controller fin, frontière HTTP, délègue »
  (`nest.r4`) coïncide avec « controllers belong in the interface adapters layer » (R5). On garde donc les
  controllers Nest tels quels et on y branche les use cases.
- **Use cases & entities = des providers `@Injectable`.** La logique métier vit dans des providers
  (`nest.r5`) ; on y loge use cases (couche application) et entities/services de domaine, sans dépendance
  framework dans les couches internes (R1).
- **Ports via la DI Nest (DIP).** Le franchissement de frontière par interface (R7) s'implémente avec les
  **custom providers tokenisés** de Nest (`nest.r16`) : déclarer un port (`LoanRepository`) côté use-cases,
  l'implémenter en infra (`SqlLoanRepository`), et lier via `{ provide: LoanRepository, useClass: SqlLoanRepository }`.
- **Conflit DTO de validation ↔ request model.** Nest valide des DTO par pipes **au controller**
  (`validation.md`, `nest.r9`) ; Clean Architecture veut des request models sans dépendance framework (R4).
  Réconciliation : garder le **DTO validé au niveau de l'adapter/controller**, puis le **mapper** vers un
  request model neutre avant d'entrer dans le use case. Le framework gagne à la frontière, le domaine reste pur.
- **Modèles d'ORM ≠ entities.** Un modèle annoté par l'ORM est un détail de persistance (couche infra) : il
  ne franchit pas vers l'intérieur (R8), on le **mappe** vers l'entity de domaine dans l'adapter (R5).
- **Précédence générale :** si une de ces règles `preference` heurte une mécanique imposée par Nest
  (`guardrail`) ou une convention déjà en place dans le projet, c'est le framework/projet qui l'emporte ;
  signaler l'écart plutôt que de tordre le framework.

**Frontière avec les fichiers voisins :** `nest.md` = mécanique imposée par le framework (guardrail) ;
`clean-archi-back.md` (ce fichier) = découpage en couches & règle de dépendance (preference) ;
`clean-code.md` = qualité du code à l'intérieur de chaque couche.

**Source :** Robert C. Martin, _Clean Architecture: A Craftsman's Guide to Software Structure and Design_
(2017) — ch. 20 « Business Rules », ch. 22 « The Clean Architecture » → `books/Clean Architecture…​.pdf`.
