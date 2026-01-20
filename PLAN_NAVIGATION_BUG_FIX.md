# Plan d'implémentation : Correction du bug de navigation arrière et restauration d'état

## 🎯 Objectif
Corriger le bug où le back button ramène à l'accueil (`/`) au lieu de revenir aux résultats avec la recherche/filtre intact. Implémenter un système de cache Redis côté serveur pour restaurer instantanément :
1. ✅ L'état de recherche/filtres
2. ✅ Les mods chargés (scroll position)
3. ✅ La position du scroll exacte

**Ticket associé :** [BUG] Navigation back button issue

---

## 📋 Analyse du problème actuel

### Architecture actuelle
- **Front-end :** Next.js 15 (App Router), composants stateless pour recherche
- **État :** `useSearchState()` hook (sessionStorage) + état local des composants
- **Navigation :** `/` (accueil) → recherche → ModList chargé → clic mod → `/mods?id=123` → back → **❌ revient à `/` au lieu de `/` avec résultats**

### Racine du bug
1. L'état de recherche est sauvegardé en sessionStorage ✅
2. Les mods chargés sont **perdus** au retour (état local du composant `ModList`) ❌
3. Le scroll position est sauvegardé mais pas restauré correctement ⚠️
4. Aucun système de cache côté serveur pour les données volumineuses

---

## 🏗️ Solution architecturale

### Stack à ajouter
1. **Backend :** Redis sur le serveur dédié
2. **API :** Endpoints pour gérer cache search results
3. **Frontend :** Utiliser `cacheKey` pour restaurer les résultats
4. **Navigation :** Préserver les query params ou state lors du back

### Flux de données

```
┌─────────────────────────────────────────────────────┐
│                    APP (Front)                       │
├─────────────────────────────────────────────────────┤
│  page.tsx (Home)                                     │
│    ↓                                                  │
│  Effectue recherche → appelle API avec query params  │
│    ↓                                                  │
│  Reçoit {data, cacheKey} ← API crée clé Redis       │
│    ↓                                                  │
│  Sauvegarde en sessionStorage : {cacheKey, state}   │
│    ↓                                                  │
│  ModList affiche résultats avec Virtuoso            │
│    ↓                                                  │
│  User clique mod → /mods?id=123&cacheKey=ABC       │
│    ↓                                                  │
│  ModDetailClient.tsx affiche détail                 │
│    ↓                                                  │
│  User clique back → history.back()                  │
│    ↓                                                  │
│  Retour à / + restoration depuis sessionStorage      │
│    ├─ Récupère cacheKey                             │
│    ├─ Appelle API : /api/cache/search/{cacheKey}   │
│    ├─ Redis retourne les mods chargés               │
│    └─ Restaure scroll position et virtuoso position │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## 📝 Implémentation détaillée

### Phase 1 : Backend - Redis et API

#### 1.1 Installation Redis
**Fichier :** `docker-compose.yml` (ou infra existante)

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
```

#### 1.2 Intégration Redis dans l'API
**Fichiers à créer/modifier :**
- `backend/src/services/cacheService.ts` (ou JS selon ton stack)
  - `generateCacheKey(query, sort, filter, category)` → hash unique
  - `saveCacheEntry(key, mods, metadata)` → Redis SET avec TTL 5min
  - `getCacheEntry(key)` → Redis GET
  - `invalidateCache(key)` → Redis DEL

- `backend/src/routes/cache.ts`
  - `POST /api/cache/search` : Sauvegarde résultats après appel CurseForge
    - **Input :** `{query, sortBy, filter, category, mods, totalCount, pageCount}`
    - **Output :** `{cacheKey, expiresIn, timestamp}`
  - `GET /api/cache/search/:cacheKey` : Récupère résultats cachés
    - **Input :** `cacheKey` (path param)
    - **Output :** `{mods, totalCount, pageCount, timestamp, isExpired}`

#### 1.3 Modification endpoint search existant
**Fichier :** `backend/src/routes/search.ts` (ou équivalent)

**Comportement actuel :**
```
GET /api/search?query=...&pageIndex=0&sortBy=...
  → Appel CurseForge
  → Retourne mods
```

**Nouveau comportement :**
```
GET /api/search?query=...&pageIndex=0&sortBy=...&generateCache=true
  → Appel CurseForge
  → Sauvegarde en Redis
  → Retourne {mods, cacheKey, totalCount}
```

