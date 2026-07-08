---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: clean-code
title: Clean Code
discipline: clean-code
kind: code
tech: [] # agnostique : artisanat du code valable sur tout projet (front comme back).
layer: shared
phase: [implementation, review]
level:
  guardrail # défaut : le clean code est la norme non négociable du projet.
  # Les 2 règles qui sont des arbitrages de conception dans le livre
  # (R8 objets/structures, R12 abstractions) restent "preference".
status: active
version: 1.0
sources:
  - 'Clean Code: A Handbook of Agile Software Craftsmanship — Robert C. Martin, Prentice Hall, 2008'
  - 'ch.2 Meaningful Names · ch.3 Functions · ch.4 Comments · ch.5 Formatting'
  - 'ch.6 Objects and Data Structures · ch.10 Classes · ch.12 Emergence · ch.17 Smells and Heuristics'
---

# Clean Code

> **Intention :** du code qui se lit comme de la prose — révélateur d'intention, petit, sans duplication,
> sans surprise. Ce fichier porte l'artisanat transverse (noms, fonctions, commentaires, format, objets,
> classes, design simple). Ce qui a une discipline propre est délégué : gestion d'erreur → `error-handling.md`,
> tests → `_strategy.md`, DI/systèmes → `architecture/`, spécifique TypeScript → `typescript.md`.
> **Applies to :** `**/*.{ts,tsx,js,jsx}`.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Noms révélateurs d'intention {#clean-code.r1}

- **Règle :** choisir des noms qui disent **pourquoi** la chose existe, **ce** qu'elle fait et **comment** elle s'utilise. Prononçables et recherchables ; la longueur du nom suit la taille de la portée. Pas d'encodage (notation hongroise, préfixes `m_`, `I` devant les interfaces), pas de désinformation (`accountList` qui n'est pas une `List`).
- **Pourquoi :** « si un nom exige un commentaire, c'est qu'il ne révèle pas son intention » (ch2). Un bon nom supprime le besoin de commentaire et rend le code modifiable.
- **Vérifié par :** manuel.
- **Check (review) :** pas de noms à une lettre hors boucle courte, pas de `data`/`info`/`tmp` opaques, pas d'encodage de type/scope dans le nom.
- ✅ **Bon :** `const elapsedDays = ...;` · `getFlaggedCells()`
- ❌ **Mauvais :** `const d; // elapsed time in days` · `int[] list1`

### R2 — Un mot par concept, vocabulaire cohérent {#clean-code.r2}

- **Règle :** un seul terme par concept abstrait dans tout le code (`get` **ou** `fetch` **ou** `retrieve`, pas les trois). Classes = noms (`Customer`, `AddressParser`), méthodes = verbes (`postPayment`, `deletePage`). Éviter les _noise words_ (`ProductInfo` vs `ProductData`, `Manager`, `Processor`).
- **Pourquoi :** un lexique cohérent permet de deviner le bon nom sans explorer le code (ch2). Des distinctions qui ne distinguent rien (`Customer` vs `CustomerObject`) trompent le lecteur.
- **Vérifié par :** manuel.
- **Check (review) :** un même concept porte le même verbe partout ; pas de paires `X`/`XInfo`/`XData` indistinctes.
- ✅ **Bon :** `getUser()` partout (jamais `fetchUser` ailleurs pour la même idée).
- ❌ **Mauvais :** `getActiveAccount()` / `getActiveAccounts()` / `getActiveAccountInfo()` côte à côte.

### R3 — Fonctions petites, qui font une seule chose {#clean-code.r3}

- **Règle :** des fonctions **courtes**, qui **font une seule chose** et le font bien, à un **seul niveau d'abstraction**. Les instructions d'une fonction descendent d'un cran sous son nom (stepdown rule) ; pas de niveaux mélangés (concepts haut niveau et `.append("\n")` dans la même fonction).
- **Pourquoi :** « functions should do one thing, do it well, do it only » (ch3). Si on peut extraire une autre fonction dont le nom n'est pas une simple paraphrase, la fonction faisait plus d'une chose.
- **Vérifié par :** manuel (+ ESLint si `max-lines-per-function`/`complexity` configuré dans `tooling/`).
- **Check (review) :** indentation rarement > 2 ; pas de sections (« déclarations / init / traitement ») au sein d'une fonction ; un `switch` sur un type est isolé derrière du polymorphisme (G23).
- ✅ **Bon :** `if (isTestPage(page)) includeSetupAndTeardowns(page);`
- ❌ **Mauvais :** une fonction de 60 lignes qui crée des buffers, parse, rend du HTML et logge.

