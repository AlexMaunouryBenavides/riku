# Cas d'utilisation — Riku

> **Projet :** application web de révision par quiz sur le développement (JS/TS, NestJS, React, SQL, sécurité…),
> qui sert aussi d'outil de révision personnel pour le CDA.
> **Intention :** figer *qui* fait *quoi* avec l'application avant de modéliser (Merise) puis de coder.
> **Étape suivante :** MCD/MLD/MPD (Merise), puis UML (classes + séquences des CU significatifs).

Ce document est la **première brique de conception**. Il est volontairement cadré sur un **MVP livrable en ~40 h de dev**
(voir colonne *Priorité*). Tout ce qui est marqué `↗ extension` est hors MVP et ne sera traité que si le temps le permet.

---

## 1. Périmètre (rappel)

| Dans le MVP | Hors périmètre (assumé) |
| --- | --- |
| Comptes + authentification (inscription, connexion) | Multijoueur / temps réel (pas de WebSocket) |
| Catalogue de thèmes + questions/réponses (géré par un admin) | Réseau social, commentaires, partage public |
| Sessions de **révision espacée** (cœur métier) | Paiement, abonnements |
| Suivi de progression par thème | Application mobile native |
| Espace d'administration du catalogue | Génération de questions par IA |

**Justification des deux bases (exigence CDA « SQL et NoSQL ») :**

- **MySQL (relationnel)** — le catalogue structuré et stable : `utilisateurs`, `themes`, `questions`, `reponses`,
  et l'état de révision `cartes` (une carte = couple utilisateur×question).
- **MongoDB (documentaire)** — le **flux d'événements** de révision : chaque session et chaque réponse est journalisée
  en document (structure souple, volume qui grossit, lecture analytique). C'est cet historique qui **alimente
  l'algorithme de répétition espacée** et les statistiques.

---

## 2. Acteurs

| Acteur | Type | Définition |
| --- | --- | --- |
| **Visiteur** | humain, non authentifié | Internaute sans compte. Peut consulter la page d'accueil, s'inscrire, se connecter. |
| **Apprenant** | humain, authentifié | Acteur principal. Révise, lance des sessions, répond aux questions, consulte sa progression, gère son compte. |
| **Administrateur** | humain, authentifié + rôle élevé | Gère le catalogue (thèmes, questions, réponses). Hérite des capacités de l'Apprenant. |
| **Planificateur** | système (temps) | Acteur secondaire : le passage du temps rend des cartes « à réviser » (échéance atteinte). Modélise le déclenchement temporel, pas un humain. |

> Convention de rôle : **deny-by-default** (`security.r1`). Un Visiteur n'accède qu'aux ressources publiques ;
> l'Apprenant n'agit que sur **ses propres** données ; l'Administrateur est le **seul** à écrire dans le catalogue.

---

## 3. Diagramme de cas d'utilisation

À rendre tel quel (PlantUML — copiable dans VS Code ou sur plantuml.com). Il te servira de base pour la version « propre » du dossier.

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
actor "Visiteur" as V
actor "Apprenant" as A
actor "Administrateur" as ADM
actor "Planificateur\n(temps)" as T

A <|-- ADM  ' l'admin hérite de l'apprenant

rectangle "Riku" {
  package "Compte & sécurité" {
    usecase "S'inscrire"            as UC01
    usecase "Se connecter"         as UC02
    usecase "Se déconnecter"       as UC03
    usecase "Gérer son profil"     as UC04
  }
  package "Révision (cœur métier)" {
    usecase "Démarrer une session\nde révision" as UC10
    usecase "Répondre à une question"           as UC11
    usecase "Terminer la session\n(bilan)"       as UC12
    usecase "Consulter sa progression"           as UC13
    usecase "Sélectionner les cartes\ndues"      as UC10b
  }
  package "Catalogue" {
    usecase "Parcourir les thèmes"  as UC30
    usecase "Gérer les thèmes"      as UC20
    usecase "Gérer les questions\net réponses" as UC21
  }
}

