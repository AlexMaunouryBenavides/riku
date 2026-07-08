---
# ─── Sélection — lu par /kit-init ────────────────────────────────────────────
id: observability
title: Observability (logs, traces, metrics)
discipline: observability
kind: code
tech: [nodejs]
layer: shared
phase: [implementation, review]
level: preference # défaut du fichier. Les règles sécurité-critiques sont marquées "guardrail".
status: active
version: 1.0
sources:
  - https://opentelemetry.io/docs/concepts/signals/
  - https://opentelemetry.io/docs/concepts/signals/logs/
  - https://opentelemetry.io/docs/concepts/context-propagation/
  - https://opentelemetry.io/docs/concepts/sampling/
  - https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-spans/
  - https://www.w3.org/TR/trace-context/
  - https://www.rfc-editor.org/rfc/rfc5424 # §6.2.1 Severity
  - https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
  - https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/
  - https://www.brendangregg.com/usemethod.html
  - https://prometheus.io/docs/practices/naming/
  - https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
---

# Observability (logs, traces, metrics)

> **Intention :** émettre les trois signaux d'observabilité (logs, traces, metrics) de façon
> **structurée**, **corrélée** de bout en bout et **sans donnée sensible**, en s'appuyant sur le
> **modèle standard** d'observabilité (vocabulaire OpenTelemetry : signaux, propagation de contexte).
> **Méta-principe :** on prescrit _les propriétés du signal_, **pas un outil ni un package**. La voie
> d'instrumentation reste celle du standard / du framework du projet.
> **Applies to :** `**/main.ts`, `**/index.ts`, `**/instrumentation.{ts,js}`, `**/*logger*.{ts,js}`,
> `**/*telemetry*.{ts,js}`, et partout où un signal est émis (logs, spans, métriques).

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 1 — DIRECTIVES (injectée)                                         -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Rules

### R1 — Émettre les trois signaux et propager le contexte qui les corrèle {#observability.r1}

- **Règle :** instrumenter l'application via les trois signaux — **traces**, **metrics**, **logs** — et faire circuler le **contexte** entre eux et à travers les frontières (services, processus), de sorte qu'ils soient corrélables.
- **Pourquoi :** OpenTelemetry définit ces signaux — trace = « The path of a request through your application », metric = « A measurement captured at runtime », log = « A recording of an event » — et le contexte comme « an object that contains the information … to correlate one signal with another ». Sans propagation du contexte, les signaux restent isolés et non recoupables.
- **Vérifié par :** manuel (setup).
- **Check (review) :** les trois signaux sont émis et partagent un contexte ; l'instrumentation passe par le standard / le mécanisme du framework, pas par un canal ad hoc qui ne propage rien.

### R2 — Logs structurés (schéma stable), pas de texte libre concaténé {#observability.r2}

- **Règle :** émettre des logs **structurés** — schéma défini et cohérent, champs typés que les systèmes en aval peuvent analyser de façon fiable. Pas de logs non structurés en production.
- **Pourquoi :** OpenTelemetry : « Structured logs are preferred in production because their stable schema makes them straightforward to validate, parse, correlate with traces and metrics, and analyze at scale » ; les logs non structurés sont « much more difficult to parse and analyze at scale ». **Attention :** « a log encoded as JSON is not automatically 'structured' » — la structure vient d'un **schéma stable**, pas du seul format machine.
- **Niveau :** guardrail
- **Vérifié par :** grep CI sur la concaténation de chaînes dans les appels de log + manuel.
- **Check (review) :** les logs sont émis comme champs structurés cohérents ; pas de message construit par concaténation/interpolation libre.
- ✅ **Bon :**
  ```ts
  logger.info('user signed up', { userId, plan }); // champs structurés, schéma réutilisable
  ```
- ❌ **Mauvais :**
  ```ts
  logger.info(`user ${userId} signed up on ${plan}`); // chaîne libre → non parsable à l'échelle
  ```

### R3 — Attribuer à chaque log un niveau de sévérité normalisé {#observability.r3}

- **Règle :** classer chaque log sur l'échelle de sévérité standard et de façon cohérente : Emergency, Alert, Critical, Error, Warning, Notice, Informational, Debug.
- **Pourquoi :** RFC 5424 §6.2.1 définit huit niveaux numérotés (0 = Emergency … 7 = Debug) — « Severity values MUST be in the range of 0 to 7 inclusive ». Une échelle partagée rend les logs filtrables et alertables sans relire le message.
- **Vérifié par :** manuel.
- **Check (review) :** les erreurs sont loggées en `error`, pas noyées en `info` ; le `debug` ne fuit pas en prod ; les niveaux ne sont pas tous identiques.
- ✅ **Bon :**
  ```ts
  logger.error('payment failed', { orderId, err });
  logger.debug('cache hit', { key });
  ```
- ❌ **Mauvais :**
  ```ts
  logger.info('payment failed: ' + err); // une erreur classée info → invisible aux alertes
  ```

