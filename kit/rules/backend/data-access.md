---
id: data-access
title: Data Access (ORM & repositories)
discipline: data-access
kind: code
tech: [nestjs]
layer: backend
phase: [design, implementation, review]
level: preference
status: active
version: 0.2
sources:
  - https://typeorm.io/many-to-many-relations # relations @ManyToMany / @JoinTable / entité de jonction
  - typeorm/metadata-builder/JunctionEntityMetadataBuilder.js # vérifié : liste fermée des propriétés copiées vers la table de jointure (transformer absent)
  - https://typeorm.io/relations # référence paresseuse `() => Entity` : résolution différée, cycles d'imports sûrs
  - https://github.com/un-ts/eslint-plugin-import-x # règle import-x/no-cycle : analyse statique des cycles d'import
---

# Data Access (ORM & repositories)

> **Intention :** mapper la persistance avec l'ORM (ici **TypeORM**) de façon fidèle au modèle —
> en particulier **matérialiser correctement les relations n:m** — pour que le schéma reflète le MLD
> et que l'ORM ne **corrompe pas les données en silence**.
> **Applies to :** entités et relations TypeORM (`**/*.entity.ts`).

> ℹ️ `v0.2` — couvre les **relations many-to-many** (r1/r2) et le **cycle d'imports des relations
> bidirectionnelles** (r3). À compléter au fil de l'eau (repositories, transactions, soft-delete,
> chargement des relations).

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Relation n:m : entité de jonction explicite dès que la table a une identité {#data-access.r1}

- **Règle :** réserver `@ManyToMany` + `@JoinTable` (table de jointure **auto-générée**) aux seules
  liaisons **anonymes et pures** (uniquement deux FK, aucune autre exigence). Dès que la table de liaison
  a une **identité métier** (un nom propre dans le MCD/MLD), **porte ou pourrait porter des attributs**,
  ou exige un **contrôle** (nom de table/colonnes, `onDelete`, PK composée explicite), la **promouvoir en
  entité de jonction** : deux `@PrimaryColumn` formant la PK composée (cf. `mld.r3`) + deux `@ManyToOne`.
- **Pourquoi :** la table auto-générée est **opaque** (nom, colonnes, contraintes non maîtrisés) et
  n'accueillera jamais de colonne ultérieure ; une table **nommée** du modèle mérite une entité tracée.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** un `@ManyToMany`+`@JoinTable` dont la table correspond à une entité du MLD, ou qui
  porterait des attributs, ou qui réclame un nom/`onDelete`/PK précis → doit être une entité de jonction.
- ✅ **Bon :**
  ```ts
  @Entity('cart_line_components')
  export class CartLineComponent {
    @PrimaryColumn(/* cart_line_id */) cartLineId!: string;
    @PrimaryColumn(/* component_id */) componentId!: number;
    @ManyToOne(() => CartLine, (l) => l.components) cartLine!: CartLine;
    @ManyToOne(() => Component) component!: Component;
  }
  ```
- ❌ **Mauvais :**
  ```ts
  // cart_line_component est une table nommée du MLD → pas une liaison anonyme
  @ManyToMany(() => Component) @JoinTable() components!: Component[];
  ```

### R2 — Pas de `@JoinTable` auto quand une PK référencée a une colonne custom (transformer/type) {#data-access.r2}

- **Règle :** si l'une des PK reliées par un n:m porte une **configuration de colonne non standard** —
  en particulier un `transformer` (ex. UUID texte ↔ `BINARY(16)`), mais aussi un `type`/`length` custom —
  **ne pas** laisser `@JoinTable` générer la table de jointure. Utiliser une **entité de jonction
  explicite** dont les `@PrimaryColumn` **reprennent la même configuration**, transformer compris.
- **Pourquoi :** `@JoinTable` recopie vers la table de jointure une **liste fermée** de propriétés de la
  colonne référencée (`type, length, precision, scale, charset, collation, unsigned, enum, enumName`) —
  **mais PAS le `transformer`**. La colonne de jointure reçoit donc la valeur **non transformée** : une PK
  `BINARY(16)` y reçoit la **string UUID brute** → octets **ASCII** tronqués ≠ octets binaires de la PK
  → **FK qui ne référence rien, corruption silencieuse**. Aucun moyen d'attacher un transformer à la
  colonne auto-générée.
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** repérer un `@ManyToMany`+`@JoinTable` où une entité reliée a une PK avec
  `transformer:` (ou `type`/`length` custom). → exiger une entité de jonction reprenant cette config.
- ✅ **Bon :**
  ```ts
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidTransformer })
  cartLineId!: string; // dans l'entité de jonction : le transformer est conservé
  ```
- ❌ **Mauvais :**
  ```ts
  // PK de CartLine = BINARY(16) + uuidTransformer ; la colonne cartLinesId de la
  // table auto n'hérite PAS du transformer → la string UUID y est écrite brute.
  @ManyToMany(() => Component) @JoinTable() components!: Component[];
  ```

### R3 — Relation bidirectionnelle : cycle d'imports assumé par un override scopé, pas par des disables épars {#data-access.r3}

- **Règle :** une relation **bidirectionnelle** impose un cycle d'imports entre les deux entités
  (A référence B *et* B référence A). Ce cycle est **légitime et sûr** : les décorateurs de relation
  prennent une **référence paresseuse** `() => Entity` (jamais la classe directement), résolue **après**
  le chargement des modules. Ne pas le taire par des `// eslint-disable-next-line import-x/no-cycle`
  **dispersés** : désactiver `import-x/no-cycle` via **un seul override ESLint scopé à `**/*.entity.ts`**,
  commenté. Garder la règle **active** partout ailleurs (services, contrôleurs, DTO). Préalable : ne
  déclarer le **côté inverse** (`@OneToMany` / propriété inverse) que s'il est **réellement navigué** dans
  le code — un inverse décoratif ajoute un cycle sans usage.
- **Pourquoi :** `import-x/no-cycle` est une analyse **statique** : elle voit le cycle d'imports mais
  ignore que la référence `() => Entity` en **diffère** l'évaluation → **faux positif circonscrit aux
  entités**. Un `disable` inline (a) ne **scale** pas — chaque relation en rajoute ; (b) ne flague qu'**une
  arête** du cycle selon l'ordre de résolution → placement erratique et incohérent ; (c) éteint la règle
  **sur cette ligne**, au risque de masquer un jour un vrai cycle aberrant. Un override **scopé et
  commenté** est DRY, tracé, et préserve la protection sur tout le reste du code. Enfin la
  bidirectionnalité se justifie par la **navigation** effective, pas par principe : un inverse jamais lu
  est du couplage gratuit.
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** un `// eslint-disable-next-line import-x/no-cycle` dans un `*.entity.ts` → le
  remplacer par l'override scopé (une fois l'override posé, ces directives deviennent **inutilisées** et
  ESLint les signale seul via `reportUnusedDisableDirectives`). `import-x/no-cycle` coupé **globalement**
  ou au-delà des entités → trop large, resserrer sur `*.entity.ts`. Un côté inverse jamais lu ailleurs
  dans le code → le supprimer.