**Modifications :**
- Ajouter param `?generateCache=true` (optionnel, par défaut false)
- Après fetcher CurseForge, appeler `cacheService.saveCacheEntry()`
- Ajouter `cacheKey` à la réponse

---

### Phase 2 : Frontend - Intégration avec sessionStorage et cache

#### 2.1 Enrichissement du hook `useSearchState`
**Fichier :** `app/src/hooks/useSearchState.ts`

**État à ajouter :**
```typescript
interface SearchState {
  searchQuery: string;
  activeSort: SortOption;
  activeFilter: FilterChip;
  selectedCategory: string;
  scrollIndex: number;
  pageIndex: number;
  previousSort: SortOption;
  cacheKey?: string;                    // ✨ NOUVEAU
  cacheTimestamp?: number;              // ✨ NOUVEAU
  cachedModsCount?: number;             // ✨ NOUVEAU
}
```

**Setters à ajouter :**
```typescript
const setCacheKey = useCallback((key: string) => { ... }, []);
const clearCache = useCallback(() => { ... }, []);
```

#### 2.2 Nouveau hook : `useSearchCache`
**Fichier :** `app/src/hooks/useSearchCache.ts` (créer)

```typescript
export function useSearchCache() {
  /**
   * Récupère les mods cachés depuis l'API
   * @param cacheKey - Clé du cache
   * @returns {mods, isExpired, error}
   */
  const fetchCachedMods = async (cacheKey: string) => {
    try {
      const response = await fetch(`/api/cache/search/${cacheKey}`);
      if (!response.ok) {
        throw new Error('Cache expired or not found');
      }
      return await response.json(); // {mods, totalCount, isExpired}
    } catch (error) {
      return { mods: null, error };
    }
  };

  return { fetchCachedMods };
}
```

#### 2.3 Modification de `page.tsx` (Home)
**Fichier :** `app/src/app/page.tsx`

**Changements :**
1. Importer `useSearchState` et utiliser ses getters au montage
2. Ajouter logique de restauration au montage :
   ```typescript
   useEffect(() => {
     if (isMounted && searchState.isLoaded) {
       // Si cacheKey existe et pas expiré, restaurer
       if (searchState.cacheKey && searchState.scrollIndex > 0) {
         // Marquer ModList pour restaurer depuis cache
         setRestoreFromCache(true);
       }
     }
   }, [isMounted, searchState.isLoaded]);
   ```
3. Passer l'état restauré à `ModList` via props

#### 2.4 Modification de `ModList.tsx`
**Fichier :** `app/src/components/mod/ModList.tsx`

**Changements :**
1. Ajouter props :
   ```typescript
   interface ModListProps {
     searchQuery: string;
     sortBy: SortOption;
     category?: string;
     viewMode: ViewMode;
     restoreFromCache?: boolean;        // ✨ NOUVEAU
     cacheKey?: string;                 // ✨ NOUVEAU
     targetScrollIndex?: number;        // ✨ NOUVEAU
   }
   ```

2. Logique de chargement :
   ```typescript
   useEffect(() => {
     if (restoreFromCache && cacheKey) {
       // Charger depuis cache au lieu de refetcher
       loadCachedMods(cacheKey);
     } else {
       // Comportement normal
       fetchModsForPage(0);
     }
   }, [searchQuery, sortBy, category, restoreFromCache]);
   ```

3. Ajouter fonction `loadCachedMods()` :
   ```typescript
   const loadCachedMods = async (cacheKey: string) => {
     setIsLoading(true);
     const { mods, totalCount, isExpired } = await fetchCachedMods(cacheKey);

     if (isExpired) {
       // Cache expiré, refetcher normalement
       fetchModsForPage(0);
     } else {
       setMods(mods);
       setPagination(prev => ({...prev, totalCount}));
       // Restaurer position du scroll
       if (targetScrollIndex) {
         setTimeout(() => listRef.current?.scrollToIndex(targetScrollIndex), 100);
       }
     }
     setIsLoading(false);
   };
   ```

