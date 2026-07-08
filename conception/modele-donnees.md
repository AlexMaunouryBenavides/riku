# Modèle de données — QuizDev *(titre de travail)*

> Document de référence pour dessiner le **MCD** (draw.io) et poser le **modèle NoSQL**.
> Suit `kit/rules/modeling/mcd.md` : entités au **pluriel**, identifiants **entiers auto-incrémentés** (soulignés),
> attributs au **singulier**, aucun attribut calculable, cardinalités ∈ {0,1 / 1,1 / 0,n / 1,n}.
> Étapes concernées du plan : **1.2 (MCD)**, **1.3 (MLD)**, **1.5 (modèle MongoDB)**.

---

## 0. La clé de lecture : « état courant » vs « historique »

Le projet utilise **deux bases**, chacune avec un rôle distinct (c'est ce qui justifie l'exigence CDA « SQL **et** NoSQL ») :

```
┌────────────────────────────┐        ┌────────────────────────────┐
│  MySQL — table `cartes`     │        │  MongoDB — `sessions`       │
│  (l'association réviser)    │        │                             │
│  « OÙ EN EST chaque carte    │        │  « QU'EST-CE QUI S'EST      │
│    MAINTENANT »              │        │    PASSÉ, séance par séance »│
│                             │        │                             │
│  → lu/écrit à CHAQUE réponse │        │  → écrit à chaque réponse   │
│    pour décider la suite     │        │    lu pour les statistiques │
└────────────────────────────┘        └────────────────────────────┘
        état (petit, vivant)                 historique (gros, append)
```

- **MySQL** garde l'**état courant** de chaque carte (dans quelle boîte, prochaine échéance) → c'est ce que lit l'**algorithme de répétition espacée** pour décider la suite.
- **MongoDB** garde l'**historique fonctionnel** des séances (quelles questions, quelles réponses, juste/faux, temps) → sert la **progression (UC13)**, la traçabilité et l'analyse.

> ⚠️ Ce n'est **pas** un simple « log technique ». C'est un **journal fonctionnel**. À ne pas confondre avec les
> **logs de sécurité** (tentatives de connexion, `security.r9`), qui sont un autre sujet.
> ⚠️ L'algorithme de révision **ne lit jamais dans Mongo** : il lit/écrit l'état dans `cartes` (MySQL). Mongo ne fait qu'**enregistrer** ce qui s'est passé.

---

## 1. Entités (MySQL) — à dessiner dans le MCD

### `utilisateurs`
| Attribut | Type | Obligatoire | Notes |
|---|---|---|---|
| **_id_utilisateur_** | entier | ✅ | identifiant, auto-incrémenté |
| email | chaîne(255) | ✅ | **unique** |
| mot_de_passe_hache | chaîne(255) | ✅ | Argon2id (jamais en clair) |
| pseudo | chaîne(50) | ✅ | nom d'affichage |
| role | énuméré | ✅ | `apprenant` \| `administrateur` (défaut `apprenant`) |
| date_inscription | datetime | ✅ | |

### `themes`
| Attribut | Type | Obligatoire | Notes |
|---|---|---|---|
| **_id_theme_** | entier | ✅ | |
| libelle | chaîne(100) | ✅ | **unique** (ex. « NestJS », « SQL », « Sécurité ») |
| description | texte | ❌ | |
| date_creation | datetime | ✅ | |

### `questions`
| Attribut | Type | Obligatoire | Notes |
|---|---|---|---|
| **_id_question_** | entier | ✅ | |
| enonce | texte | ✅ | |
| explication | texte | ❌ | affichée **après** la réponse |
| niveau_difficulte | énuméré | ❌ | `facile` \| `moyen` \| `difficile` |
| est_active | booléen | ✅ | défaut `vrai` (désactiver ≠ supprimer) |
| date_creation | datetime | ✅ | |

### `reponses`
| Attribut | Type | Obligatoire | Notes |
|---|---|---|---|
| **_id_reponse_** | entier | ✅ | |
| texte | chaîne(500) | ✅ | |
| est_correcte | booléen | ✅ | défaut `faux` |

---

## 2. Associations (avec cardinalités)

| Association | Entre | Cardinalités | Lecture |
|---|---|---|---|
| **appartenir** | `questions` — `themes` | questions **(1,1)** ⟷ **(0,n)** themes | une question appartient à **un** thème ; un thème regroupe **0..n** questions |
| **proposer** | `questions` — `reponses` | questions **(1,n)** ⟷ **(1,1)** reponses | une question propose **1..n** réponses ; une réponse appartient à **une seule** question |
| **réviser** ⭐ | `utilisateurs` — `questions` | utilisateurs **(0,n)** ⟷ **(0,n)** questions | un utilisateur révise 0..n questions ; une question est révisée par 0..n utilisateurs |

### Schéma d'implantation (aide au placement dans draw.io)

