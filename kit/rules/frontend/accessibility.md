---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: accessibility
title: Accessibility (a11y)
discipline: accessibility
kind: code
tech: [react]
layer: frontend
phase: [implementation, review]
level:
  preference # défaut : guidant.
  # Les critères WCAG de niveau A (baseline) sont marqués "guardrail".
status: active
version: 1.0
sources:
  - https://www.w3.org/TR/using-aria/
  - https://www.w3.org/TR/WCAG22/
  - https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/
---

# Accessibility (a11y)

> **Intention :** rendre l'UI utilisable au clavier et par les technologies d'assistance, en s'appuyant
> d'abord sur le **HTML sémantique** (et les primitives accessibles type Radix/shadcn) plutôt que sur de l'ARIA
> plaqué. On vise **WCAG 2.2 niveau AA**.
> **Applies to :** `apps/web/**/*.{tsx,jsx}`, `**/*.css`.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — HTML natif d'abord (1ʳᵉ règle de l'ARIA) {#accessibility.r1}

- **Règle :** utiliser l'élément natif qui porte déjà la sémantique et le comportement (`<button>`, `<a href>`, `<nav>`, `<label>`, `<ul>`…) ; n'ajouter un `role`/attribut ARIA **que** si aucun élément natif ne convient.
- **Pourquoi :** WAI, *First Rule of ARIA Use* — « If you _can_ use a native HTML element … with the semantics and behavior you require already built in, instead of re-purposing an element and adding an ARIA role, state or property …, then do so. »
- **Niveau :** guardrail
- **Vérifié par :** manuel (+ `eslint-plugin-jsx-a11y` si activé).
- ✅ **Bon :** `<button onClick={...}>Valider</button>`
- ❌ **Mauvais :** `<div role="button" onClick={...}>Valider</div>` (comportement clavier à réimplémenter).

### R2 — Tout champ de formulaire a un label associé {#accessibility.r2}

- **Règle :** chaque contrôle a un `<label htmlFor>` lié (ou `aria-label`/`aria-labelledby` sans label visible). Le `placeholder` **n'est pas** un label.
- **Pourquoi :** WCAG **3.3.2 Labels or Instructions** (A) — « Labels or instructions are provided when content requires user input. » ; + **1.3.1** / **4.1.2** (nom déterminable par programme).
- **Niveau :** guardrail
- **Vérifié par :** manuel (+ jsx-a11y `label-has-associated-control`).
- ✅ **Bon :** `<label htmlFor="email">Email</label><input id="email" />`
- ❌ **Mauvais :** `<input placeholder="Email" />` seul.

### R3 — Contenu non-textuel : alternative textuelle {#accessibility.r3}

- **Règle :** toute image porteuse de sens a un `alt` équivalent ; une image purement décorative a `alt=""`.
- **Pourquoi :** WCAG **1.1.1 Non-text Content** (A) — « All non-text content … has a text alternative that serves the equivalent purpose » (sauf décoration pure).
- **Niveau :** guardrail
- **Vérifié par :** manuel (+ jsx-a11y `alt-text`).
- ✅ **Bon :** `<img src=... alt="Progression par thème" />` · décoratif : `alt=""`.
- ❌ **Mauvais :** `<img src=... />` sans `alt`, ou `alt="image"`.

### R4 — Tout est opérable au clavier {#accessibility.r4}

- **Règle :** toute action disponible à la souris l'est au clavier (Tab, Entrée/Espace, flèches selon le pattern) ; pas de piège au clavier ; un contrôle ARIA custom gère ses événements clavier.
- **Pourquoi :** WCAG **2.1.1 Keyboard** (A) — « All functionality of the content is operable through a keyboard interface … » ; + 3ᵉ règle ARIA (contrôles ARIA interactifs accessibles au clavier).
- **Niveau :** guardrail
- **Vérifié par :** manuel (parcours au clavier).
- ✅ **Bon :** `<button>` (Entrée/Espace natifs).
- ❌ **Mauvais :** `<div onClick>` non focusable et sans `onKeyDown`.

### R5 — Chaque élément interactif a un nom accessible {#accessibility.r5}

- **Règle :** boutons/liens nommés par leur **contenu visible** ; une icône seule reçoit un `aria-label` explicite (verbe d'action). Bannir « Cliquez ici ».
- **Pourquoi :** WAI-ARIA APG — « Both the WAI-ARIA specification and WCAG require all focusable, interactive elements to have an accessible name. » « Ideally named by visible, descendant content. » ; + WCAG **4.1.2** / **2.4.4**.
- **Niveau :** guardrail
- **Vérifié par :** manuel (+ jsx-a11y).
- ✅ **Bon :** `<button aria-label="Fermer">✕</button>` · `<a href=...>Voir ma progression</a>`
- ❌ **Mauvais :** `<button>✕</button>` sans nom · `<a>Cliquez ici</a>`.

### R6 — La couleur n'est jamais le seul vecteur d'information {#accessibility.r6}

- **Règle :** un état (erreur, succès, sélection) est signalé aussi par **texte et/ou icône/forme**, pas seulement par la couleur.
- **Pourquoi :** WCAG **1.4.1 Use of Color** (A) — « Color is not used as the only visual means of conveying information, indicating an action, prompting a response, or distinguishing a visual element. »
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- ✅ **Bon :** réponse fausse = bordure rouge **+** icône **+** texte « Incorrect ».
- ❌ **Mauvais :** uniquement la bordure rouge.

### R7 — Contraste minimal respecté {#accessibility.r7}

- **Règle :** texte ≥ **4.5:1** (≥ **3:1** pour le grand texte) ; composants d'UI et objets graphiques ≥ **3:1** vs couleur adjacente.
- **Pourquoi :** WCAG **1.4.3 Contrast (Minimum)** (AA) — « a contrast ratio of at least 4.5:1 » (3:1 grand texte) ; **1.4.11 Non-text Contrast** (AA) — « a contrast ratio of at least 3:1 against adjacent color(s). »
- **Niveau :** guardrail
- **Vérifié par :** manuel (vérificateur de contraste ; axe en e2e possible).
- **Check :** paires texte/fond mesurées ; bordures/états d'UI et icônes signifiantes ≥ 3:1.

### R8 — Focus clavier visible {#accessibility.r8}

- **Règle :** ne jamais retirer l'indicateur de focus sans un remplacement **visible** équivalent (préférer `:focus-visible`).
- **Pourquoi :** WCAG **2.4.7 Focus Visible** (AA) — « the keyboard focus indicator is visible. »
- **Niveau :** guardrail
- **Vérifié par :** manuel (parcours au clavier).
- ✅ **Bon :** `:focus-visible { outline: 2px solid …; }`
- ❌ **Mauvais :** `*:focus { outline: none; }` global sans substitut.

### R9 — Structure sémantique : titres et régions {#accessibility.r9}

- **Règle :** hiérarchie de titres cohérente (un `h1` par page, pas de niveau sauté) ; régions repères (`<main>`, `<nav>`, `<header>`, `<footer>`).
- **Pourquoi :** WCAG **1.3.1 Info and Relationships** (A) — « Information, structure, and relationships … can be programmatically determined … » : les titres et régions rendent la structure exploitable par les technologies d'assistance.
- **Niveau :** preference
- **Vérifié par :** manuel.
- ✅ **Bon :** `<main>` unique + titres `h1 → h2 → h3` logiques.
- ❌ **Mauvais :** tout en `<div>`, titres choisis pour la taille de police.

## Anti-patterns

- `<div role="button">` / `<div onClick>` au lieu de `<button>` → #accessibility.r1 / #accessibility.r4
- `placeholder` utilisé comme seul label → #accessibility.r2
- `<img>` sans `alt` (ou `alt` non pertinent) → #accessibility.r3
- Icône-bouton sans `aria-label`, lien « Cliquez ici » → #accessibility.r5
- État signalé par la couleur seule → #accessibility.r6
- Texte gris clair sur blanc (< 4.5:1) → #accessibility.r7
- `outline: none` global → #accessibility.r8
- Titres sautés / page sans `<main>` → #accessibility.r9

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**S'appuyer sur les primitives accessibles.** shadcn/ui repose sur **Radix UI**, qui implémente les patterns
WAI-ARIA APG (gestion du focus des dialogs, navigation clavier des menus, etc.). C'est l'application directe de
la 1ʳᵉ règle ARIA (#accessibility.r1) : réutiliser un composant éprouvé plutôt que réimplémenter l'accessibilité
à la main. Vérifie tout de même le rendu réel (nom accessible, focus, contraste de **ton** thème Tailwind).

**Gestion du focus (contenu dynamique).** À l'ouverture d'une modale, déplacer le focus dedans et le restaurer
à la fermeture (Radix le gère). Après un changement de route SPA, ramener le focus en tête de contenu pour ne
pas laisser l'utilisateur clavier « perdu ».

**Cadre réglementaire FR (contexte).** Le **RGAA** est le référentiel français d'accessibilité ; il s'aligne sur
WCAG. Viser **WCAG 2.2 niveau AA** couvre la démarche attendue (compétence CDA « la règlementation en vigueur
est respectée »).

**Outillage.** `eslint-plugin-jsx-a11y` attrape une partie statiquement (alt, association label, rôles
invalides) ; le reste (clavier, contraste, focus, couleur-seule) est un **contrôle manuel** — complété
éventuellement par `cypress-axe` en e2e (cf. `cypress.md`).

**Liens (sources vérifiées) :**
Using ARIA (règles) → https://www.w3.org/TR/using-aria/ ·
WCAG 2.2 → https://www.w3.org/TR/WCAG22/ ·
Noms accessibles (APG) → https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/