### R4 — Peu d'arguments, pas de flag {#clean-code.r4}

- **Règle :** viser 0 à 2 arguments ; 3 à éviter ; au-delà, **regrouper** dans un objet. Pas d'**argument booléen de drapeau** (il annonce que la fonction fait deux choses). Pas d'argument de **sortie** : si la fonction transforme, retourne le résultat.
- **Pourquoi :** chaque argument ajoute de la charge cognitive et démultiplie les cas de test ; `render(true)` est illisible, mieux vaut `renderForSuite()` / `renderForSingleTest()` (ch3).
- **Vérifié par :** manuel (+ ESLint `max-params` si configuré).
- **Check (review) :** pas de paramètre `boolean` qui pilote deux comportements ; groupes de params cohérents (`x, y` → `Point`) extraits en objet.
- ✅ **Bon :** `makeCircle(center: Point, radius: number)`
- ❌ **Mauvais :** `makeCircle(x, y, radius)` · `save(user, true)`

### R5 — Pas d'effets de bord ; séparer commande et requête {#clean-code.r5}

- **Règle :** une fonction ne fait **rien d'autre** que ce que son nom annonce — aucun effet de bord caché (init de session, mutation d'un global). **Command-Query Separation** : une fonction **change un état** _ou_ **retourne une information**, jamais les deux.
- **Pourquoi :** « les effets de bord sont des mensonges » et créent des couplages temporels (ch3). `if (set("username", "bob"))` est ambigu : commande ou question ?
- **Vérifié par :** manuel.
- **Check (review) :** un getter ne mute pas ; une commande ne renvoie pas un état interrogé dans un `if` ; pas de `checkX` qui initialise au passage.
- ✅ **Bon :** `if (attributeExists(k)) setAttribute(k, v);`
- ❌ **Mauvais :** `public boolean set(attr, val)` utilisé comme prédicat.

### R6 — S'exprimer dans le code, pas dans les commentaires {#clean-code.r6}

- **Règle :** préférer rendre le code expressif plutôt que de le commenter (extraire une fonction/variable bien nommée). Réserver les commentaires aux cas qui le justifient : légal, explication d'intention, avertissement de conséquence, `TODO`, amplification. **Bannir** : commentaires redondants/bruyants, journaux de changements, code commenté, marqueurs de position, signatures (`// Added by Rick`).
- **Pourquoi :** « les commentaires sont, au mieux, un mal nécessaire » ; ils mentent quand le code évolue sans eux (ch4). Le contrôle de version garde l'historique : pas besoin de code commenté ni de journaux.
- **Vérifié par :** manuel.
- **Check (review) :** un commentaire pourrait-il être remplacé par un nom de fonction/variable ? Pas de bloc de code commenté ni de javadoc redondant.
- ✅ **Bon :** `if (employee.isEligibleForFullBenefits())`
- ❌ **Mauvais :** `// Check if eligible …` au-dessus d'une condition cryptique ; `// const old = …` laissé en place.

### R7 — Formatage cohérent et automatisé {#clean-code.r7}

- **Règle :** une équipe = **un** style de formatage, appliqué automatiquement. Séparer les concepts par des lignes vides (openness verticale) ; garder le lié vertically proche (déclaration près de l'usage, fonction appelante **au-dessus** de l'appelée) ; lignes courtes ; indentation respectée (jamais de scope écrasé sur une ligne).
- **Pourquoi :** « le formatage, c'est de la communication » et la lisibilité survit au code (ch5). Le style se décide une fois, en équipe, puis s'outille.
- **Vérifié par :** **`prettier`** (config dans `tooling/.prettierrc`) — formatage enforced gratuitement, retiré de la revue LLM.
- **Check (review) :** scopé au style non couvert par Prettier (ordre vertical appelant→appelé, regroupements logiques) ; le reste est délégué.
- ✅ **Bon :** fonctions ordonnées du plus haut niveau au plus bas, séparées par des lignes vides.
- ❌ **Mauvais :** déclarations de variables d'instance enfouies au milieu de la classe.

