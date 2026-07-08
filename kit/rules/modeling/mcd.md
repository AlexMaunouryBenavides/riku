---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: mcd
title: MCD — Modèle Conceptuel de Données (Merise / entités-associations)
discipline: modeling
kind: checklist
tech: [] # agnostique : Merise est une méthodologie, indépendante du SGBD.
layer: db
phase: [design, review] # design : construire le schéma ; review : vérifier un schéma fourni.
level: preference # défaut. Les règles que la source signale « (importante) » sont en guardrail.
status: active
version: 1.0
sources:
  - https://perso.univ-lemans.fr/~cpiau/BD/SQL_PAGES/SQL0.html # C. Piau, « Conception d'une base de données » (source principale)
  - books/merise.pdf # support « Modélisation des SI » (contraintes d'intégrité)
---

# MCD — Modèle Conceptuel de Données (Merise / entités-associations)

> **Intention :** vérifier qu'un schéma entités-associations (MCD) est **bien normalisé** avant toute
> traduction en MLD. On contrôle les entités, les associations, les attributs, les identifiants et les
> cardinalités au regard des règles de normalisation Merise. Le _comment traduire_ en relationnel vit
> dans `mld.md` ; l'optimisation physique dans `mpd.md`.
> **Applies to :** schémas conceptuels / diagrammes entités-associations fournis à l'agent (image,
> description textuelle, ou notation type `Entité(_id_, attr, …)` / `A (c,c) — assoc — (c,c) B`).

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Normaliser les entités : remplacer celles réductibles à une association {#mcd.r1}

- **Règle :** toute entité dont **toutes les associations ont pour cardinalité maximale 1 de son côté et n de l'autre**, et qui est entièrement déterminée par ses entités voisines, doit être remplacée par une **association** branchée à ces voisines (ternaire ou n-aire).
- **Pourquoi :** « toutes les entités qui sont remplaçables par une association doivent être remplacées ». Une entité artificielle alourdit le schéma là où un simple lien sémantique entre 3 entités ou plus suffit.
- **Niveau :** guardrail
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** repérer chaque entité entourée uniquement de cardinalités max (1 au centre, n à l'extérieur) → candidate au remplacement. Vérifier d'abord les cardinalités sur un schéma à associations **binaires** pour ne pas introduire une n-aire abusive.
- ✅ **Bon :** une entité `projections` (déterminée par un créneau + un film + une salle) est remplacée par l'association ternaire `projeter` entre `salles`, `créneaux horaires`, `films`.
- ❌ **Mauvais :** forcer une association ternaire `avions`/`pilotes`/`vols` sans vérifier les cardinalités sur le schéma binaire — l'une des cardinalités maximales ne convient pas (contre-exemple `départs`).

### R2 — Normaliser les noms : unicité + conventions {#mcd.r2}

- **Règle :** le nom d'une **entité**, d'une **association** ou d'un **attribut** est unique dans le schéma. Conventions : entité = nom commun **au pluriel** (`clients`) ; association = **verbe à l'infinitif** (`commander`, `concerner`), éventuellement à la forme passive (`être commandé`) + adverbe (`avoir lieu dans`) ; attribut = nom commun **singulier** (`nom`, `numéro`), éventuellement suffixé de l'entité/association (`nom de client`).
- **Pourquoi :** « le nom d'une entité, d'une association ou d'un attribut doit être unique ». Un nom en double signale soit une modélisation inachevée (deux entités homogènes à fusionner), soit une **redondance** (risque d'incohérence).
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** aucun nom dupliqué ; conventions de nommage respectées.
- ✅ **Bon :** entité `clients`, association `livrer`, attribut `date de livraison`.
- ❌ **Mauvais :** un attribut `adresse` portant la même information dans deux entités → où faut-il livrer ?

### R3 — Normaliser les identifiants {#mcd.r3}

- **Règle :** chaque entité possède un **identifiant** (souligné sur le schéma). Le privilégier **entier, court, auto-incrémenté et stable**. Éviter les identifiants **composés** de plusieurs attributs, les **chaînes** (immatriculation, n° de sécurité sociale, code postal) et tout identifiant **susceptible de changer**.
- **Pourquoi :** « chaque entité doit posséder un identifiant ». Un identifiant composé est mauvais pour les performances et son unicité « finit tôt ou tard par être démentie ». Conclusion de la source : l'identifiant « doit être un entier, de préférence incrémenté automatiquement ».
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** chaque entité a un identifiant ; il n'est ni composé, ni une chaîne instable.
- ✅ **Bon :** `clients(_numéro de client_, nom, …)` — entier auto-incrémenté.
- ❌ **Mauvais :** identifiant `(nom, prénom)`, ou `_numéro de plaque_`.

### R4 — Normaliser les attributs : ni multi-exemplaires, ni calculables {#mcd.r4}

- **Règle :** pas d'attribut « en plusieurs exemplaires » (le remplacer par une **association supplémentaire** de cardinalité maximale n) ; pas d'attribut **calculable** à partir d'autres attributs.
- **Pourquoi :** les attributs en plusieurs exemplaires « posent des problèmes d'évolutivité du modèle » ; les attributs calculables « induisent un risque d'incohérence » entre valeurs de base et valeurs calculées. À bannir notamment : `âge` (calculable depuis la date de naissance), `département` (depuis le code postal).
- **Niveau :** guardrail
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** aucun attribut répété (`adresse 1`, `adresse 2`, …) ; aucun attribut dérivable d'un autre.
- ✅ **Bon :** stocker `date de naissance` et calculer l'âge à la demande.
- ❌ **Mauvais :** attribut `âge` ; attributs `adresse secondaire 1` / `adresse secondaire 2`.

### R5 — Normaliser les attributs des associations {#mcd.r5}

- **Règle :** tout attribut d'une **association** doit dépendre **directement des identifiants de toutes les entités** qu'elle relie. Sinon, extraire l'attribut dans une **entité dédiée**.
- **Pourquoi :** « les attributs d'une association doivent dépendre directement des identifiants de toutes les entités en association ». Exemple : `quantité commandée` dépend bien de (n° client, n° article) ; `date de commande` ne dépend que du client → il faut une entité `commandes` à part.
- **Niveau :** guardrail
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** pour chaque attribut d'association, vérifier la dépendance à **tous** les identifiants reliés. Conséquence à contrôler : une entité reliée en **1,1 ou 0,1 aspire** les attributs de l'association. Pour une association **sans attribut**, lui prêter temporairement un attribut imaginaire pertinent et tester la règle.
- ✅ **Bon :** `commander` porte `quantité` (dépend du client **et** de l'article).
- ❌ **Mauvais :** `commander` porte `date de commande` (ne dépend que du client) → sortir une entité `commandes`.

### R6 — Normaliser les associations : ni fantôme, ni redondante, ni dupliquée {#mcd.r6}

- **Règle :** éliminer les associations **fantômes** (toutes leurs cardinalités valent 1,1), **redondantes** (un chemin déductible d'un autre de même sens/durée de vie → supprimer le plus court) et **en plusieurs exemplaires** (une seule association à la place de plusieurs équivalentes).
- **Pourquoi :** deux chemins entre deux entités ne se justifient que s'ils ont « deux significations ou deux durées de vie différentes » ; sinon le plus court est déductible et doit être supprimé.
- **Niveau :** guardrail
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** aucune association entièrement en 1,1 ; pas deux chemins de même sémantique entre les mêmes entités ; pas d'associations parallèles équivalentes.
- ✅ **Bon :** retrouver le client d'un règlement en passant par la facture, sans association `payer` directe.
- ❌ **Mauvais :** garder `payer` (client→règlement) alors qu'elle est déductible via `facture`.

### R7 — Normaliser les cardinalités : bornes dans {0,1} et {1,n} {#mcd.r7}

- **Règle :** une cardinalité **minimale** vaut **0 ou 1** (jamais 2, 3 ou n) ; une cardinalité **maximale** vaut **1 ou n** (jamais 2, 3, …). Une borne max connue (2, 3…) est traitée comme **n**. Une min de 1 doit se **justifier** (l'individu a besoin de l'association pour exister), sinon elle vaut 0.
- **Pourquoi :** ces bornes « sont amenées à évoluer » ; mieux vaut considérer `n` comme inconnu dès la conception. Une borne minimale > 1 ne se modélise pas.
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** toutes les cardinalités sont (0,1) / (0,n) / (1,1) / (1,n) ; aucune borne chiffrée supérieure à 1.
- ✅ **Bon :** `clients (1,n) — commander — (0,n) articles`.
- ❌ **Mauvais :** une cardinalité `(2,5)`.

### R8 — 1ʳᵉ forme normale : un attribut = une seule valeur {#mcd.r8}

- **Règle :** pour un individu donné, un attribut ne prend **qu'une seule valeur**, jamais une liste ou un ensemble. Si plusieurs valeurs sont nécessaires, en faire une **entité supplémentaire** en association.
- **Pourquoi :** « pour un individu, un attribut ne peut prendre qu'une valeur et non pas, un ensemble ou une liste de valeurs ».
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** aucun attribut multi-valué dans une entité.
- ✅ **Bon :** plusieurs auteurs d'un livre → entité `auteurs` en association avec `livres`.
- ❌ **Mauvais :** un attribut `auteurs` contenant une liste dans l'entité `livres`.

### R9 — 2ᵉ forme normale : dépendance de l'identifiant entier {#mcd.r9}

- **Règle :** si un identifiant est **composé**, tout attribut non-clé doit dépendre de l'identifiant **en entier**, pas d'une seule de ses parties.
- **Pourquoi :** forme normale énoncée par la source. Elle devient sans objet si l'on suit R3 (identifiant entier non composé).
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** aucun attribut ne dépend d'une sous-partie d'un identifiant composé.
- ✅ **Bon :** identifiant entier unique → règle automatiquement respectée.
- ❌ **Mauvais :** entité `clients(_nom_, _prénom_, date de fête)` où `date de fête` ne dépend que de `prénom` → faire une entité `calendrier`.

### R10 — 3ᵉ forme normale de Boyce-Codd : aucune dépendance entre attributs non-clés {#mcd.r10}

- **Règle :** tout attribut d'une entité dépend **directement de son identifiant et d'aucun autre attribut**. Un attribut qui dépend d'un autre attribut (non-clé) est placé dans une **entité séparée**, en association avec la première.
- **Pourquoi :** « tous les attributs d'une entité doivent dépendre directement de son identifiant et d'aucun autre attribut ». Une dépendance entre attributs non-clés crée une redondance et donc un risque d'incohérence.
- **Niveau :** guardrail
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** pour chaque attribut non-clé, vérifier qu'il dépend de l'identifiant et non d'un autre attribut.
- ✅ **Bon :** `avions(_numéro avion_, modèle, propriétaire)` + `modèles d'avion(_modèle_, constructeur, capacité)`.
- ❌ **Mauvais :** `avions(_numéro avion_, modèle, constructeur, capacité, propriétaire)` — `constructeur` et `capacité` dépendent du `modèle`, pas du numéro.

### R11 — Modèle exhaustif, sans redondance ni ambiguïté lexicale {#mcd.r11}

- **Règle :** le modèle doit être **exhaustif** (contenir toutes les informations nécessaires) et **sans redondance**. Éliminer les **synonymes** (plusieurs mots pour un même sens : `nom`/`patronyme`/`appellation`) et les **polysèmes** (un même mot pour plusieurs sens : `qualité`, `statut`).
- **Pourquoi :** la redondance est « une perte d'espace, une démultiplication du travail de maintenance et un risque d'incohérence » ; synonymes et polysèmes rendent le modèle ambigu.
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** aucune information requise manquante ; pas de redondance ; pas de synonymes/polysèmes dans les noms.
- ✅ **Bon :** un seul terme par concept, réutilisé partout.
- ❌ **Mauvais :** `statut` employé tantôt pour l'état d'une commande, tantôt pour le rôle d'un employé.

### R12 — Documenter à part les contraintes d'intégrité non exprimables {#mcd.r12}

- **Règle :** les contraintes de cohérence que le modèle entités-associations **ne peut pas exprimer** doivent être **explicitées textuellement** à côté du schéma : contraintes **statiques** (toujours vraies), **dynamiques** (validées à chaque mise à jour) et **référentielles** (existence d'une occurrence liée).
- **Pourquoi :** ce sont « des règles de cohérence dans la structure des données que le modèle Merise ne peut pas exprimer mais qu'il faut expliciter à part » (source `books/merise.pdf`).
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** les contraintes hors-schéma pertinentes sont listées en annexe du MCD.
- ✅ **Bon :** statique « une date de fin est toujours postérieure à la date de début » ; référentielle « pas de commande pour un fournisseur inexistant » ; dynamique « un livre n'est prêté que si le lecteur en détient moins de 4 ».
- ❌ **Mauvais :** supposer que ces règles « vont de soi » sans les écrire — elles seront perdues à la traduction.

## Anti-patterns

- Entité réductible à une association non remplacée → #mcd.r1
- Noms dupliqués / mauvaises conventions de nommage → #mcd.r2
- Identifiant composé, chaîne instable, ou entité sans identifiant → #mcd.r3
- Attribut multi-exemplaires ou calculable (`âge`, `département`) → #mcd.r4
- Attribut d'association ne dépendant pas de tous les identifiants reliés → #mcd.r5
- Association fantôme (tout en 1,1), redondante ou dupliquée → #mcd.r6
- Cardinalité chiffrée > 1 (ex. `(2,5)`) → #mcd.r7
- Attribut multi-valué dans une entité → #mcd.r8
- Attribut dépendant d'une partie d'un identifiant composé → #mcd.r9
- Attribut dépendant d'un autre attribut non-clé → #mcd.r10
- Redondance, synonymes ou polysèmes ; information manquante → #mcd.r11
- Contraintes d'intégrité non documentées → #mcd.r12

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Concepts de base (définitions de la source) :**

- **Entité** — « une population d'individus homogènes » : des objets dont les informations sont de même nature (ex. `articles`). Deux objets aux informations non homogènes (un article, un client) → deux entités distinctes.
- **Association** — « une liaison qui a une signification précise entre plusieurs entités » (binaire, ternaire, n-aire). Deux entités peuvent être liées **indirectement** via une troisième.
- **Attribut** — « une propriété d'une entité ou d'une association ». Une entité et ses attributs « ne doivent traiter que d'un seul sujet ».
- **Identifiant** — attribut (ou groupe) « sans doublon » qui repère de manière unique chaque individu ; souligné par convention. Une entité possède **au moins** un attribut (son identifiant) ; une association **peut** être dépourvue d'attribut.
- **Cardinalité** — « le minimum et le maximum de fois qu'un individu de l'entité peut être concerné par l'association ». Astuce : poser la question dans les **deux sens** autour de chaque association.

**Cas particuliers d'associations :** _plurielles_ (deux mêmes entités liées plusieurs fois, ex. propriétaire / réside principalement / réside secondairement) ; _réflexive_ (une association branchée deux fois à la même entité, ex. un employé en dirige d'autres) ; _non binaires_ (ternaires et plus, issues de R1).

**Nombre de règles :** la source regroupe ces bonnes pratiques en « 9 règles de normalisation » (les 6 règles de la section _bonnes pratiques_ + les 3 premières formes normales). Ce fichier les développe en 12 points de checklist : il sépare certaines règles pour la revue et ajoute R12 (contraintes d'intégrité, issue de `books/merise.pdf`, sujet non traité par la source principale).

**Méthodologie de base (pour construire un MCD, source 2-4) :**

1. identifier les entités ; 2. lister leurs attributs ; 3. ajouter les identifiants (entier auto-incrémenté) ;
2. établir les associations binaires ; 5. lister leurs attributs ; 6. calculer les cardinalités ;
3. vérifier les règles de normalisation (entités → apparition des associations non binaires, associations et
   leurs attributs, 3FN de Boyce-Codd) ; 8. corriger. **Itérer** plusieurs fois — la méthode n'est pas linéaire.
   Variante : passer par l'étude des **dépendances fonctionnelles directes** (graphe de couverture minimale)
   puis traduire en schéma entités-associations.

**Dépendance fonctionnelle (rappel, source 2-3) :** `X → Y` ssi une valeur de X induit une **unique** valeur de Y.
Seules les dépendances **directes** comptent (la transitivité `X→Y→Z` ne se modélise pas comme directe).
Toute dépendance fonctionnelle d'un graphe « doit partir d'un identifiant » ; sinon, c'est qu'un identifiant a été oublié.

**Frontière avec les fichiers voisins :** la **traduction** du MCD en schéma relationnel (clés primaires/étrangères,
tables de jonction) relève de `mld.md` ; les **optimisations** dépendantes du SGBD relèvent de `mpd.md`. Ce fichier
ne contrôle que la qualité **conceptuelle** du schéma.

**Liens :** cours « Conception d'une base de données » (C. Piau) →
https://perso.univ-lemans.fr/~cpiau/BD/SQL_PAGES/SQL0.html · contraintes d'intégrité → `books/merise.pdf`.