### R4 — Aucune donnée sensible dans aucun signal {#observability.r4}

- **Règle :** ne **jamais** écrire dans un log, un attribut de span ou un label de métrique une donnée à exclure : mots de passe, identifiants de session, jetons d'accès, clés de chiffrement et autres secrets, chaînes de connexion BDD, données bancaires / carte de paiement, données personnelles sensibles / **PII**, code source. Si une telle valeur doit transiter, la supprimer, masquer, hasher ou chiffrer.
- **Pourquoi :** OWASP _Logging Cheat Sheet_ (« Data to exclude ») liste précisément ces éléments et indique qu'ils « should … be removed, masked, sanitized, hashed, or encrypted » ; des logs contenant des PII ou des « technical secrets such as passwords » servent de tremplin aux attaquants.
- **Niveau :** guardrail
- **Vérifié par :** grep/scan CI sur les motifs sensibles dans les appels de signal + manuel.
- **Check (review) :** aucun champ secret/PII dans un appel de log, un attribut de span ou un label de métrique ; les objets sensibles (requête, user, paiement) ne sont pas loggés bruts.
- ✅ **Bon :**
  ```ts
  logger.info('login attempt', { userId, ok }); // pas de mot de passe ni de token
  ```
- ❌ **Mauvais :**
  ```ts
  logger.info('login', { email, password, sessionToken }); // secrets + PII dans les logs
  ```

### R5 — Propager le contexte de trace via le standard W3C Trace Context {#observability.r5}

- **Règle :** propager le contexte de trace à travers les frontières de services/processus via le standard **W3C Trace Context** (en-tête `traceparent`), sans l'interrompre, pour une corrélation de bout en bout.
- **Pourquoi :** W3C Trace Context : sans identifiant partagé, « Traces that are collected by different tracing vendors cannot be correlated » ; le standard définit `traceparent`, qui « describes the position of the incoming request in its trace graph ». OpenTelemetry propage le contexte (Trace ID, Span ID) « using the `traceparent` header as it is defined in the W3C TraceContext specification ».
- **Niveau :** guardrail
- **Vérifié par :** manuel.
- **Check (review) :** les appels sortants propagent l'en-tête de contexte ; aucun service ne « casse » la trace en repartant d'un contexte vide pour une requête entrante déjà tracée.
- ✅ **Bon :**
  ```
  traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
  ```
- ❌ **Mauvais :** ouvrir une nouvelle trace à chaque service sans relayer le `traceparent` entrant → traces orphelines, non corrélables.

### R6 — Tracer les requêtes par des spans ; maîtriser le volume par sampling {#observability.r6}

- **Règle :** matérialiser le chemin des requêtes significatives par des **spans** (avec propagation du contexte), et contrôler le volume/coût des traces par une stratégie d'**échantillonnage** explicite en production.
- **Pourquoi :** une trace est « The path of a request through your application » (OTel). Le sampling est « one of the most effective ways to reduce the costs of observability without losing visibility » : _head sampling_ (simple, décidé en amont) ou _tail sampling_ (décision sur critères, p. ex. conserver toutes les traces en erreur).
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** les opérations significatives sont tracées ; une stratégie de sampling est définie (pas de 100 % implicite et non réfléchi en prod).

### R7 — Choisir les métriques par méthode (RED / USE) et borner la cardinalité {#observability.r7}

- **Règle :** pour un service **orienté requêtes**, suivre **RED** — _Rate_, _Errors_, _Duration_ ; pour une **ressource**, suivre **USE** — _Utilization_, _Saturation_, _Errors_. Garder une **cardinalité de labels basse**.
- **Pourquoi :** RED (Tom Wilkie) : Rate = « the number of requests per second », Errors = « the number of those requests that are failing », Duration = « the amount of time those requests take ». USE (Brendan Gregg) : « For every resource, check utilization, saturation, and errors ». Prometheus : « every unique combination of key-value label pairs represents a new time series » et « Do not use labels to store dimensions with high cardinality … such as user IDs, email addresses ».
- **Niveau :** preference
- **Vérifié par :** manuel.
- **Check (review) :** les métriques de service couvrent débit / erreurs / latence ; aucun label à cardinalité non bornée (id utilisateur, email…) — ce qui croise aussi #observability.r4.

### R8 — Enregistrer les exceptions avec leur contexte {#observability.r8}

