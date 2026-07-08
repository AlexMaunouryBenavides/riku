---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: mld
title: MLD — Modèle Logique de Données (relationnel / MLDR)
discipline: modeling
kind: checklist
tech: [] # agnostique : modèle logique relationnel, indépendant du SGBD (→ mpd.md).
layer: db
phase: [design, review] # design : traduire le MCD ; review : vérifier un MLD fourni.
level:
  guardrail # défaut : la traduction MCD→MLDR est une question de correction, pas de goût.
  # Seule la convention de notation (R8) est une preference.
status: active
version: 1.0
sources:
  - https://perso.univ-lemans.fr/~cpiau/BD/SQL_PAGES/SQL0.html # C. Piau, « Conception d'une base de données » (source principale)
  - books/merise.pdf # support « Modélisation des SI » (REGLE 1/2/2bis/3)
---

# MLD — Modèle Logique de Données (relationnel / MLDR)

> **Intention :** vérifier qu'un modèle logique relationnel (MLDR) est **correct** et **fidèlement traduit**
> d'un MCD normalisé. On contrôle l'application des 5 règles de passage entité-association → tables, et la
> bonne définition des clés primaires/étrangères. La qualité **conceptuelle** se vérifie dans `mcd.md` ;
> l'**implémentation** dépendante du SGBD (types, index, contraintes physiques) dans `mpd.md`.
> **Applies to :** schémas logiques relationnels fournis à l'agent, en notation
> `table(_clé primaire_, colonne, #clé étrangère)`.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Entité → table ; identifiant → clé primaire {#mld.r1}

- **Règle :** chaque entité devient une **table** ; ses attributs deviennent les **colonnes** ; son identifiant devient la **clé primaire**.
- **Pourquoi :** « toute entité devient une table dans laquelle les attributs deviennent les colonnes. L'identifiant de l'entité constitue alors la clé primaire de la table. »
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** chaque entité du MCD a une table correspondante ; sa clé primaire est l'identifiant de l'entité ; aucun attribut perdu.
- ✅ **Bon :** `articles(_numéro article_, désignation, prix unitaire de vente)`
- ❌ **Mauvais :** une table sans clé primaire, ou une entité du MCD non traduite.

### R2 — Association 1:n → clé étrangère côté (0,1)/(1,1) {#mld.r2}

- **Règle :** une association binaire de type **1:n** ne devient **pas** une table : elle se traduit par une **clé étrangère** dans la table du côté **0,1 ou 1,1**, référençant la clé primaire de l'autre table. Cette clé étrangère est **non vide (NOT NULL)** si la cardinalité est **1,1**. S'il reste des attributs sur l'association, ils glissent vers la table côté 1 (celle qui porte la clé étrangère).
- **Pourquoi :** « une association binaire de type 1 : n disparaît, au profit d'une clé étrangère dans la table côté 0,1 ou 1,1 qui référence la clé primaire de l'autre table. »
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** aucune table de jonction créée pour un 1:n ; la clé étrangère est du bon côté ; elle est NOT NULL ssi la cardinalité est 1,1.
- ✅ **Bon :**
  ```
  fournisseurs(_n° fournisseur_, nom contact, n° téléphone contact)
  livraisons(_n° livraison_, date de livraison, nom livreur, #n° fournisseur (non vide))
  ```
- ❌ **Mauvais :** créer une table `livrer(#n° livraison, #n° fournisseur)` pour un simple 1:n.

### R3 — Association n:m → table de jonction (PK = 2 clés étrangères) {#mld.r3}

- **Règle :** une association binaire de type **n:m** devient une **table supplémentaire** (table de jonction / jointure / association) dont la clé primaire est **composée des deux clés étrangères** référençant les clés primaires des deux tables associées. Les attributs de l'association deviennent des **colonnes** de cette table.
- **Pourquoi :** « une association binaire de type n : m devient une table supplémentaire […] dont la clé primaire est composée de deux clés étrangères […]. Les attributs de l'association deviennent des colonnes de cette nouvelle table. »
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** chaque n:m a sa table de jonction ; sa PK = concaténation des deux FK ; les attributs de l'association y figurent.
- ✅ **Bon :** `lignes de commande(#n° commande, #n° article, quantité commandée)`
- ❌ **Mauvais :** poser une clé étrangère d'un côté (comme un 1:n) pour un n:m → impossible de représenter la multiplicité des deux côtés.

### R4 — Association 1:1 → clé étrangère avec contrainte d'unicité {#mld.r4}

- **Règle :** une association binaire de type **1:1** se traduit comme un 1:n, **mais** la clé étrangère reçoit une **contrainte d'unicité** (en plus d'une éventuelle contrainte de non-vacuité). Si les associations fantômes ont été éliminées, au moins un côté est 0,1 → placer la clé étrangère dans la table du **côté opposé** au 0,1 (si les deux côtés sont 0,1, l'emplacement est indifférent).
- **Pourquoi :** « une association binaire de type 1 : 1 est traduite comme une association binaire de type 1 : n sauf que la clé étrangère se voit imposer une contrainte d'unicité […]. » La migration de clé étrangère est **préférable** à la table de jonction alternative, qui ne garantit pas la participation obligatoire.
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** la clé étrangère d'un 1:1 porte bien `unique` ; elle est du bon côté ; pas de table de jonction superflue.
- ✅ **Bon :**
  ```
  services(_n° service_, nom service, #numéro employé (non vide, unique))
  employés(_numéro employé_, nom)
  ```
- ❌ **Mauvais :** traduire un 1:1 obligatoire par une table `directions(#n° service (unique), #numéro employé (unique))` → n'impose pas qu'un service ait un dirigeant.

### R5 — Association non binaire → table (PK = N clés étrangères) {#mld.r5}

- **Règle :** une association **non binaire** (ternaire et plus) devient une **table supplémentaire** dont la clé primaire est composée d'**autant de clés étrangères que d'entités associées**. Les attributs de l'association deviennent des colonnes de cette table.
- **Pourquoi :** « une association non binaire est traduite par une table supplémentaire dont la clé primaire est composée d'autant de clés étrangères que d'entités en association. »
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** la table porte une FK par entité reliée ; sa PK est la concaténation de toutes ces FK ; les attributs de l'association y figurent.
- ✅ **Bon :** `projections(#n° film, #n° salle, #n° créneau, tarif)`
- ❌ **Mauvais :** une PK partielle (oubli d'une des clés étrangères) → la table autorise des doublons interdits par le MCD.

### R6 — Clé primaire : unique, non vide, stable {#mld.r6}

- **Règle :** chaque table a **exactement une** clé primaire (éventuellement composée). Elle identifie chaque ligne de façon **unique**, **n'admet pas la valeur vide** (NULL interdit sur chacune de ses colonnes) et **ne change pas** au cours du temps.
- **Pourquoi :** « les lignes d'une table doivent être uniques » ; « la valeur vide (NULL) est interdite dans une colonne qui sert de clé primaire » ; « la valeur de la clé primaire […] ne devrait pas, en principe, changer au cours du temps. »
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** une seule PK par table ; aucune colonne de PK nullable ; pas de PK « métier » instable (cf. `mcd.r3`).
- ✅ **Bon :** `clients(_numéro client_, nom client, prénom, adresse client)`
- ❌ **Mauvais :** deux clés primaires sur une même table, ou une PK pouvant être NULL.

### R7 — Clé étrangère & intégrité référentielle {#mld.r7}

- **Règle :** une **clé étrangère** ne contient que des valeurs déjà présentes dans la colonne **sans doublon** qu'elle référence (le plus souvent une clé primaire) — c'est l'**intégrité référentielle**. Une table peut avoir **plusieurs** clés étrangères ; une clé étrangère peut aussi être primaire ; elle est **composée** si la clé primaire référencée l'est ; si elle ne doit pas être vide, il faut le **préciser** explicitement.
- **Pourquoi :** « le numéro du client sur une commande doit correspondre à un vrai numéro de client » ; les SGBDR garantissent « l'intégrité référentielle des données » à l'insertion/suppression/mise à jour.
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** chaque FK référence une colonne sans doublon ; sa structure (simple/composée) correspond à la PK référencée ; les contraintes `(non vide)` requises sont notées.
- ✅ **Bon :** `commandes(_numéro commande_, date de commande, #numéro client (non vide))`
- ❌ **Mauvais :** une clé étrangère pointant vers une colonne qui n'est pas garantie unique.

### R8 — Notation du schéma relationnel {#mld.r8}

- **Règle :** dans la description des tables, **souligner** les clés primaires et **préfixer d'un `#`** les clés étrangères. Préciser entre parenthèses les contraintes pertinentes (`(non vide)`, `(unique)`).
- **Pourquoi :** « on souligne les clés primaires et on fait précéder les clés étrangères d'un dièse # dans la description des colonnes d'une table. » Convention de lecture, à aligner sur celle du projet si elle diffère.
- **Niveau :** preference
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** PK soulignées, FK préfixées `#`, contraintes notées — ou notation projet équivalente, appliquée de façon cohérente.
- ✅ **Bon :** `livraisons(_n° livraison_, date de livraison, #n° fournisseur (non vide))`
- ❌ **Mauvais :** ne marquer ni les clés primaires ni les clés étrangères → schéma illisible.

## Anti-patterns

- Entité non traduite, ou table sans clé primaire → #mld.r1
- Table de jonction créée pour un 1:n (au lieu d'une clé étrangère) → #mld.r2
- FK 1,1 laissée nullable → #mld.r2
- n:m traduit par une clé étrangère d'un seul côté → #mld.r3
- 1:1 sans contrainte d'unicité sur la clé étrangère → #mld.r4
- Association n-aire à PK incomplète (FK manquante) → #mld.r5
- Plusieurs clés primaires, ou PK nullable/instable → #mld.r6
- Clé étrangère référençant une colonne non unique → #mld.r7
- Clés primaires/étrangères non marquées → #mld.r8

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Vocabulaire (source) :** dans un MLDR, les tables sont aussi appelées **relations** ; une **clé** y est
l'équivalent d'un **identifiant** au sens MCD. On représente les liens FK→PK par un **connecteur** sur le
schéma relationnel. Attention à la convention de certains éditeurs (symbole `1` côté PK, `n`/`∞` côté FK) :
le symbole se trouve **du côté opposé** à la cardinalité maximale `n` correspondante.

**Typage des associations binaires (préalable aux règles) :** une association binaire est de type
**1:1** si aucune des deux cardinalités maximales n'est `n` ; **1:n** si l'une des deux est `n` ; **n:m** si
les deux sont `n`. Un schéma relationnel **ne distingue pas** 0,n de 1,n, **mais distingue** 0,1 de 1,1
(d'où le NOT NULL des règles 2 et 4).

**Les 5 règles de passage (récapitulatif, source 3-3) :**

1. entité → table (PK = identifiant) ;
2. association 1:n → clé étrangère côté (0,1)/(1,1) ;
3. association n:m → table de jonction (PK = 2 FK) ;
4. association 1:1 → clé étrangère + contrainte d'unicité ;
5. association n-aire → table (PK = N FK).

**Correspondance avec `books/merise.pdf` :** REGLE 1 = R1 (avec la nuance « sauf si l'entité ne comporte pas
d'attribut » — cas marginal, une entité bien normalisée portant toujours au moins son identifiant) ;
REGLE 2 (migration des identifiants dans l'entité côté (1,1)) = R2 ; REGLE 3 (association sans cardinalité
`(...,1)`, donc n:m → nouvelle relation clé = identifiants concaténés + attributs) = R3. Le PDF propose en
plus une **REGLE 2bis** pour les associations **0,1** : créer une relation séparée (clé = identifiant de
l'entité concernée, attribut = identifiant de l'entité liée) afin **d'éviter les valeurs vides** — c'est une
alternative à la clé étrangère nullable de R2/R4.

**Frontière avec les fichiers voisins :** ce fichier ne juge que la **traduction logique** (tables, clés,
intégrité référentielle). La normalisation **conceptuelle** (entités, associations, formes normales) est dans
`mcd.md` ; l'**implémentation physique** (types de colonnes, index, dénormalisation d'optimisation, SGBD
cible) relèvera de `mpd.md`.

**Liens :** cours « Conception d'une base de données » (C. Piau) →
https://perso.univ-lemans.fr/~cpiau/BD/SQL_PAGES/SQL0.html · règles de passage (REGLE 1/2/2bis/3) → `books/merise.pdf`.
