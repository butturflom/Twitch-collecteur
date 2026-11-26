# Phase 2 - Architecture Scalable

## Objectif
Permettre le collecteur de fonctionner efficacement avec **500+ streamers**

## Problèmes identifiés (Phase 1)
- Limite Supabase gratuit : 500 MB
- Volume données : ~5673 présences/streamers/jour
- Rate limit Twitch : 800 req/min max
- Pas de file d'attente pour les requêtes API

---

## 2.1 File d'attente pour les requêtes API

### Fichier : `collecteur/task-queue.js`

```javascript
// File d'attente simple pour les requêtes Twitch API
class ApiQueue {
  constructor(maxRequestsPerMin = 800) {
    this.maxRequestsPerMin = maxRequestsPerMin;
    this.requests = [];
    this.lastReset = Date.now();
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.requests.push({ task, resolve, reject });
      this.process();
    });
  }

  async process() {
    const now = Date.now();
    if (now - this.lastReset > 60000) {
      this.requests = this.requests.slice(0, this.maxRequestsPerMin);
      this.lastReset = now;
    }

    if (this.requests.length === 0) return;

    const slot = Math.floor(this.requests.length / this.maxRequestsPerMin * 60000);
    const delay = Math.max(0, slot - (Date.now() - this.lastReset));

    await new Promise(r => setTimeout(r, delay));
    
    const { task, resolve, reject } = this.requests.shift();
    try {
      const result = await task();
      resolve(result);
    } catch (e) {
      reject(e);
    }

    this.process();
  }
}

export const apiQueue = new ApiQueue(750); // Limite propre : 750 req/min
```

---

## 2.2 Retry avec backoff exponentiel

### Fichier : `collecteur/retry-handler.mjs`

```javascript
// Gestion des retries avec backoff exponentiel
export class RetryHandler {
  constructor(maxRetries = 5, baseDelay = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  async withRetry(fn,onError = null) {
    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastError = e;
        
        // Codes d'erreur spécifiques pour ne pas réessayer
        if ([400, 401, 403, 404].includes(e.status)) {
          throw e;
        }

        // Backoff exponentiel
        const delay = this.baseDelay * Math.pow(2, attempt);
        
        if (onError) onError(e, attempt, delay);
        
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError;
  }
}

export const retryHandler = new RetryHandler();
```

---

## 2.3 Optimisation du schéma de base de données

### Indexs critiques à ajouter :

```sql
-- Index pour les queries de présence par chaîne et jour
create index if not exists presence_c_d_idx on presence (c, d);

-- Index pour les snaps par chaîne et timestamp
create index if not exists snaps_c_t_idx on snaps (c, t);

-- Index pour les events par type et timestamp
create index if not exists events_t_type_idx on events (t, type);

-- Partititionnement recommandé si > 2M lignes
-- Créer une table partitionnée pour presence
```

---

## 2.4 Système de monitoring

### Fichier : `collecteur/metrics.mjs`

```javascript
// Export vers Prometheus + file de log
import fs from 'node:fs';

export class Metrics {
  constructor() {
    this.reset();
    this.logPath = './metrics.log';
  }

  reset() {
    this.apiCalls = 0;
    this.apiErrors = 0;
    this.dbInserts = 0;
    this.queueSize = 0;
    this.startTime = Date.now();
  }

  inc(type) {
    this[type] = (this[type] || 0) + 1;
  }

  log() {
    const entry = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      apiCalls: this.apiCalls,
      apiErrors: this.apiErrors,
      dbInserts: this.dbInserts,
      queueSize: this.queueSize,
      successRate: this.apiCalls > 0 ? ((this.apiCalls - this.apiErrors) / this.apiCalls * 100).toFixed(2) : 100
    };
    
    fs.appendFileSync(this.logPath, JSON.stringify(entry) + '\n');
    this.reset();
  }
}

export const metrics = new Metrics();
```

---

## 2.5 Fonctions RPC pour gestion des streamers

### Schema SQL :

```sql
-- Fonction pour ajouter des streamers avec validation
create or replace function add_streamers_batch(list text[]) 
returns table(supported int, rejected text[])
language plpgsql as $$
declare
  added int := 0;
  rejected text[] := '{}';
  pattern text := '^[a-z0-9_]{2,25}$';
begin
  foreach chan in array list loop
    if chan ~ pattern and not exists (select 1 from channels where c = chan) then
      insert into channels (c) values (chan);
      added := added + 1;
    else
      rejected := array_append(rejected, chan);
    end if;
  end loop;
  return query select added, rejected;
end $$;

-- Nettoyage automatisé avec partitionnement
create or replace function cleanup_with_partition()
returns void as $$
begin
  -- Nettoyer selon la nouvelle rétention
  perform cleanup(
    days_minutes := 14,
    days_presence := 1,
    days_events := 3,
    days_snaps := 3
  );
  
  -- Forcer une mise à jour de statistiques
  analyze presence;
  analyze minutes;
end $$;
```

---

## Timeline d'implémentation

| Semaine | Tâche |
|---------|-------|
| 3 | Implémenter file d'attente API |
| 3 | Ajouter RetryHandler dans collecteur |
| 4 | Optimiser schéma DB (indexs) |
| 4 | Créer système de monitoring |
| 5 | Tests de charge (200 → 500 streamers) |
| 5 | Documentation & validation |

---

## Risques & Mitigation

| Risque | Mitigation |
|--------|------------|
| Rate limit Twitch | File d'attente avec backoff |
| Saturation mémoire | Limiter taille des buffers |
| Timeout DB | Timeout par requête + retry |
| Perte de données | Journalisation complète dans metrics.log |