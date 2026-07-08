---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: clean-archi-front
title: Clean Architecture — frontend (Humble Object & règle de dépendance)
discipline: architecture
kind: code
tech: [] # principe agnostique ; la réconciliation avec React est en Reference.
layer: frontend
phase: [design, implementation, review]
level:
  preference # cède devant le socle du framework (react.md = guardrail des Rules of React)
  # et les conventions du projet. React étant permissif, ces règles guident sans forcer.
status: active
version: 1.0
sources:
  - books/Clean Architecture A Craftsman's Guide to Software Structure and Design.pdf # R. C. Martin, ch. 20, 22, 23 (« Presenters and Humble Objects »)
---

# Clean Architecture — frontend (Humble Object & règle de dépendance)

> **Intention :** garder la logique métier/applicative du front **indépendante du framework**, et réduire la
> View à un **objet humble** qui ne fait qu'afficher des données déjà préparées. On applique la règle de
> dépendance et le pattern Humble Object **par-dessus** le socle React : en cas de conflit avec `react.md`
> (`guardrail`) ou une convention du projet, l'idiome React/le projet l'emporte (`level: preference`).
> **Applies to :** organisation du code front en couches (`**/domain/**`, `**/application/**` ou use-cases,
> `**/ui/**` ou composants, `**/infrastructure/**`/adapters), indépendamment du nommage.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Règle de dépendance : le framework est un détail extérieur {#clean-archi-front.r1}

- **Règle :** les dépendances du code source pointent **vers l'intérieur** ; la logique métier/applicative ne **dépend pas** de React (ni du routeur, du client HTTP, du store…). Le framework UI est un **détail**, tenu à la périphérie.
- **Pourquoi :** « Source code dependencies must point only inward » ; « The web is a detail… We keep these things on the outside where they can do little harm. » Une logique qui n'importe pas le framework survit à un changement de framework et se teste seule.
- **Vérifié par :** manuel.
- **Check (review) :** les modules de domaine/use-cases n'importent ni `react` ni une lib UI/réseau ; seules les couches externes (composants, adapters) le font.
- ✅ **Bon :** un module `domain/loan.ts` en TypeScript pur, importé par un composant.
- ❌ **Mauvais :** une règle métier qui importe `react`, `axios` ou un hook de routeur.

### R2 — Humble Object : View humble vs logique de présentation testable {#clean-archi-front.r2}

- **Règle :** séparer les comportements **difficiles à tester** (la **View** : déplacer des données vers l'écran) des comportements **testables** (la **présentation** : formater/décider). La View reste réduite à sa plus simple expression.
- **Pourquoi :** Humble Object pattern — « Split the behaviors into two modules… One is humble… The other contains all the testable behaviors. » « The View is the humble object… It moves data into the GUI but does not process that data. »
- **Vérifié par :** manuel.
- **Check (review) :** le JSX se contente d'afficher ; le formatage (dates, montants, libellés, flags) est extrait dans des fonctions/hooks testables hors de la View.
- ✅ **Bon :** un hook/fonction `toLoanViewModel(loan)` testé seul, le composant affiche le résultat.
- ❌ **Mauvais :** formatage de devise/date et logique conditionnelle d'affichage inlinés dans le JSX.

### R3 — View Model : ne donner à la View que des données simples {#clean-archi-front.r3}

- **Règle :** tout ce qui apparaît à l'écran est préparé **hors de la View** sous forme de données simples (string, boolean, enum) dans un **View Model**. La View n'a plus qu'à charger ces valeurs.
- **Pourquoi :** « Anything and everything that appears on the screen… is represented in the View Model as a string, or a boolean, or an enum. Nothing is left for the View to do other than to load the data from the View Model into the screen. »
- **Vérifié par :** manuel.
- **Check (review) :** le composant reçoit des valeurs prêtes à afficher (texte formaté, booléens d'état) ; pas de calcul de présentation dans le rendu.
- ✅ **Bon :** `{ amount: '−12,00 €', isNegative: true, isSubmitDisabled: false }` consommé tel quel.
- ❌ **Mauvais :** passer un objet `Currency`/`Date` brut et le formater dans le composant.

### R4 — Logique métier/applicative hors des composants {#clean-archi-front.r4}

- **Règle :** placer les règles **métier** (entities) et **applicatives** (use cases) dans des modules **sans dépendance framework**, et les faire **appeler** par les composants. Les composants orchestrent, ils ne portent pas la logique.
- **Pourquoi :** les business rules doivent rester « pristine, unsullied by baser concerns such as the user interface » ; les use cases sont « isolated from such concerns » (UI/framework).
- **Vérifié par :** manuel.
- **Check (review) :** la logique non-UI est dans des modules dédiés testables ; le composant se contente d'appeler un use case et d'en afficher le résultat.
- ✅ **Bon :** `createLoanUseCase(input, deps)` en TS pur, invoqué depuis un handler.
- ❌ **Mauvais :** la séquence métier (validations, calculs, décisions) écrite dans le corps/handlers du composant.

### R5 — Accès aux systèmes externes via des ports (DIP) {#clean-archi-front.r5}

- **Règle :** accéder aux systèmes externes (API, stockage, services) via une **interface (port)** déclarée côté intérieur et **implémentée en périphérie** (adapter). Les use cases dépendent du port, pas de l'implémentation concrète.
- **Pourquoi :** on franchit les frontières en faisant « source code dependencies that oppose the flow of control » via des interfaces (gateways) ; l'implémentation concrète (HTTP/stockage) est un **humble object** au bord.
- **Vérifié par :** manuel.
- **Check (review) :** pas d'appel `fetch`/client HTTP/`localStorage` directement dans un use case ou un composant de logique ; passage par une interface injectée.
- ✅ **Bon :** `LoanGateway` (interface) implémentée par `HttpLoanGateway` (adapter), injectée au use case.
- ❌ **Mauvais :** un composant qui appelle `fetch('/api/loans')` et y mêle la logique métier.

### R6 — Données aux frontières : structures simples, pas de fuite des types externes {#clean-archi-front.r6}

- **Règle :** les données qui franchissent une frontière sont des **structures simples et isolées**. Ne pas laisser une réponse API brute (ou un type d'une lib externe) traverser vers le domaine ou la View ; la **mapper** d'abord.
- **Pourquoi :** « isolated, simple data structures are passed across the boundaries… We don't want to cheat and pass Entity objects or database rows » — sinon l'intérieur dépend de l'extérieur.
- **Vérifié par :** manuel.
- **Check (review) :** la forme renvoyée par l'API est mappée dans l'adapter avant d'entrer dans le use case/domaine ; le View Model est distinct des DTO réseau.
- ✅ **Bon :** `HttpLoanGateway` mappe la réponse JSON en objet domaine.
- ❌ **Mauvais :** propager l'objet de réponse `axios`/le JSON brut jusque dans la logique ou le composant.

### R7 — Testabilité : la logique se teste sans monter le DOM {#clean-archi-front.r7}

- **Règle :** la logique (présentation + métier/applicative) doit être **testable en isolation**, sans rendre de composant ni monter le DOM. Seule la View reste un humble object difficile à tester (et minimal).
- **Pourquoi :** « testability is an attribute of good architectures » ; le Humble Object sépare le testable du non-testable, et « the gateways can be replaced with appropriate stubs and test-doubles ».
- **Vérifié par :** manuel.
- **Check (review) :** les fonctions de présentation et les use cases ont des tests unitaires purs (doublures sur les ports) ; on ne dépend pas d'un rendu React pour tester la logique.
- ✅ **Bon :** tester `toLoanViewModel` et `createLoanUseCase` sans React.
- ❌ **Mauvais :** ne pouvoir vérifier une règle qu'en rendant le composant et en inspectant le DOM.

## Anti-patterns

- Logique métier/use-case important `react`/une lib UI ou réseau → #clean-archi-front.r1
- Formatage/décisions d'affichage inlinés dans le JSX → #clean-archi-front.r2
- Objet `Date`/`Currency` brut passé à la View au lieu d'un View Model → #clean-archi-front.r3
- Séquence métier écrite dans le composant/ses handlers → #clean-archi-front.r4
- `fetch`/`localStorage` appelé directement depuis la logique/le composant → #clean-archi-front.r5
- Réponse API brute propagée jusqu'au domaine/à la View → #clean-archi-front.r6
- Règle testable uniquement via un rendu DOM → #clean-archi-front.r7

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Le pattern Humble Object (source, ch. 23) :** scinder un comportement en deux — un module **humble**
(difficile à tester, réduit à l'essentiel) et un module **testable** (toute la logique extraite). Pour une
GUI : la **View** est humble (déplace les données à l'écran sans les traiter) ; le **Presenter** est testable
(formate les données dans un **View Model** fait de strings/booleans/enums). Ce pattern « often defines an
architectural boundary » et « vastly increases the testability of the entire system ».

**Réconciliation avec le socle React (`react.md` = guardrail ; ce fichier = preference) :**

- **Le composant React = la View (humble) + l'adapter d'UI.** On garde les idiomes React (composants purs,
  JSX, hooks — `react.r1`–`r9`) mais on **extrait** hors du JSX le formatage (R2/R3) et la logique métier
  (R4) vers des modules testables.
- **Le « View Model » se calcule au render** (`react.r10`/`r11` : dériver les données, ne pas les stocker en
  state) ou via une fonction/custom hook pur ; le composant ne fait qu'afficher le résultat (R3).
- **Logique métier/applicative = modules TypeScript purs**, sans `import react`. Le composant les appelle
  depuis un event handler (`react.r2` : effets de bord hors render) — il orchestre, il ne calcule pas.
- **Ports via injection (R5).** L'accès réseau/stockage passe par une interface injectée (props, contexte,
  ou factory) et implémentée en périphérie. react.dev rappelle d'ailleurs que le data fetching relève
  plutôt des mécanismes du framework que de `useEffect` (`react.r10`) : c'est cohérent avec « le réseau est
  un détail au bord ».
- **Conflit permissivité React ↔ séparation CA :** React autorise à tout co-localiser dans le composant ;
  Clean Architecture pousse à séparer. Compromis : **idiomes React au bord** (guardrail), **logique
  framework-free poussée vers l'intérieur** (preference). Si une règle de ce fichier heurte un idiome React
  (`react.md`) ou une convention du projet, signaler l'écart plutôt que de tordre le framework.

**Frontière avec les fichiers voisins :** `react.md` = socle idiomatique React (guardrail des Rules of
React) ; `clean-archi-front.md` (ce fichier) = couches & Humble Object côté front (preference) ;
`clean-code.md` = qualité du code à l'intérieur de chaque couche. Le pendant backend est
`clean-archi-back.md` (mêmes principes, réconciliés avec Nest).

**Source :** Robert C. Martin, _Clean Architecture: A Craftsman's Guide to Software Structure and Design_
(2017) — ch. 20 « Business Rules », ch. 22 « The Clean Architecture », ch. 23 « Presenters and Humble
Objects » → `books/Clean Architecture…​.pdf`.
