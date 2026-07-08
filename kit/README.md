# eng-kit — ma bibliothèque de règles d'ingénierie

Capitaliser une fois mes règles (Clean Code, archi, sécurité, conventions Nest/React…) et les ré-appliquer
sur **n'importe quel projet** via OpenSpec, sans tout réécrire et sans rien oublier.

L'agent ne lit pas tout : il **filtre les fichiers par leur frontmatter** (par ex. `discipline: security`

- `level: guardrail`), puis n'ouvre que ceux retenus. Le « comment » est décrit dans `AGENTS.kit.md`.

## Mise en place (une seule fois)

1. Cloner ce dépôt à un endroit stable, ex. `~/dev/eng-kit`.
2. Retenir ce chemin : c'est lui qu'on donne à l'agent.

## Workflow par projet

1. `openspec init` — standard, inchangé.
2. `opsx explore` / `opsx propose` — tu débats de la feature, inchangé.
3. **Appliquer le kit.** Dire à Claude Code :
   > « Lis ma bibliothèque dans `~/dev/eng-kit` en suivant `AGENTS.kit.md`. Détecte la stack de ce projet,
   > applique toutes les règles `active` (garde-fous compris) et **respecte les conventions existantes du
   > repo**. Termine par un résumé de ce que tu as appliqué et écarté. »
4. Coder. Puis `lint` / `format` / `test` (gratuit, hors tokens).
5. **Revue :** « Vérifie mon diff contre les règles établies. »

## Mots-clés à donner à l'agent (cookbook)

Tu pilotes la sélection par les **métadonnées**. Quelques phrases types :

| Tu veux…               | Phrase                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Tout le socle sécurité | « applique toutes les règles `discipline: security` en garde-fou »                         |
| Filtrer par couche     | « n'applique que les règles `layer: backend` actives pour cette stack »                    |
| Cibler une feature     | « pour cette feature, vérifie seulement `validation` et `error-handling` »                 |
| Respecter le legacy    | « ignore les `preference` qui contredisent les conventions du repo, garde les garde-fous » |
| Filtrer par moment     | « au design, n'injecte que les règles `phase: design` »                                    |
| Exclure une discipline | « applique tout sauf `docker` »                                                            |
| Voir avant d'appliquer | « liste les règles que tu retiendrais pour ce projet, sans rien écrire »                   |

## Niveaux & métadonnées (mémo)

- `level` : `guardrail` = toujours · `preference` = sauf conflit avec le projet.
- `phase` : `design` · `implementation` · `review` → à quel moment OpenSpec la règle est injectée.
- `kind` : `code` · `config` · `checklist`.
- `status` : `draft` = ignoré · `active` = pris en compte. **Un fichier reste `draft` tant qu'il n'est pas fini.**
- `tech` : `[]` = agnostique · sinon activé seulement si la techno est détectée.

## Ajouter une règle

1. `cp templates/_template.md rules/<zone>/<discipline>.md`
2. Remplir le frontmatter puis les règles (s'inspirer de `rules/backend/validation.md` pour `kind: code`,
   `rules/infra/docker.md` pour `kind: config`).
3. Passer `status: active`.
4. `git add . && git commit && git push` (depuis VSCode).

## Structure

```
eng-kit/
├── README.md            ← ce fichier (pour toi)
├── AGENTS.kit.md        ← mode d'emploi pour l'agent
├── rules/
│   ├── backend/         api-design ✅, data-access ✅, error-handling ✅, validation ✅, authentication ✅, authorization ✅, password-hashing ✅, passport ✅, nest-authz ✅, performance-backend
│   ├── frontend/        data-fetching ✅, react-query ✅, accessibility ✅, state-management ✅, performance-frontend
│   ├── shared/          typescript ✅, clean-code ✅, configuration ✅, security ✅, observability ✅
│   ├── infra/           docker ✅, monorepo ✅, ci-cd ✅
│   ├── process/         git-workflow ✅
│   ├── testing/         _strategy ✅, jest ✅, vitest ✅, cypress ✅
│   ├── architecture/    nest ✅, clean-archi-back ✅, react ✅, clean-archi-front ✅
│   └── modeling/        mcd ✅, mld ✅, mpd ✅ (Merise, UML, DDD)
├── checklists/          checklists de revue composées (référencent les ids de règles)
├── tooling/             couche zéro-token : eslint, tsconfig, prettier, hadolint
└── templates/_template.md
```

✅ = rempli et `active`. Le reste est en `draft`, prêt à remplir.
