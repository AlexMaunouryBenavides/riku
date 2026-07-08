---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: mpd
title: MPD — Modèle Physique de Données (implémentation SGBDR)
discipline: modeling
kind: checklist
tech: [] # agnostique : valable pour tout SGBDR (le choix Oracle/MySQL/… est l'objet du MPD lui-même).
layer: db
phase: [implementation, review] # implementation : créer la base (DDL) ; review : vérifier un MPD fourni.
level:
  preference # défaut : l'optimisation est affaire de jugement. Type/taille (R1) et
  # matérialisation des contraintes du MLD (R2) sont des guardrails.
status: active
version: 1.0
sources:
  - https://perso.univ-lemans.fr/~cpiau/BD/SQL_PAGES/SQL0.html # C. Piau, « Conception d'une base de données » (sections 4-1, 4-2)
---

# MPD — Modèle Physique de Données (implémentation SGBDR)

> **Intention :** vérifier qu'un modèle physique implémente correctement le MLD dans un SGBDR donné —
> types et tailles de stockage définis, contraintes du MLD matérialisées — et que toute **optimisation**
> (index, dénormalisation) est justifiée, mesurée et maîtrisée. La traduction MCD→MLDR se vérifie dans
> `mld.md` ; la normalisation conceptuelle dans `mcd.md`.
> **Applies to :** modèles physiques / scripts DDL (`CREATE TABLE`, `ADD CONSTRAINT`) ciblant un SGBDR.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Définir le type et la taille de stockage de chaque colonne {#mpd.r1}

- **Règle :** chaque colonne du modèle physique précise son **type** et sa **taille** de stockage (en octets ou en bits), dans les types du SGBDR cible.
- **Pourquoi :** « la traduction d'un MLD conduit à un MPD qui précise notamment le stockage de chaque donnée à travers son type et sa taille. » C'est ce qui distingue le MPD du MLD.
- **Niveau :** guardrail
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** aucune colonne sans type ; les tailles sont explicites là où le type l'exige.
- ✅ **Bon :** `prix_unitaire NUMERIC(10,2)`, `nom VARCHAR(80)`.
- ❌ **Mauvais :** une colonne déclarée sans type/taille, ou un MPD qui reste au niveau logique (pas de types).

### R2 — Matérialiser les contraintes du MLD en contraintes physiques {#mpd.r2}

- **Règle :** implémenter dans le SGBDR les contraintes établies au MLD : **clé primaire**, **clés étrangères** (intégrité référentielle), **unicité** et **non-vacuité** (NOT NULL), via `CREATE TABLE` / `ADD CONSTRAINT`.
- **Pourquoi :** la traduction d'un MLDR en physique est « la création (par des requêtes SQL de type CREATE TABLE et ADD CONSTRAINT) d'une base de données hébergée par un SGBD relationnel particulier ». Sauf renoncement explicite et maîtrisé (cf. R5), ces contraintes garantissent l'intégrité des données par le SGBDR lui-même.
- **Niveau :** guardrail
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** chaque PK/FK/UNIQUE/NOT NULL du MLD se retrouve comme contrainte physique ; toute absence est justifiée par une optimisation documentée (R5).
- ✅ **Bon :** `ALTER TABLE livraisons ADD CONSTRAINT fk_fournisseur FOREIGN KEY (n_fournisseur) REFERENCES fournisseurs(n_fournisseur);`
- ❌ **Mauvais :** une clé étrangère du MLD non déclarée comme contrainte (intégrité « espérée » côté applicatif sans raison).

### R3 — Indexer au minimum les clés primaires et étrangères {#mpd.r3}

- **Règle :** poser des **index** au moins sur les colonnes **clés primaires** et **clés étrangères** des tables.
- **Pourquoi :** « l'ajout d'index aux tables (au minimum sur les colonnes clés primaires et clés étrangères) » accélère les requêtes ; « ces index consomment de l'espace mémoire supplémentaire, mais la base de données reste normalisée » — c'est une optimisation sans contrepartie sur l'intégrité.
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** PK et FK sont indexées ; les index ajoutés ne dénormalisent pas le schéma.
- ✅ **Bon :** un index sur chaque colonne clé étrangère servant aux jointures.
- ❌ **Mauvais :** aucune indexation des clés étrangères très sollicitées en jointure.

### R4 — N'optimiser qu'a posteriori, et mesurer le gain {#mpd.r4}

- **Règle :** ne **jamais optimiser a priori**. N'optimiser **a posteriori** qu'en réponse à une lenteur réelle que le SGBDR ne résout pas seul, et **mesurer** le gain par des chronométrages **avant/après** sur un volume de données significatif (de préférence en exploitation).
- **Pourquoi :** « le conseil le plus précieux, en matière d'optimisation, est de ne jamais optimiser a priori, mais toujours a posteriori ». Une optimisation non mesurée peut coûter de la cohérence sans bénéfice prouvé.
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** toute optimisation manuelle est motivée par une lenteur constatée et accompagnée d'une mesure de gain ; pas d'optimisation spéculative.
- ✅ **Bon :** dénormaliser une jointure après avoir mesuré qu'elle est le goulot, gain chronométré.
- ❌ **Mauvais :** dé-normaliser « au cas où », sans mesure, dès la conception.

### R5 — Dénormalisation maîtrisée : cohérence garantie, forme normale sacrifiée documentée {#mpd.r5}

- **Règle :** l'optimisation en temps se paie en espace ; dans le pire cas elle **dé-normalise** volontairement. Si l'on ajoute des colonnes calculées / des redondances, ou si l'on **retire** une contrainte d'unicité, de non-vacuité ou de clé étrangère, alors l'**intégrité doit être assurée autrement** (déclencheurs ou code des applications clientes), et la **forme normale sacrifiée** doit être assumée et documentée.
- **Pourquoi :** « l'optimisation des performances en temps de calcul se fait toujours au détriment de l'espace mémoire » ; dé-normaliser comporte « tous les risques d'incohérence ». Retirer une contrainte transfère la charge d'intégrité au code client.
- **Vérifié par :** manuel (revue de schéma).
- **Check (review) :** toute redondance/colonne calculée a un mécanisme de cohérence explicite ; toute contrainte retirée a une compensation côté trigger/applicatif ; la FN abandonnée est notée.
- ✅ **Bon :** ajouter `date_commande` dans `lignes_de_commande` (3FN sacrifiée pour éviter une jointure), cohérence tenue par déclencheur — choix documenté.
- ❌ **Mauvais :** dupliquer une donnée pour la performance sans aucun garde-fou de cohérence.

## Anti-patterns

- Colonne sans type/taille ; MPD resté au niveau logique → #mpd.r1
- Contrainte du MLD (PK/FK/UNIQUE/NOT NULL) non matérialisée sans justification → #mpd.r2
- Clés primaires/étrangères non indexées → #mpd.r3
- Optimisation a priori, spéculative et non mesurée → #mpd.r4
- Dénormalisation/redondance sans garde-fou de cohérence ni documentation → #mpd.r5

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Définition (source) :** « un modèle physique de données est l'implémentation particulière du modèle
logique de données par un logiciel. » Le MPD précise le **stockage** (type + taille) et matérialise la base
dans un **SGBDR particulier** (Oracle, SQL Server, Access, DB2…). Comme tous les SGBDR reposent sur le même
modèle logique relationnel, une base reste convertible d'un SGBDR à l'autre.

**Les trois leviers d'optimisation (source 4-2), du plus sûr au plus risqué :**

1. **index** sur les tables (au minimum PK et FK) — la base **reste normalisée** (coût : espace) ;
2. **colonnes calculées / redondances** pour éviter des jointures coûteuses — la base **est dé-normalisée**,
   cohérence à tenir par déclencheurs ou applications clientes ;
3. **suppression de contraintes** (unicité, non-vacuité, clé étrangère) — l'intégrité doit alors être
   assurée par le **code client**.

**Exemple de sacrifice de la 3FN (source) :** supprimer la table `commandes` et reporter `date de commande`
dans `lignes de commande` ; la date est répétée à chaque ligne (3FN abandonnée) mais on évite une jointure
coûteuse. À ne faire qu'a posteriori et avec compensation de cohérence (cf. R4/R5).

**Portée de la source :** la section MPD du cours est volontairement concise (distinction MLD/MPD +
doctrine d'optimisation). Le tuning fin propre à chaque SGBDR (partitionnement, types exacts, plans
d'exécution) dépasse ce support et n'est pas couvert ici faute de source.

**Frontière avec les fichiers voisins :** `mcd.md` = qualité conceptuelle (entités/associations, formes
normales) ; `mld.md` = traduction logique (tables, clés, intégrité référentielle) ; `mpd.md` (ce fichier) =
implémentation physique et optimisation.

**Liens :** cours « Conception d'une base de données » (C. Piau), sections « Distinction entre MLD et MPD »
et « Optimisations » → https://perso.univ-lemans.fr/~cpiau/BD/SQL_PAGES/SQL0.html