- ✅ **Bon :**
  ```js
  // eslint.config — un seul endroit, commenté, scopé aux entités
  { files: ['**/*.entity.ts'], rules: { 'import-x/no-cycle': 'off' } }
  ```
  ```ts
  // relation bidirectionnelle réellement navigée des deux côtés
  @OneToMany(() => OrderLine, (line) => line.order) lines!: OrderLine[];
  @ManyToOne(() => CustomerOrder, (order) => order.lines) order!: CustomerOrder;
  ```
- ❌ **Mauvais :**
  ```ts
  // eslint-disable-next-line import-x/no-cycle   ← un par import : dispersé, erratique, ne scale pas
  import { CartLine } from './cart-line.entity';
  // …+ un @OneToMany inverse jamais parcouru dans le code = cycle gratuit
  ```

## Anti-patterns

- `@ManyToMany`+`@JoinTable` pour une table **nommée** du MLD ou portant des attributs → #data-access.r1
- `@ManyToMany`+`@JoinTable` quand une PK reliée a un `transformer`/type custom (corruption silencieuse) → #data-access.r2
- `// eslint-disable import-x/no-cycle` inline dispersés dans les `*.entity.ts` au lieu d'un override scopé → #data-access.r3
- Côté inverse d'une relation (`@OneToMany`/propriété inverse) déclaré mais jamais navigué dans le code → #data-access.r3

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Preuve de R2 (pourquoi `transformer` n'est pas propagé).** Dans
`typeorm/metadata-builder/JunctionEntityMetadataBuilder.js`, les colonnes de la table de jointure sont
construites en recopiant une **liste fermée** de propriétés de la colonne référencée :

```js
new ColumnMetadata({ referencedColumn, args: { options: {
  length, type, precision, scale, charset, collation, unsigned, enum, enumName,
  // nullable: false, primary: true …
}}});
```

`transformer` n'apparaît pas dans cette liste (idem côté inverse). Le transformer est une propriété de la
`ColumnMetadata` de l'**entité**, pas des colonnes virtuelles de la jointure.

**Reproduction (TypeORM 1.0.0, vérifié le 2026-06-25)** — métadonnées construites via
`DataSource.buildMetadatas()` (sans connexion) pour un `CartLine` (PK `BINARY(16)` + `uuidTransformer`)
en `@ManyToMany(() => Component) @JoinTable()` :

```
PK entité CartLine.id      → type=binary len=16  transformer=true   (écrit un Buffer de 16 octets)
table de jointure auto cart_line_components :
  col cartLinesId          → type=binary len=16  transformer=false  ← perdu
  col componentsId         → type=int            transformer=false
```

Conséquence sur la valeur écrite dans `cartLinesId` pour l'UUID `550e8400-e29b-41d4-a716-446655440000` :

```
sans transformer (jointure auto) : 35 35 30 65 38 34 30 30 2d 65 32 39 62 2d 34 31   ("550e8400-e29b-41")
avec transformer (PK réelle)     : 55 0e 84 00 e2 9b 41 d4 a7 16 44 66 55 44 00 00
→ FK de la jointure ≠ PK référencée
```

À noter aussi : la colonne auto est nommée `cartLinesId` (camelCase, ignore la `namingStrategy` du projet)
— l'entité de jonction explicite rend aussi le contrôle du **nom de table/colonnes** et du `onDelete`.

**R3 — pourquoi le cycle est sûr, et le piège du `Relation<>`.** TypeORM impose la forme `() => Entity`
dans les décorateurs de relation précisément pour **différer** la résolution de la classe cible au-delà du
chargement du module (réf. `typeorm.io/relations`) : au runtime, la valeur est définie quand l'arrow est
appelée, donc le cycle d'imports ne casse rien. `import-x/no-cycle` étant **statique**, il ne peut pas le
savoir → on le neutralise **par fichier** (override `*.entity.ts`), jamais par la classe de disable inline.
À ne pas confondre avec le wrapper de type **`Relation<T>`** de TypeORM : celui-ci règle un *autre*
problème — l'effacement des types sous transpileur isolé (SWC / `isolatedModules`) qui casse la métadonnée
de relation — et non le faux positif ESLint. Deux outils, deux facettes distinctes du même couplage
bidirectionnel.

**Frontière avec les fichiers voisins :** `mld.r3` fixe la traduction **logique** d'un n:m (table de
jonction, PK = 2 FK) ; ce fichier traite son **implémentation** avec TypeORM (auto vs entité explicite).