```
        (0,n)        appartenir         (1,1)
 themes ────────────────────────────── questions
                                          │  ╲
                                    (1,n) │   ╲ (0,n)
                                  proposer│    ╲  réviser {numero_boite,
                                    (1,1) │     ╲  date_prochaine_revision,
                                       reponses  ╲ date_derniere_revision}
                                                  ╲ (0,n)
                                              utilisateurs
```

---

## 3. Pourquoi `réviser` porte des attributs

`réviser` est une association **porteuse d'attributs** : elle stocke la **mémoire de la répétition espacée** du
**couple** (utilisateur × question).

Point crucial : **cet état n'appartient ni à la question, ni à l'utilisateur — il appartient au couple.** Une même
question peut être « bien sue » par l'un et « ratée » par l'autre :

| Couple | numero_boite | date_prochaine_revision | Sens |
|---|---|---|---|
| (Alice, Q42) | 4 | 2026-07-15 | Alice la maîtrise → revue dans 7 jours |
| (Bob, Q42) | 1 | 2026-07-08 | Bob l'a ratée → à revoir aujourd'hui |

Même question, **états différents** → impossible de stocker ça sur `questions` (valeur unique pour tous) ni sur
`utilisateurs`. Ça **doit** vivre sur le lien. C'est aussi la règle `mcd.r5` : ces attributs dépendent de
**l'utilisateur ET de la question**, donc l'association est légitime.

**Rôle de chaque attribut :**

| Attribut | Type | Rôle |
|---|---|---|
| numero_boite | entier ∈ [1..5] | où en est la carte (1 = fragile … 5 = acquise). Bonne réponse → +1 ; mauvaise → retour en 1. |
| date_prochaine_revision | date | **le filtre de UC10** : une session sert les cartes dont l'échéance ≤ aujourd'hui. |
| date_derniere_revision | datetime (nullable) | dernière révision (info/affichage). `null` = jamais révisée. |

**Exemple : une carte (Alice, Q42) qui évolue** (intervalles 0/1/3/7/15 jours) :

```
Jour 0  : 1ère rencontre        → boîte 1, prochaine = jour 0
Jour 0  : bonne réponse         → boîte 2, prochaine = jour 1
Jour 1  : bonne réponse         → boîte 3, prochaine = jour 4   (1+3)
Jour 4  : MAUVAISE réponse      → boîte 1, prochaine = jour 4   (on repart de zéro)
Jour 4  : bonne réponse         → boîte 2, prochaine = jour 5
```

À chaque réponse : l'algo **lit** la ligne `cartes`, **calcule** la nouvelle boîte + échéance (RG-02/03), **réécrit**
la ligne, et **ajoute** la réponse à l'historique Mongo.

> Au **MLD**, l'association `réviser` (n-n porteuse d'attributs) devient la table **`cartes`** :
> `cartes(_id_carte_, #id_utilisateur, #id_question, numero_boite, date_prochaine_revision, date_derniere_revision)`.
> Bilan : **5 tables** relationnelles = 4 entités + `cartes`.

---

## 4. Modèle MongoDB (tâche 1.5) — **hors MCD**

À **ne pas** dessiner dans draw.io. Une collection, réponses **imbriquées** dans la session (idiomatique en documentaire) :

```jsonc
// collection "sessions"
{
  "_id": ObjectId,
  "id_utilisateur": 42,               // référence vers MySQL (utilisateurs)
  "themes_selectionnes": [3, 7],      // ids de themes
  "date_debut": ISODate,
  "date_fin": ISODate | null,
  "statut": "en_cours" | "terminee",
  "reponses": [                        // tableau imbriqué
    {
      "id_question": 128,
      "reponses_cochees": [512, 514],  // ids de reponses cochées
      "est_correcte": false,           // correction calculée côté serveur
      "temps_ms": 4200,
      "horodatage": ISODate
    }
  ]
}
```

**Pourquoi documentaire (à défendre à l'oral) :** volume qui s'accumule (append), structure d'une séance souple et
auto-suffisante (on lit tout d'un bloc pour les stats), pas de jointures. C'est ce journal qui **alimente la progression (UC13)**.

---

## 5. Contraintes d'intégrité (annexe du MCD — `mcd.r12`)

- **Statique** — une `question` a **au moins 2 réponses** proposées, dont **au moins 1 correcte**.
- **Statique** — `email` unique ; `libelle` de thème unique.
- **Statique** — `numero_boite` ∈ [1..5] ; `role` ∈ {apprenant, administrateur}.
- **Statique** — `date_derniere_revision` ≤ `date_prochaine_revision`.
- **Dynamique** — à chaque réponse, `date_prochaine_revision` est recalculée (bonne → boîte +1 ; mauvaise → boîte 1).
- **Référentielle** — pas de `reponse` sans `question` ; pas de carte sans `utilisateur` **et** `question` existants.

---

## 6. Point de style à trancher

`role` est modélisé en **attribut énuméré** (le plus simple pour 2 rôles). Alternative « pleine normalisation » :
une entité `roles` en association `(0,n) ⟷ (1,1)`. Pour l'exam, l'énuméré passe très bien et évite une table.
→ *Décision : à confirmer.*