### R8 — Objets vs structures de données : ne pas mélanger {#clean-code.r8}

- **Règle :** un **objet** cache ses données et expose un comportement ; une **structure de données** expose ses données et n'a pas de logique. Choisir l'un **ou** l'autre selon l'axe d'évolution attendu ; ne pas créer d'**hybrides** (mi-objet mi-structure avec getters/setters _et_ logique métier). Préférer des **abstractions** à l'exposition brute des champs via getters/setters.
- **Pourquoi :** objets et structures sont des opposés complémentaires : l'OO facilite l'ajout de types, le procédural l'ajout de fonctions (ch6). Les hybrides cumulent les inconvénients des deux.
- **Niveau :** preference <!-- arbitrage de conception : « everything is an object is a myth » (ch6) -->
- **Vérifié par :** manuel.
- **Check (review) :** pas de classe à la fois porteuse de logique et exposant tous ses champs ; un DTO reste une structure (pas de règle métier dedans).
- ✅ **Bon :** `vehicle.getPercentFuelRemaining()` (abstraction).
- ❌ **Mauvais :** une classe avec logique métier **et** getters/setters publics sur tous ses champs.

### R9 — Loi de Demeter : parler aux amis, pas aux étrangers {#clean-code.r9}

- **Règle :** une méthode ne devrait appeler que les méthodes : de sa propre classe, des objets qu'elle crée, de ses arguments, de ses variables d'instance. Ne pas naviguer dans les entrailles d'objets retournés — éviter les _train wrecks_ `a.getB().getC().getD()`.
- **Pourquoi :** chaîner les appels expose la structure interne au lieu de la cacher et couple fortement l'appelant à la topologie des objets (ch6). « Tell, don't ask » : dire à l'objet de faire, pas l'interroger sur ses internes.
- **Vérifié par :** manuel.
- **Check (review) :** pas de chaîne d'appels traversant plusieurs objets _à comportement_ ; si la cible est une vraie structure de données, l'accès direct est toléré.
- ✅ **Bon :** `ctxt.createScratchFileStream(name)`
- ❌ **Mauvais :** `ctxt.getOptions().getScratchDir().getAbsolutePath()`

### R10 — Classes petites, à responsabilité unique (SRP) {#clean-code.r10}

- **Règle :** mesurer une classe en **responsabilités**, pas en lignes. **SRP** : une classe a **une seule raison de changer**. Son nom doit décrire sa responsabilité ; les _weasel words_ (`Manager`, `Processor`, `Super`) signalent une agrégation de responsabilités.
- **Pourquoi :** « on doit pouvoir décrire la classe en ~25 mots sans _if/and/or/but_ » (ch10). Beaucoup de petites classes bien nommées valent mieux qu'une _God class_.
- **Vérifié par :** manuel.
- **Check (review) :** le nom est précis et non fourre-tout ; une description courte sans « et » est possible ; pas de méthodes privées ne servant qu'un sous-ensemble (signal de classe cachée).
- ✅ **Bon :** une classe `Version` extraite d'un `SuperDashboard`.
- ❌ **Mauvais :** une classe `SuperDashboard` qui suit la version _et_ gère l'UI.

### R11 — Forte cohésion ; scinder quand elle chute {#clean-code.r11}