- **Règle :** enregistrer les exceptions de façon structurée avec leur contexte : **type**, **message** et **stacktrace** — au lieu de les avaler.
- **Pourquoi :** OpenTelemetry (_semantic conventions — exceptions_) enregistre une exception comme événement nommé `exception` portant `exception.type` (« The type of the exception »), `exception.message` (« The exception message ») et `exception.stacktrace` ; au moins `exception.type` **ou** `exception.message` est requis.
- **Niveau :** preference
- **Vérifié par :** grep CI sur les `catch` vides + manuel.
- **Check (review) :** chaque exception capturée est enregistrée avec type/message/stacktrace dans un signal ; pas de `catch {}` silencieux. _(Le « comment gérer/typer » l'erreur relève de `error-handling.md` ; ici, seule sa capture/remontée.)_
- ✅ **Bon :**
  ```ts
  catch (err) {
    logger.error('checkout failed', { type: err.name, message: err.message, stack: err.stack });
    throw err;
  }
  ```
- ❌ **Mauvais :**
  ```ts
  catch (err) {} // exception avalée : aucune trace, aucun signal
  ```

### R9 — Exposer des sondes de santé (liveness / readiness) {#observability.r9}

- **Règle :** exposer des sondes de santé distinctes : **liveness** (détecter un état cassé à redémarrer) et **readiness** (savoir quand accepter du trafic) ; ajouter **startup** si le démarrage est long.
- **Pourquoi :** Kubernetes — la liveness probe sert « to know when to restart a container », la readiness probe « to know when a container is ready to start accepting traffic », la startup probe à savoir si l'application a démarré (les autres sondes sont désactivées tant qu'elle n'a pas réussi).
- **Niveau :** preference
- **Vérifié par :** manuel (setup).
- **Check (review) :** liveness et readiness sont exposées séparément ; la readiness ne renvoie « prêt » qu'une fois les dépendances requises disponibles.

## Anti-patterns

- Log construit par concaténation/interpolation libre → #observability.r2
- Erreur classée en `info` / niveaux tous identiques / `debug` en prod → #observability.r3
- Secret, token ou PII dans un log, un attribut de span ou un label → #observability.r4
- `traceparent` non propagé → trace cassée à la frontière → #observability.r5
- 100 % des traces conservées sans stratégie de sampling → #observability.r6
- Label de métrique à cardinalité non bornée (id user, email) → #observability.r7 (et r4)
- `catch {}` silencieux / exception non enregistrée → #observability.r8
- Liveness et readiness confondues, ou readiness « prête » avant les dépendances → #observability.r9

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COUCHE 2 — RÉFÉRENCE (lue à la demande)                                  -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Reference

**Les signaux (OpenTelemetry).** Trace = « The path of a request through your application » ; Metric =
« A measurement captured at runtime » ; Log = « A recording of an event » ; Baggage = « Contextual
information that is passed between signals ». Le **contexte** est « an object that contains the
information … to correlate one signal with another » ; la **propagation** est « the mechanism that moves
context between services and processes ».

**W3C Trace Context.** Deux en-têtes : `traceparent` (portable, longueur fixe, position de la requête
dans le graphe de trace) et `tracestate` (« extends traceparent with vendor-specific data »). Format du
`traceparent` : `<version>-<trace-id>-<parent-id>-<trace-flags>`.

**RED vs USE — quand utiliser quoi.** RED s'applique aux **services orientés requêtes** (débit, taux
d'erreur, latence) ; USE s'applique aux **ressources** (CPU, mémoire, disque, réseau, pools, locks…) via
utilization / saturation / errors. Les deux sont complémentaires : RED pour l'expérience des appelants,
USE pour les goulots d'étranglement de ressources.

**Cardinalité (Prometheus).** « every unique combination of key-value label pairs represents a new time
series » ; ne pas mettre en label des dimensions à forte cardinalité (id utilisateur, email, valeurs non
bornées) — l'explosion de séries gonfle le stockage. Ces identifiants ont leur place dans une **trace**,
pas dans un **label de métrique**.

**Exceptions — note de version.** La _semantic convention_ « exceptions on spans » (événement `exception`

- `exception.type` / `.message` / `.stacktrace`) est **dépréciée** au profit de « exceptions in logs » ;
  les attributs eux-mêmes restent la référence pour le contenu à enregistrer.

**Délégations (ne pas dupliquer ici) :**

- stockage, rotation et non-fuite des secrets → `rules/shared/security.md` (ici : seulement _ne pas les logger_) ;
- comment gérer/typer/propager une erreur (try-catch, types d'erreur) → `rules/backend/error-handling.md` (ici : seulement sa _capture/remontée_ dans un signal) ;
- niveaux/flags d'observabilité pilotés par variables d'environnement → `rules/shared/configuration.md`.

**Liens :** signaux → https://opentelemetry.io/docs/concepts/signals/ ·
logs structurés → https://opentelemetry.io/docs/concepts/signals/logs/ ·
propagation de contexte → https://opentelemetry.io/docs/concepts/context-propagation/ ·
W3C Trace Context → https://www.w3.org/TR/trace-context/ ·
sampling → https://opentelemetry.io/docs/concepts/sampling/ ·
sévérité → https://www.rfc-editor.org/rfc/rfc5424 (§6.2.1) ·
données à exclure → https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html ·
RED → https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/ ·
USE → https://www.brendangregg.com/usemethod.html ·
cardinalité → https://prometheus.io/docs/practices/naming/ ·
sondes → https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
