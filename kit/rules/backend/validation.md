---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: validation
title: Validation (DTO & ValidationPipe)
discipline: validation
kind: code
tech: [nestjs, class-validator]
layer: backend
phase: [design, implementation, review]
level:
  guardrail # défaut du fichier : la validation est sécurité-critique.
  # Les règles purement stylistiques sont marquées "preference".
status: active
version: 1.1
sources:
  - https://class-validator.sonicar.tech/ # miroir typestack/class-validator
  - https://docs.nestjs.com/techniques/validation
---

# Validation (DTO & ValidationPipe)

> **Intention :** toute donnée entrante est validée à la frontière HTTP par un DTO typé, avant
> d'atteindre la moindre ligne de logique métier. Un controller ne reçoit jamais de données non validées.
> **Applies to :** `**/*.dto.ts`, `**/dto/**/*.ts`, `**/main.ts` (bootstrap du pipe).

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Activer un ValidationPipe global verrouillé {#validation.r1}

- **Règle :** enregistrer un `ValidationPipe` global avec `whitelist: true`, `forbidNonWhitelisted: true` et `transform: true`. Ne jamais affaiblir ces options route par route.
- **Pourquoi :** sans pipe global, les décorateurs des DTO ne sont jamais exécutés. `whitelist` supprime les champs hors DTO, `forbidNonWhitelisted` rejette les requêtes qui en envoient (anti mass-assignment).
- **Vérifié par :** manuel (setup) + grep CI sur `forbidNonWhitelisted: true` dans `main.ts`.
- **Check (review) :** `main.ts` (ou un provider `APP_PIPE`) déclare les trois options ; aucune route ne réinstancie un pipe plus permissif.
- ✅ **Bon :**
  ```ts
  // main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false }, // voir R6
    }),
  );
  ```
- ❌ **Mauvais :**
  ```ts
  app.useGlobalPipes(new ValidationPipe()); // whitelist off → les champs inconnus passent
  ```

### R2 — Tout payload entrant passe par une classe DTO {#validation.r2}

- **Règle :** `@Body()`, `@Query()`, `@Param()` (quand structuré) reçoivent une **classe** DTO typée. Jamais `any`, jamais un objet inline.
- **Pourquoi :** le pipe ne valide que les classes décorées qu'on lui annonce via le type du paramètre.
- **Vérifié par :** manuel + grep CI `@Body()\s+\w+\s*:\s*any`.
- **Check (review) :** chaque handler de controller référence un type DTO dédié.
- ✅ **Bon :** `create(@Body() dto: CreateUserDto)`
- ❌ **Mauvais :** `create(@Body() body: any)` — aucune validation possible.

### R3 — Les DTO sont des classes, jamais des interfaces/types {#validation.r3}

- **Règle :** déclarer les DTO avec `class`. Interdire `interface`/`type` pour un DTO validé.
- **Pourquoi :** les interfaces sont effacées à la compilation : aucun décorateur possible, donc **zéro validation, silencieusement**.
- **Vérifié par :** manuel (convention : tout fichier `*.dto.ts` exporte une `class`).
- **Check (review) :** aucun `export interface ...Dto` dans `**/dto/**`.
- ✅ **Bon :**
  ```ts
  export class CreateUserDto {
    @IsEmail() email: string;
    @IsString() @MinLength(8) password: string;
  }
  ```
- ❌ **Mauvais :**
  ```ts
  export interface CreateUserDto {
    email: string;
    password: string;
  } // jamais validé
  ```

### R4 — Objets imbriqués : `@ValidateNested` + `@Type` ensemble {#validation.r4}

- **Règle :** tout champ objet (ou tableau d'objets) porte `@ValidateNested()` **et** `@Type(() => Classe)`. Pour un tableau : `@ValidateNested({ each: true })`.
- **Pourquoi :** sans `@Type`, class-transformer ne reconstruit pas l'instance de classe ; `@ValidateNested` n'a alors rien à valider et **laisse passer** l'objet imbriqué sans erreur.
- **Vérifié par :** manuel (revue) — **règle la plus critique du fichier**, l'échec est silencieux.
- **Check (review) :** chaque propriété de type objet/array d'objet dans un DTO a bien la paire de décorateurs.
- ✅ **Bon :**
  ```ts
  export class CreateOrderDto {
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];
  }
  ```
- ❌ **Mauvais :**
  ```ts
  export class CreateOrderDto {
    @ValidateNested({ each: true }) // @Type manquant → items non validés
    items: OrderItemDto[];
  }
  ```

### R5 — Ne jamais désactiver `forbidUnknownValues` {#validation.r5}

- **Règle :** conserver `forbidUnknownValues` à `true` (valeur par défaut des versions modernes). Ne jamais le forcer à `false`.
- **Pourquoi :** garantit qu'une valeur qui n'est pas une instance de classe attendue est rejetée plutôt que de traverser la validation sans contrôle.
- **Vérifié par :** grep CI sur `forbidUnknownValues: false`.
- **Check (review) :** aucune occurrence de `forbidUnknownValues: false` dans le code.

### R6 — Conversion explicite des primitives de query/param {#validation.r6}

- **Règle :** pour les nombres/booléens/dates issus de `query`/`param`, utiliser un DTO avec `@Type(() => Number)`/`@IsInt()` etc., ou un pipe dédié (`ParseIntPipe`) pour un paramètre isolé. Garder `enableImplicitConversion: false`.
- **Pourquoi :** la conversion implicite globale a des effets de bord (chaînes ambiguës, `NaN`) ; la conversion explicite est prévisible et auditable.
- **Niveau :** preference
- **Vérifié par :** manuel.
- ✅ **Bon :**
  ```ts
  export class ListUsersQueryDto {
    @Type(() => Number) @IsInt() @Min(1) page: number;
  }
  ```
- ❌ **Mauvais :** s'appuyer sur `enableImplicitConversion: true` partout et caster `page` à la main dans le service.

### R7 — La validation de forme vit dans le DTO, pas dans le service {#validation.r7}

- **Règle :** aucune vérification de forme (`if (!dto.email) throw ...`) dans controllers/services. Le service reçoit un input **déjà validé**. Les règles **métier** (unicité, autorisations, invariants) restent, elles, dans le domaine/service.
- **Pourquoi :** une seule source de vérité pour la forme ; le service se concentre sur le métier.
- **Niveau :** preference
- **Vérifié par :** manuel.
- ✅ **Bon :** `@IsEmail() email` dans le DTO ; le service vérifie seulement « cet email est-il déjà pris ? ».
- ❌ **Mauvais :** `if (!isEmail(dto.email)) throw new BadRequestException()` dans le service.

### R8 — Composer les DTO dérivés avec mapped-types {#validation.r8}

- **Règle :** dériver les DTO `Update`/`Patch` via `PartialType` / `PickType` / `OmitType` (`@nestjs/mapped-types` ou `@nestjs/swagger`) plutôt que de redéclarer les règles.
- **Pourquoi :** DRY — les règles de validation restent synchronisées entre `Create` et `Update`.
- **Niveau :** preference
- **Vérifié par :** manuel.
- ✅ **Bon :**
  ```ts
  export class UpdateUserDto extends PartialType(CreateUserDto) {}
  ```
- ❌ **Mauvais :** recopier tous les `@Is...` de `CreateUserDto` dans `UpdateUserDto` (dérive garantie).

### R9 — Ne sur-valide pas : DTO plats et lisibles {#validation.r9}

- **Règle :** un validateur par contrainte d'entrée **réelle**, pas par réflexe. N'empile pas de décorateurs redondants et ne mets pas dans le DTO une règle que le type TS ou le domaine garantit déjà.
- **Pourquoi :** un DTO surchargé devient illisible et donne une fausse impression de sécurité ; la validation exprime les contraintes d'entrée, pas une copie du modèle entier.
- **Niveau :** preference
- **Vérifié par :** manuel.
- ✅ **Bon :**
  ```ts
  export class CreateUserDto {
    @IsEmail() email: string;
    @IsString() @MinLength(8) password: string;
  }
  ```
- ❌ **Mauvais :**
  ```ts
  // redondances : IsDefined+IsNotEmpty+MinLength(1) disent tous "non vide"
  @IsDefined() @IsNotEmpty() @IsString() @MinLength(1) name: string;
  // règle métier déguisée en validation de forme (dépend de la base)
  @IsUserEmailAvailable() email: string;  // → ça, c'est le service.
  ```

## Anti-patterns

- `@Body() body: any` → #validation.r2
- DTO déclaré en `interface` → #validation.r3
- `@ValidateNested` sans `@Type` → #validation.r4
- `forbidUnknownValues: false` → #validation.r5
- Validation de forme recodée dans le service → #validation.r7
- `CreateDto` recopié dans `UpdateDto` → #validation.r8
- DTO surchargé de validateurs redondants → #validation.r9

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Enregistrement avec injection de dépendances** (alternative à `useGlobalPipes`, permet d'injecter dans le pipe) :

```ts
// app.module.ts
import { APP_PIPE } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
```

**Propriétés sans validateur naturel :** utiliser `@Allow()` pour qu'une propriété survive au `whitelist`
sans lui imposer de contrainte de valeur.

**Note de version :** `forbidUnknownValues` est passé à `true` par défaut dans les versions récentes de
class-validator (correctif d'une faille de contournement). Ne pas le repasser à `false`.

**Imports :** validateurs (`@IsEmail`, `@IsString`, `@ValidateNested`, …) depuis `class-validator` ;
`@Type` depuis `class-transformer`.

**Liens :** whitelisting → https://class-validator.sonicar.tech/whitelisting/ ·
objets imbriqués → https://class-validator.sonicar.tech/nested-objects/ ·
ValidationPipe → https://docs.nestjs.com/techniques/validation