- **Règle :** peu de variables d'instance, chacune utilisée par beaucoup de méthodes. Quand des variables ne servent qu'à un sous-groupe de méthodes, c'est une **classe qui veut sortir** : la scinder.
- **Pourquoi :** une forte cohésion signifie que méthodes et variables « forment un tout logique » (ch10). Garder des fonctions courtes fait souvent émerger de nouvelles petites classes cohésives.
- **Vérifié par :** manuel.
- **Check (review) :** pas de groupe de variables n'interagissant qu'avec un sous-ensemble isolé de méthodes.
- ✅ **Bon :** une `Stack` où push/pop/size partagent les mêmes champs.
- ❌ **Mauvais :** une classe dont la moitié des champs ne sert qu'à 2 méthodes sur 10.

### R12 — Organiser pour le changement : dépendre d'abstractions {#clean-code.r12}

- **Règle :** structurer pour minimiser l'impact du changement. **OCP** : ouvert à l'extension, fermé à la modification (ajouter une fonctionnalité = ajouter une classe, pas modifier l'existant). **DIP** : dépendre d'**abstractions** (interfaces), pas de détails concrets — ce qui isole du changement et rend testable.
- **Pourquoi :** dépendre d'une interface `StockExchange` plutôt que de `TokyoStockExchange` permet de tester et d'évoluer sans risque (ch10). _(Le câblage DI concret — conteneur, factories — relève de `architecture/`.)_
- **Niveau :** preference <!-- arbitrage : une abstraction « pour tout » est de la sur-ingénierie (cf. R14) -->
- **Vérifié par :** manuel.
- **Check (review) :** les collaborations critiques passent par des abstractions injectées ; ajouter une variante ne force pas à rouvrir une classe existante.
- ✅ **Bon :** `constructor(private exchange: StockExchange)`
- ❌ **Mauvais :** instancier `new TokyoStockExchange()` en dur au cœur de la logique.

### R13 — DRY : éliminer la duplication {#clean-code.r13}

- **Règle :** ne pas dupliquer — ni à l'identique, ni en variantes proches, ni en duplication d'implémentation (`isEmpty()` doit s'appuyer sur `size()`). Extraire (fonction, classe, _template method_) dès quelques lignes répétées.
- **Pourquoi :** « la duplication est peut-être la racine de tout mal dans le logiciel » (ch3/ch12) : elle multiplie le coût de modification et les risques d'oubli.
- **Vérifié par :** manuel.
- **Check (review) :** pas d'algorithme copié à plusieurs endroits ; les variantes partagent une base commune.
- ✅ **Bon :** factoriser la logique commune de `scale()` et `rotate()` dans `replaceImage()`.
- ❌ **Mauvais :** le même bloc de calcul recopié dans 4 méthodes.

### R14 — Design simple (règles de Kent Beck, par priorité) {#clean-code.r14}

- **Règle :** viser un design simple selon les 4 règles, **dans cet ordre** : (1) **passe tous les tests** ; (2) **aucune duplication** ; (3) **exprime l'intention** de l'auteur ; (4) **minimise le nombre de classes/méthodes**. La règle 4 est la moins prioritaire : ne pas sur-découper par dogme (interface pour chaque classe, séparation systématique données/comportement).
- **Pourquoi :** ces règles font émerger un bon design et facilitent l'application de SRP/DIP (ch12). Tester pousse vers des classes petites et faiblement couplées.
- **Vérifié par :** manuel (la règle 1 est couverte par la suite de tests — voir `_strategy.md`).
- **Check (review) :** pas de duplication ; intention claire ; ni God class, ni explosion de classes/méthodes triviales par dogmatisme.
- ✅ **Bon :** extraire juste assez de classes pour exprimer les responsabilités, pas plus.
- ❌ **Mauvais :** une interface mono-implémentation pour chaque classe « par principe ».

## Anti-patterns

<!-- aide-mémoire pour la review ; codes = heuristiques du ch.17 du livre -->

- Nom non descriptif / à mauvais niveau d'abstraction (N1, N2) → #clean-code.r1
- Encodage de type dans le nom, nom ambigu (N4, N6) → #clean-code.r1
- Vocabulaire incohérent pour un même concept → #clean-code.r2
- Fonction qui fait plus d'une chose / descend de plusieurs niveaux (G30, G34) → #clean-code.r3
- `if/else` ou `switch` répété au lieu de polymorphisme (G23) → #clean-code.r3
- Trop d'arguments (F1), argument de sortie (F2), argument drapeau (F3, G15) → #clean-code.r4
- Couplage temporel caché / effet de bord (G31) → #clean-code.r5
- Commentaire redondant/obsolète/mal écrit (C2, C3, C4) → #clean-code.r6
- Code commenté laissé en place (C5) → #clean-code.r6
- Désordre vertical / déclaration loin de l'usage (G10) → #clean-code.r7
- Hybride objet/structure de données → #clean-code.r8
- Train wreck `a.getB().getC()` / navigation transitive (G36) → #clean-code.r9
- Classe fourre-tout (`Manager`/`Processor`), responsabilité mal placée (G17) → #clean-code.r10
- Classe peu cohésive (champs utilisés par un sous-ensemble) → #clean-code.r11
- Dépendance sur un détail concret au lieu d'une abstraction → #clean-code.r12
- Duplication (G5) → #clean-code.r13
- Nombre magique non nommé (G25) → #clean-code.r13/#clean-code.r1
- Conditionnel non encapsulé / négatif (G28, G29) → #clean-code.r6

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Les 4 règles du design simple (Kent Beck, par ordre d'importance, ch12).** Un design est « simple » s'il :

1. **passe tous les tests** ; 2. **ne contient aucune duplication** ; 3. **exprime l'intention** du programmeur ;
2. **minimise le nombre de classes et de méthodes**. Les règles 2-4 s'appliquent par refactoring continu une
   fois les tests en place.

**Dichotomie objet / structure de données (ch6) :**

- _Code procédural_ (structures de données) : facile d'ajouter des **fonctions** sans toucher aux structures ;
  difficile d'ajouter une **structure** (toutes les fonctions changent).
- _Code OO_ (objets) : facile d'ajouter des **types** sans toucher aux fonctions ; difficile d'ajouter une
  **fonction** (toutes les classes changent).
- « L'idée que tout est objet est un mythe » : parfois une simple structure de données + procédures est le bon
  choix. Le **DTO** (champs publics, pas de logique) et l'**Active Record** sont des structures de données :
  mettre les règles métier dans des objets séparés.

**Loi de Demeter (ch6), définition précise.** Une méthode `f` de la classe `C` ne devrait appeler que les
méthodes de : `C` elle-même · un objet créé par `f` · un objet passé en argument à `f` · un objet détenu en
variable d'instance de `C`. Elle ne devrait **pas** appeler de méthodes sur les objets _retournés_ par ces
appels. Nuance : si la cible est une **structure de données** (pas un objet à comportement), la navigation
n'est pas une violation.

**Test de taille d'une classe (ch10) :** décrire la classe en ~25 mots **sans** utiliser « if », « and »,
« or », « but ». Le premier « and » trahit une responsabilité de trop.

**Command-Query Separation (ch3) :** `boolean set(attr, val)` mélange action et question → séparer en
`attributeExists()` (query) et `setAttribute()` (command).

**Carte des délégations (ne pas dupliquer ici) :**

- gestion d'erreur (exceptions vs codes, ne pas retourner/passer `null`, normal flow) → `rules/backend/error-handling.md` ;
- tests propres, FIRST, un concept par test, TDD → `rules/testing/_strategy.md` ;
- frontières / code tiers / learning tests, et DI / factories / systèmes → `rules/backend/*` et `rules/architecture/` ;
- règles spécifiques au typage → `rules/shared/typescript.md` ;
- concurrence → hors scope de ce fichier.

**Enforcement gratuit (couche zéro-token) :** le **formatage** (R7) est délégué à **Prettier**
(`tooling/.prettierrc`). Certaines règles structurelles peuvent être enforced par **ESLint** si configuré dans
`tooling/eslint.config.mjs` (p. ex. longueur de fonction, complexité cyclomatique, nombre de paramètres,
réassignation de paramètres) — à activer pour les retirer de la revue manuelle.

**Note sur le langage :** les exemples du livre sont en Java ; les principes sont agnostiques et transposés ici
en TypeScript (contexte React/Nest). Tous restent valables tel quel.
