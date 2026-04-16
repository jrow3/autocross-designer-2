// storage.js — Save/load/export/import courses via localStorage + JSON files

const Storage = {
  STORAGE_KEY: 'autocross-courses',

  /** Get all saved courses as { name: courseData } */
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  },

  /** Save a course by name */
  save(name, data) {
    const all = this.getAll();
    all[name] = data;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
  },

  /** Load a course by name, returns null if not found */
  load(name) {
    return this.getAll()[name] || null;
  },

  /** Delete a course by name */
  remove(name) {
    const all = this.getAll();
    delete all[name];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
  },

  /** List all saved course names */
  list() {
    return Object.keys(this.getAll());
  },

  /** Current course-data schema version. Bump when the shape of serialized data changes. */
  SCHEMA_VERSION: 1,

  /** Migrate older course data to the current schema version. Returns the migrated data. */
  migrate(data) {
    if (!data || typeof data !== 'object') return data;
    if (!data.schemaVersion) {
      // Pre-versioned exports are treated as v1 (the shape didn't change at v1).
      data.schemaVersion = 1;
    }
    // Future migrations: if (data.schemaVersion < 2) { ... data.schemaVersion = 2; }
    return data;
  },

  /**
   * Defensive validation of course data loaded from any untrusted source
   * (URL hash, JSON file import, future cloud load). Sanitizes in place and
   * returns the same object so callers can chain. Never throws — degrades
   * gracefully by warning and dropping bad fields.
   */
  validate(data) {
    if (data == null || typeof data !== 'object') return data;

    // Strip prototype-pollution attempts anywhere in the tree.
    this._sanitizePrototypeKeys(data, 0);

    // Drop fields whose type doesn't match expectation.
    const arrayFields = [
      'cones', 'drivingLine', 'measurements', 'notes',
      'obstacles', 'workers', 'courseOutline',
    ];
    for (const f of arrayFields) {
      if (data[f] != null && !Array.isArray(data[f])) {
        console.warn('Storage.validate: dropping non-array field', f);
        delete data[f];
      }
    }

    // Cap array sizes — a runaway payload would crash the renderer.
    const MAX_ITEMS = 5000;
    for (const f of arrayFields) {
      if (Array.isArray(data[f]) && data[f].length > MAX_ITEMS) {
        console.warn(
          'Storage.validate: truncating field', f,
          'from', data[f].length, 'to', MAX_ITEMS
        );
        data[f] = data[f].slice(0, MAX_ITEMS);
      }
    }

    return data;
  },

  /** Recursively delete __proto__/constructor/prototype keys. Bounded depth. */
  _sanitizePrototypeKeys(obj, depth) {
    const MAX_DEPTH = 10;
    if (depth > MAX_DEPTH) {
      console.warn('Storage.validate: skipping deeply-nested branch at depth', depth);
      return;
    }
    if (obj == null || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        console.warn('Storage.validate: removed dangerous key', key);
        delete obj[key];
        continue;
      }
      this._sanitizePrototypeKeys(obj[key], depth + 1);
    }
  },

  /** Serialize current state to a plain object for saving */
  serialize(cones, drivingLine, measurements, notes, mapCenter, mapZoom, imageMode, imageFileName) {
    const data = {
      schemaVersion: this.SCHEMA_VERSION,
      cones: cones.map(c => {
        const d = { id: c.id, type: c.type, lngLat: c.lngLat, lockedTargetId: c.lockedTargetId || null };
        if (c.width != null) d.width = c.width;
        if (c.height != null) d.height = c.height;
        if (c.rotation) d.rotation = c.rotation;
        return d;
      }),
      drivingLine: drivingLine.map(wp => ({ lngLat: wp.lngLat })),
      measurements: measurements,
      notes: notes,
      mapCenter,
      mapZoom,
    };
    if (imageMode) {
      data.imageMode = true;
      data.imageFileName = imageFileName || null;
      if (ImageMap.hasScale()) {
        data.imageScale = ImageMap.getScale();
      }
    }
    return data;
  },

  /** Export current course as a downloadable JSON file */
  exportJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'autocross-course.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /** Import a JSON file, returns a Promise that resolves with parsed data */
  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          resolve(JSON.parse(e.target.result));
        } catch (err) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },
};
