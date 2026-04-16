// venue.js — Venue template save/load

const Venue = {
  STORAGE_KEY: 'autocross-venues',

  /** Get all saved venues */
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  },

  /** Save current venue (obstacles + map position) */
  saveVenue() {
    const name = prompt('Venue name:');
    if (!name) return;

    const center = App.map.getCenter();
    const data = {
      obstacles: typeof Obstacles !== 'undefined' ? Obstacles.getData() : [],
      mapCenter: center.toArray ? center.toArray() : [center.lng, center.lat],
      mapZoom: App.map.getZoom(),
      mode: App.mode,
      imageFileName: App.imageFileName || null,
    };

    const all = this.getAll();
    all[name] = data;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));

    this._showToast(`Venue "${name}" saved`, 'info');
    this.renderSidebar();
  },

  /** Load a venue by name */
  loadVenue(name) {
    const data = this.getAll()[name];
    if (!data) return;

    if (data.obstacles && typeof Obstacles !== 'undefined') {
      Obstacles.loadData(data.obstacles);
    }

    if (data.mapCenter && data.mapZoom && App.mode === 'map') {
      if (typeof MapModule !== 'undefined') {
        MapModule.flyTo(data.mapCenter, data.mapZoom);
      }
    }

    this._showToast(`Venue "${name}" loaded`, 'info');
    if (typeof App !== 'undefined') App._updateInfo();
  },

  /** Delete a venue by name */
  removeVenue(name) {
    const all = this.getAll();
    delete all[name];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
    this.renderSidebar();
  },

  /** Render venue list in sidebar */
  renderSidebar() {
    const list = document.getElementById('venues-list');
    if (!list) return;

    const names = Object.keys(this.getAll());
    if (names.length === 0) {
      list.innerHTML = '<div style="font-size:12px;color:rgba(255,255,255,0.4)">No saved venues</div>';
      return;
    }

    list.innerHTML = names.map(name => {
      const safe = escapeHtml(name);
      return `
      <div class="venue-item">
        <span data-venue="${safe}">${safe}</span>
        <button data-venue-delete="${safe}" title="Delete">&times;</button>
      </div>
    `;
    }).join('');

    list.querySelectorAll('span[data-venue]').forEach(el => {
      el.addEventListener('click', () => {
        this.loadVenue(el.dataset.venue);
      });
    });

    list.querySelectorAll('button[data-venue-delete]').forEach(el => {
      el.addEventListener('click', () => {
        if (confirm(`Delete venue "${el.dataset.venueDelete}"?`)) {
          this.removeVenue(el.dataset.venueDelete);
        }
      });
    });
  },

  /** Show a toast notification */
  _showToast(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type || 'info'}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
};