V --> UC01
V --> UC02
A --> UC03
A --> UC04
A --> UC10
A --> UC11
A --> UC12
A --> UC13
A --> UC30
ADM --> UC20
ADM --> UC21

UC10 ..> UC10b : <<include>>
T --> UC10b
UC11 ..> UC10b : <<include>>  ' la réponse recalcule l'échéance de la carte
@enduml
```

---

## 4. Liste récapitulative des cas d'utilisation

| ID | Cas d'utilisation | Acteur principal | Priorité | Bloc CDA¹ |
| --- | --- | --- | --- | --- |
| UC01 | S'inscrire | Visiteur | MVP | AT1 |
| UC02 | Se connecter | Visiteur | MVP | AT1 |
| UC03 | Se déconnecter | Apprenant | MVP | AT1 |
| UC04 | Gérer son profil (changer mot de passe) | Apprenant | MVP | AT1 |
| UC10 | Démarrer une session de révision | Apprenant | **MVP — CU pivot** | AT1/AT2 |
| UC11 | Répondre à une question | Apprenant | MVP | AT1/AT2 |
| UC12 | Terminer la session et voir le bilan | Apprenant | MVP | AT1 |
| UC13 | Consulter sa progression par thème | Apprenant | MVP | AT1/AT2 |
| UC20 | Gérer les thèmes (CRUD) | Administrateur | MVP | AT1/AT2 |
| UC21 | Gérer les questions et réponses (CRUD) | Administrateur | MVP | AT1/AT2 |
| UC30 | Parcourir les thèmes disponibles | Apprenant | MVP | AT1 |
| UC14 | Lancer un quiz libre par thème (mode entraînement) | Apprenant | ↗ extension | AT1 |
| UC22 | Importer des questions en masse (JSON/CSV) | Administrateur | ↗ extension | AT2 |

¹ Traçabilité complète en §7.

---

## 5. Fiches détaillées des cas significatifs

> Les 3 fiches ci-dessous sont les plus « denses ». **UC10** est celui qui portera le **diagramme de séquence**
> du dossier (fonctionnalité la plus représentative — elle mobilise l'algorithme métier + les deux bases).

### UC10 — Démarrer une session de révision  *(CU pivot)*

| Rubrique | Contenu |
| --- | --- |
| **Objectif** | Réviser les questions « dues » du jour selon la répétition espacée, sur un ou plusieurs thèmes choisis. |
| **Acteur principal** | Apprenant |
| **Préconditions** | L'apprenant est authentifié ; au moins une carte lui est due (ou de nouvelles questions existent). |
| **Postconditions** | Une session est ouverte et journalisée (MongoDB) ; les cartes dues sont sélectionnées et prêtes à être servies. |
| **Déclencheur** | L'apprenant clique « Réviser » (éventuellement après avoir filtré par thème). |

**Scénario nominal**

1. L'apprenant demande à démarrer une session (option : filtre par thème(s)).
2. Le système **sélectionne les cartes dues** (`include` UC10b) : cartes dont l'échéance ≤ aujourd'hui, plus éventuellement des cartes neuves, dans la limite de `N` (défaut 20).
3. Le système crée un **document `session`** (MongoDB) : id, utilisateur, thèmes, liste des questions servies, horodatage de début.
4. Le système renvoie la **première question** — **sans** la bonne réponse (voir MUC01).
5. → enchaîne sur UC11 (répondre), en boucle, jusqu'à épuisement de la liste → UC12 (bilan).

**Scénarios alternatifs / exceptions**

- **A1 — Aucune carte due :** le système propose soit d'attendre, soit d'apprendre de nouvelles questions (cartes neuves), soit un quiz libre (UC14 si dispo).
- **E1 — Filtre sur un thème vide :** message « aucune question sur ce thème pour l'instant ».
- **E2 — Utilisateur non authentifié :** accès refusé (redirection connexion).

**Règles de gestion mobilisées :** RG-01 à RG-05 (voir §6).

---

### UC11 — Répondre à une question

| Rubrique | Contenu |
| --- | --- |
| **Objectif** | Soumettre une réponse, obtenir un retour immédiat, et mettre à jour l'échéance de la carte. |
| **Acteur principal** | Apprenant |
| **Préconditions** | Une session est ouverte ; une question courante est servie. |
| **Postconditions** | La réponse est journalisée (MongoDB) ; la carte (MySQL) est repositionnée (boîte + prochaine échéance). |

**Scénario nominal**

1. L'apprenant sélectionne une (ou plusieurs) réponse(s) et valide.
2. Le serveur **corrige côté serveur** (jamais côté client) : compare aux bonnes réponses en base.
3. Le serveur applique l'**algorithme de répétition espacée** (RG-02/03) → nouvelle boîte + nouvelle échéance de la carte.
4. Le serveur **journalise** la réponse (document : question, réponse donnée, juste/faux, temps de réponse).
5. Le serveur renvoie le **verdict** (juste/faux) + l'explication/la bonne réponse, puis la question suivante.

**Exceptions**

- **E1 — Question déjà répondue dans la session :** rejet idempotent (pas de double comptage).
- **E2 — Réponse hors de la question servie :** rejet (validation d'appartenance).

---

### UC01 — S'inscrire

| Rubrique | Contenu |
| --- | --- |
| **Objectif** | Créer un compte apprenant. |
| **Acteur principal** | Visiteur |
| **Préconditions** | Non authentifié ; e-mail non déjà utilisé. |
| **Postconditions** | Un `utilisateur` est créé (mot de passe **haché Argon2id**, `security.r4`), rôle `apprenant` par défaut. |

**Scénario nominal**

1. Le visiteur saisit e-mail + mot de passe (+ confirmation).
2. Le serveur **valide** les entrées (DTO / `ValidationPipe`, `validation.md`) : format e-mail, robustesse du mot de passe.
3. Le serveur vérifie l'unicité de l'e-mail **sans révéler** si l'e-mail existe déjà (anti-énumération, MUC-anti-enum).
4. Le serveur **hache** le mot de passe (Argon2id, salé) et crée le compte avec le rôle `apprenant`.
5. Redirection vers la connexion (ou connexion automatique).

**Exceptions**

- **E1 — Entrées invalides :** message générique par champ, aucun détail système.
- **E2 — E-mail déjà pris :** message neutre identique au succès côté UX anti-énumération.

---

## 6. Règles de gestion (business rules)

Ces règles pilotent le cœur métier — ce sont elles qui deviendront des **fonctions pures testables unitairement**
(argument fort pour « Développer des composants métier » + le jeu d'essai du dossier).

| ID | Règle |
| --- | --- |
| **RG-01** | Une **carte** = un couple (apprenant, question). À la première rencontre, la carte naît en **boîte 1**, due immédiatement. |
| **RG-02** | **Bonne réponse** → la carte **monte d'une boîte** (max 5) ; nouvelle échéance = aujourd'hui + `intervalle(boîte)`. |
| **RG-03** | **Mauvaise réponse** → la carte **retombe en boîte 1** ; nouvelle échéance = aujourd'hui (revue rapprochée). |
| **RG-04** | Intervalles par défaut (jours), configurables : `boîte1 = 0`, `boîte2 = 1`, `boîte3 = 3`, `boîte4 = 7`, `boîte5 = 15`. |
| **RG-05** | Une **session** sert au plus `N` cartes (défaut 20), priorité aux échéances les plus anciennes, puis aux cartes neuves. |
| **RG-06** | Une question est « **due** » si son échéance ≤ date du jour. |
| **RG-07** | La **progression** d'un thème = répartition des cartes de l'apprenant par boîte (proxy de maîtrise). |

> Cœur testable, exemple de jeu d'essai (pour le dossier) :
> `appliquerResultat(boîte=2, juste=faux)` → **attendu** `(boîte=1, échéance=+0 j)`. Déterministe → « données attendues » nettes.

---

## 7. Cas de mésusage (sécurité)  — `security.r6`

> Exigés par le kit *et* valorisés par le jury CDA (volet « éléments de sécurité » + « veille vulnérabilités »).
> Chaque mésusage pointe la parade et le garde-fou OWASP correspondant.

| ID | Cas de mésusage | Parade | Garde-fou |
| --- | --- | --- | --- |
| **MUC01** | Récupérer la bonne réponse **avant** de valider (via la console/API) pour tricher | Le serveur ne renvoie **jamais** la bonne réponse tant que la réponse n'est pas soumise ; correction **côté serveur** uniquement | `security.r1` |
| **MUC02** | **Bruteforce** du formulaire de connexion | Limitation/retard des tentatives échouées (rate-limit), sans créer de DoS | `security.r7` |
| **MUC03** | Accéder à la progression / aux sessions **d'un autre apprenant** (IDOR) | Vérification de **propriété** de la ressource à chaque accès | `security.r1` |
| **MUC04** | **Élévation de privilège** : un apprenant appelle les routes d'admin (CRUD catalogue) | Contrôle d'accès centralisé, deny-by-default, rôle vérifié côté serveur | `security.r1` |
| **MUC05** | **Injection** (SQL / NoSQL) via les champs de saisie | Requêtes paramétrées / ORM + validation positive côté serveur | `security.r5` |
| **MUC06** | **Énumération de comptes** à l'inscription/connexion | Messages neutres identiques quel que soit le résultat | `security.r7` |
| **MUC07** | Fuite d'info via une **stack trace** en cas d'erreur | Gestion d'erreur centralisée, message générique au client (fail-closed) | `security.r10` |

---

## 8. Traçabilité compétences CDA ↔ cas d'utilisation

| Compétence (référentiel) | Couverte par |
| --- | --- |
| Développer des interfaces utilisateur | UC01–04, UC10–13, UC20–21, UC30 (front React) |
| Développer des composants métier | UC10/UC11 (algo répétition espacée = RG-01→07), UC01 (hachage) |
| Analyser les besoins et maquetter | Ce document + maquettes (à venir) + enchaînement des écrans |
| Concevoir une BDD relationnelle | Catalogue MySQL (issu du MCD à venir) |
| Composants d'accès SQL **et** NoSQL | UC10–13 : lecture/écriture MySQL (cartes) **et** MongoDB (sessions/réponses) |
| Sécurité (transverse) | §7 cas de mésusage + garde-fous `security.*` |
| Préparer/exécuter les plans de tests | RG-01→07 = fonctions pures → tests unitaires ; UC10/11 = tests d'intégration |

---

## 9. Décisions & points ouverts

**Décisions actées (2026-07-08) :**

- ✅ **Format unique = QCM.** Une question a 2..N réponses proposées, chacune *correcte* ou *incorrecte* ;
  **une ou plusieurs** bonnes réponses possibles. **Correction exacte** : ensemble coché = ensemble correct
  (aucun oubli, aucun cochage superflu). Pas d'autre type de question dans le MVP (un « vrai/faux » serait
  un QCM à 2 options). → alimente directement le MCD : `questions (1,n) — proposer — (1,1) reponses`,
  attribut `est_correcte` sur `reponses`.
- ✅ **UC14 (quiz libre) = extension**, hors MVP.

**Points ouverts mineurs (peuvent être tranchés au fil de l'eau) :**

1. **UC04** : simple changement de mot de passe, ou aussi e-mail/pseudo ? *(défaut proposé : mot de passe seul)*
2. **Admin** : un rôle en base suffit-il, ou faut-il une vraie gestion des utilisateurs par l'admin ? *(défaut proposé : rôle en base, pas d'écran de gestion des users dans le MVP)*
```