4. Modification du `fetchModsForPage()` pour générer cache :
   ```typescript
   const fetchModsForPage = async (pageIndex: number) => {
     // ... appel API existant ...

     if (pageIndex === 0) {
       // Première page : générer cache pour futur back
       const cacheResponse = await fetch('/api/cache/search', {
         method: 'POST',
         body: JSON.stringify({
           query: searchQuery,
           sortBy: sortBy,
           filter: activeFilter,
           category: category,
           mods: response.data,
           totalCount: response.totalCount,
           pageCount: response.pageCount
         })
       });
       const { cacheKey } = await cacheResponse.json();
       useSearchState().setCacheKey(cacheKey);
     }
   };
   ```

#### 2.5 Modification de `ModDetailClient.tsx`
**Fichier :** `app/src/app/mods/ModDetailClient.tsx`

**Changements :**
1. Récupérer `cacheKey` des query params ou du contexte
2. Ajouter lien retour avec state :
   ```typescript
   <button onClick={() => window.history.back()}>
     <ArrowLeft /> Back
   </button>
   ```
   (Comportement identique, juste le back button gère la restauration)

---

### Phase 3 : Restauration du scroll avec Virtuoso

#### 3.1 Configuration Virtuoso pour restauration
**Fichier :** `app/src/components/mod/ModList.tsx`

**Actualisations :**
```typescript
const scrollSeekConfiguration = {
  enter: (velocity) => Math.abs(velocity) > 200,
  exit: (velocity) => Math.abs(velocity) < 30,
  change: (index, state) => {
    useSearchState().setScrollIndex(index); // Sauvegarder position
  },
  placeholder: ScrollPlaceholder,
};

return (
  <Virtuoso
    ref={listRef}
    data={displayData}
    scrollSeekConfiguration={scrollSeekConfiguration}
    initialTopMostItemIndex={restoreFromCache ? targetScrollIndex : 0}
    // ... autres props ...
  />
);
```

---

### Phase 4 : Route API pour le cache

#### 4.1 Endpoint POST `/api/cache/search`
**Fichier :** `backend/src/routes/cache.ts`

```typescript
POST /api/cache/search
Content-Type: application/json

{
  "query": string,
  "sortBy": "downloads" | "date" | "popularity" | "relevance",
  "filter": "all" | "updates" | "early-access" | "installed",
  "category": string,
  "mods": CurseForgeMod[],
  "totalCount": number,
  "pageCount": number
}

Response: 200 OK
{
  "cacheKey": "abc123def456",
  "expiresIn": 300,
  "timestamp": 1705000000000
}
```

#### 4.2 Endpoint GET `/api/cache/search/:cacheKey`
**Fichier :** `backend/src/routes/cache.ts`

```typescript
GET /api/cache/search/:cacheKey

Response: 200 OK
{
  "mods": CurseForgeMod[],
  "totalCount": number,
  "pageCount": number,
  "timestamp": 1705000000000,
  "isExpired": false
}

Response: 404 Not Found
{
  "error": "Cache not found or expired"
}
```

---

## 🧪 Stratégie de tests

### Tests unitaires
**Fichiers à tester :**
- `useSearchState.ts` : Sauvegarde/restauration état
- `useSearchCache.ts` : Fetch cache et gestion erreurs
- `cacheService.ts` (backend) : Génération clés, TTL

**Cas à couvrir :**
1. ✅ Sauvegarde cache avec toutes les données
2. ✅ Récupération cache valide
3. ✅ Gestion cache expiré
4. ✅ Validation des clés uniques (même query = même clé)
5. ✅ Nettoyage état après expiration

### Tests d'intégration
**Scénarios :**
1. **Navigation simple :**
   - Recherche "Mod A" → résultats chargés → clic mod detail → back → résultats restaurés

2. **Navigation avec scroll :**
   - Recherche "Mod B" → scroll position 150 → clic mod → back → scroll restauré à 150

3. **Filtre changé :**
   - Recherche "Mod C" avec filtre A → scroll → change filtre B → cache invalidé → nouvelle recherche

4. **Cache expiré :**
   - Recherche → laisse 5min passer → back → cache expiré → refetch depuis API

5. **Offline/erreur :**
   - Cache fetch échoue → fallback refetch normalement

### Tests manuels
**Sur l'app :**
1. Effectuer recherche "shader"
2. Scroller jusqu'à mod #25
3. Cliquer mod pour voir détail
4. Cliquer back button
5. Vérifier : scroll position restaurée + même résultats
6. Cliquer filtrer → cache invalidé → nouvelle recherche

