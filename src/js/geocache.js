// geocache.js — Local cache for geocoding results to minimize API usage

const GeoCache = {
  _STORAGE_KEY: 'autocross-geocache',
  _MAX_ENTRIES: 50,

  /** Normalize a query for consistent cache keys */
  _normalize(query) {
    return query.toLowerCase().trim();
  },

  /** Get all cached entries */
  _getAll() {
    try {
      return JSON.parse(localStorage.getItem(this._STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  },

  /** Save all entries */
  _saveAll(entries) {
    localStorage.setItem(this._STORAGE_KEY, JSON.stringify(entries));
  },

  /** Evict oldest entries if over limit */
  _evict(entries) {
    const keys = Object.keys(entries);
    if (keys.length <= this._MAX_ENTRIES) return entries;

    // Sort by useCount ascending, then remove least-used
    const sorted = keys.sort((a, b) => (entries[a].useCount || 0) - (entries[b].useCount || 0));
    while (Object.keys(entries).length > this._MAX_ENTRIES) {
      delete entries[sorted.shift()];
    }
    return entries;
  },

  /** Look up a cached geocoding result. Returns { lngLat, displayName } or null */
  lookup(query) {
    const key = this._normalize(query);
    const entries = this._getAll();
    const entry = entries[key];
    if (!entry) return null;

    // Bump use count
    entry.useCount = (entry.useCount || 0) + 1;
    this._saveAll(entries);

    return { lngLat: entry.lngLat, displayName: entry.displayName };
  },

  /** Store a geocoding result */
  store(query, lngLat, displayName) {
    const key = this._normalize(query);
    const entries = this._getAll();

    entries[key] = {
      query: query.trim(),
      lngLat,
      displayName: displayName || query.trim(),
      useCount: 1,
    };

    this._evict(entries);
    this._saveAll(entries);
  },

  /** Find cached entries matching a prefix. Returns array of { query, lngLat, displayName } */
  suggest(prefix) {
    if (!prefix || prefix.length < 2) return [];

    const norm = this._normalize(prefix);
    const entries = this._getAll();
    const results = [];

    for (const key of Object.keys(entries)) {
      if (key.startsWith(norm) || entries[key].displayName.toLowerCase().includes(norm)) {
        results.push({
          query: entries[key].query,
          lngLat: entries[key].lngLat,
          displayName: entries[key].displayName,
          useCount: entries[key].useCount || 0,
        });
      }
    }

    // Sort by use count descending
    results.sort((a, b) => b.useCount - a.useCount);
    return results.slice(0, 5);
  },
};
