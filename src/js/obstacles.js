// obstacles.js — Obstacle/hazard markers

const OBSTACLE_TYPES = [
  { id: 'pole',    label: 'Light Pole', symbol: '\u00d7',  color: '#ef4444' },
  { id: 'drain',   label: 'Drain',      symbol: '\u25c6',  color: '#f59e0b' },
  { id: 'curb',    label: 'Curb',       symbol: '\u25ac',  color: '#ef4444' },
  { id: 'building',label: 'Building',   symbol: '\u25a0',  color: '#94a3b8' },
  { id: 'pothole', label: 'Pothole',    symbol: '\u25cb',  color: '#f59e0b' },
  { id: 'hazard',  label: 'Hazard',     symbol: '\u26a0',  color: '#ef4444' },
];

const Obstacles = {
  obstacles: [],
  _nextId: 1,
  _map: null,
  _onUpdate: null,
  _selectedType: 'hazard',

  init(map, { onUpdate }) {
    this._map = map;
    this._onUpdate = onUpdate;
  },

  /** Set the obstacle type to place */
  setType(typeId) {
    this._selectedType = typeId;
  },

  /** Get available obstacle types */
  getTypes() {
    return OBSTACLE_TYPES;
  },

  /** Place an obstacle at the given lngLat */
  placeObstacle(lngLat, typeId) {
    const type = typeId || this._selectedType;
    const typeDef = OBSTACLE_TYPES.find(t => t.id === type) || OBSTACLE_TYPES[5];
    const id = this._nextId++;
    const lng = lngLat.lng !== undefined ? lngLat.lng : lngLat[0];
    const lat = lngLat.lat !== undefined ? lngLat.lat : lngLat[1];

    const el = document.createElement('div');
    el.className = 'obstacle-marker';
    el.innerHTML = `<span class="obstacle-symbol" style="color:${typeDef.color}">${typeDef.symbol}</span>`;
    el.title = typeDef.label;

    const marker = window.createMarker({ element: el, draggable: true })
      .setLngLat([lng, lat])
      .addTo(this._map);

    const obstacle = { id, type, label: typeDef.label, lngLat: [lng, lat], marker };
    this.obstacles.push(obstacle);

    // Group drag: start tracking when drag begins on a multi-selected obstacle
    marker.on('dragstart', () => {
      if (typeof Selection !== 'undefined' && Selection.isSelected('obstacle', obstacle.id) && Selection.count() > 1) {
        Selection.startGroupDrag('obstacle', obstacle.id);
      }
    });

    // Group drag: move all selected items during drag
    marker.on('drag', () => {
      if (typeof Selection !== 'undefined' && Selection.isSelected('obstacle', obstacle.id) && Selection.count() > 1) {
        const pos = marker.getLngLat();
        Selection.updateGroupDrag(pos);
      }
    });

    marker.on('dragend', () => {
      const pos = marker.getLngLat();
      obstacle.lngLat = [pos.lng, pos.lat];

      // If part of a group drag, finalize all positions
      if (typeof Selection !== 'undefined' && Selection.isSelected('obstacle', obstacle.id) && Selection.count() > 1) {
        Selection.endGroupDrag();
      }

      if (this._onUpdate) this._onUpdate();
    });

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.removeObstacle(id);
    });

    if (this._onUpdate) this._onUpdate();
    return obstacle;
  },

  /** Remove an obstacle by id */
  removeObstacle(id) {
    const idx = this.obstacles.findIndex(o => o.id === id);
    if (idx === -1) return;
    this.obstacles[idx].marker.remove();
    this.obstacles.splice(idx, 1);
    if (this._onUpdate) this._onUpdate();
  },

  /** Clear all obstacles */
  clearAll() {
    this.obstacles.forEach(o => o.marker.remove());
    this.obstacles = [];
  },

  /** Get data for serialization */
  getData() {
    return this.obstacles.map(o => ({
      type: o.type,
      lngLat: o.lngLat,
    }));
  },

  /** Load obstacles from saved data */
  loadData(data) {
    this.clearAll();
    data.forEach(d => {
      this.placeObstacle({ lng: d.lngLat[0], lat: d.lngLat[1] }, d.type);
    });
  },

  /** Show all obstacles */
  show() {
    this.obstacles.forEach(o => {
      o.marker.getElement().style.display = '';
      if (o.marker._container) o.marker._container.style.display = '';
    });
  },

  /** Hide all obstacles */
  hide() {
    this.obstacles.forEach(o => {
      o.marker.getElement().style.display = 'none';
      if (o.marker._container) o.marker._container.style.display = 'none';
    });
  },

  /** Count */
  count() {
    return this.obstacles.length;
  },
};