---

## 📁 Fichiers à créer/modifier

### À CRÉER
```
backend/
├── src/
│   ├── services/
│   │   └── cacheService.ts          ✨ NOUVEAU
│   └── routes/
│       └── cache.ts                 ✨ NOUVEAU

app/src/
├── hooks/
│   └── useSearchCache.ts            ✨ NOUVEAU
└── config/
    └── redis.config.ts              ✨ NOUVEAU (si client Redis)
```

### À MODIFIER
```
backend/
└── src/routes/
    └── search.ts                    🔧 Ajouter cacheKey à response

app/src/
├── hooks/
│   └── useSearchState.ts            🔧 Ajouter cacheKey et methods
├── app/
│   ├── page.tsx                     🔧 Logique restauration
│   └── mods/
│       └── ModDetailClient.tsx      🔧 Passer cacheKey
└── components/mod/
    ├── ModList.tsx                  🔧 Major : loadCachedMods + restore logic
    └── FilterBar.tsx                🔧 Invalider cache si filtre change
```

### Configuration
```
backend/
├── docker-compose.yml               🔧 Ajouter service Redis
└── .env                             🔧 REDIS_URL=redis://localhost:6379
```

---

## 🔌 Dépendances à ajouter

### Backend
```bash
npm install redis ioredis  # Selon le client Redis préféré
```

### Frontend
Aucune nouvelle dépendance (fetch natif suffit)

---

## 📊 Timeline approximative

| Phase | Tâche | Estimé |
|-------|-------|--------|
| 1 | Setup Redis + API endpoints | 1-2h |
| 2 | Modification hooks frontend | 1-2h |
| 3 | Intégration ModList + restoration | 1-2h |
| 4 | Restoration du scroll avec Virtuoso | 30min |
| 5 | Tests unitaires et intégration | 1-2h |
| 6 | Tests manuels et fixes | 30min |
| **TOTAL** | | **5-9h** |

---

## ⚠️ Considérations importantes

1. **TTL Redis :** 5 minutes d'inactivité par défaut (configurable)
2. **Clés uniques :** Hash MD5 ou SHA256 de `{query+sortBy+filter+category}`
3. **Taille mémoire :** Chaque cache = N mods * ~2KB = géré par Redis (éviction LRU par défaut)
4. **Compatibilité offline :** Si pas de Redis/API, fallback sur comportement actuel (juste sessionStorage)
5. **Invalidation cache :** Lors de changement filtre/tri → appeler `clearCache()`

---

## 🎬 Ordre d'implémentation recommandé

1. ✅ **Phase 1.1** : Installer Redis (docker ou local)
2. ✅ **Phase 1.2-1.3** : Implémenter API cache (backend)
3. ✅ **Phase 2.1** : Enrichir `useSearchState` hook
4. ✅ **Phase 2.2** : Créer `useSearchCache` hook
5. ✅ **Phase 2.4** : Modifier `ModList.tsx` (logique principal)
6. ✅ **Phase 2.3** : Modifier `page.tsx` (restoration)
7. ✅ **Phase 3.1** : Configurer Virtuoso pour restauration scroll
8. ✅ **Phase 4** : Documenter API cache
9. ✅ **Tests** : Tests manuels complets

---

## 📝 Commits attendus (Conventional Commits)

```bash
feat(backend): add redis cache service for search results
feat(backend): add cache API endpoints GET/POST
feat(hooks): add useSearchCache hook for cache restoration
feat(hooks): extend useSearchState with cache key management
feat(components): implement cache-aware ModList restoration
feat(pages): add search state restoration logic on Home page
feat(virtuoso): configure scroll position restoration
feat(tests): add unit tests for cache service and hooks
test(e2e): add navigation back button test scenario
docs(cache): add cache strategy documentation
```

---

## 🚀 Notes finales

- Cette solution est **évolutive** : on peut ajouter plus de cache strategies plus tard
- **Performance :** Cache hit = restauration en <100ms vs refetch = 500-2000ms
- **Maintenance :** Redis simplifie la gestion d'état par rapport à localStorage
- **Scalabilité :** Prêt pour multi-users/instances grâce à Redis partagé

