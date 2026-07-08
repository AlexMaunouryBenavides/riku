---
# ─── Sélection — lu par /kit-init (ne pas laisser de champ vide) ──────────────
id: error-handling # slug unique. Sert de préfixe d'ID de règle + de référence
title: Error Handling
discipline: error-handling # = le nom de ton dossier
kind: code # code | config | checklist  → façonne le corps (voir bas)
tech: [] # [] = agnostique. Ex: [nestjs] | [react] | [react-query]
layer: backend # backend | frontend | db | shared | infra
phase: [implementation, review] # vers quels artefacts OpenSpec ça s'injecte
level: preference # guardrail (toujours ON) | preference (la convention projet gagne)
status: draft # draft | active  → un fichier draft n'est PAS injecté
version: 0.1
sources: [] # livres/specs d'origine (pour toi — non injecté)
---

# Error Handling

> **Intention :** <ce que « bien fait » signifie ici, en une phrase.>
> **Applies to :** `src/**/*.ts` ← globs : ces règles ne se déclenchent que sur ces fichiers.

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES   (injectée dans le contexte de l'agent)           -->
<!-- Dense, impérative, scannable. Une règle = un bloc. Copie le bloc R1.     -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — <impératif en une ligne> {#error-handling.r1}

- **Règle :** <l'ordre, formulé comme une commande>
- **Pourquoi :** <1 ligne max — le bénéfice, pas un paragraphe>
- **Niveau :** preference <!-- à omettre si identique au défaut du fichier -->
- **Vérifié par :** `eslint: <nom-de-règle>` | `tsc` | manuel <!-- levier coût/tokens -->
- **Check (review) :** <ce que /kit-review doit chercher précisément dans le diff>
- ✅ **Bon :**
  ```ts
  // exemple correct, minimal
  ```
- ❌ **Mauvais :**
  ```ts
  // le smell + pourquoi c'est faux, en un commentaire
  ```

### R2 — <…> {#error-handling.r2}

<!-- même structure -->

## Anti-patterns

<!-- aide-mémoire 1 ligne par smell pour la review ; pointe vers un id -->

- <smell> → #error-handling.r1

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE   (NON injectée ; lue à la demande seulement)       -->
<!-- Rationale long, cas limites, liens, extraits de config complets.          -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

<!-- L'agent ne lit cette section que s'il en a explicitement besoin. -->
<!-- Mets ici : le détail des cas limites, la justification approfondie, les liens. -->

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- VARIANTE  kind: config  (docker / ci-cd / monorepo / configuration)      -->
<!-- Remplace la section "Rules" ci-dessus par celle-ci :                     -->
<!--                                                                          -->
<!-- ## Requirements                                                          -->
<!-- ### R1 — <exigence en une ligne>            {#docker.r1}                 -->
<!-- - **Exige :** <ce qui doit être vrai>                                    -->
<!-- - **Pourquoi :** <1 ligne>                                              -->
<!-- - **Vérifié par :** `hadolint` | CI step | manuel                       -->
<!-- - **Check :** <ce que /kit-review vérifie dans le fichier de config>     -->
<!-- - 📦 **Config de référence :**                                          -->
<!--   ```dockerfile                                                         -->
<!--   # extrait minimal correct, prêt à copier                              -->
<!--   ```                                                                    -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
