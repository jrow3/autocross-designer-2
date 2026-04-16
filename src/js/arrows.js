// arrows.js — Directional arrow elements

const Arrows = {
  arrows: [],
  _nextId: 1,
  _map: null,
  _onUpdate: null,

  init(map, { onUpdate }) {
    this._map = map;
    this._onUpdate = onUpdate;
  },

  /** Place an arrow at the given lngLat */
  placeArrow(lngLat) {
    const id = this._nextId++;
    const lng = lngLat.lng !== undefined ? lngLat.lng : lngLat[0];
    const lat = lngLat.lat !== undefined ? lngLat.lat : lngLat[1];

    const el = document.createElement('div');
    el.className = 'arrow-marker';
    el.innerHTML = '<div class="arrow-shape">&#9654;</div>';

    const marker = window.createMarker({ element: el, draggable: true })
      .setLngLat([lng, lat])
      .addTo(this._map);

    const arrow = { id, lngLat: [lng, lat], rotation: 0, marker };
    this.arrows.push(arrow);

    // Add rotation handle
    this._addRotateHandle(arrow, el);

    // Update lngLat on drag
    marker.on('dragend', () => {
      const pos = marker.getLngLat();
      arrow.lngLat = [pos.lng, pos.lat];
      if (this._onUpdate) this._onUpdate();
    });

    // Right-click to delete
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.removeArrow(id);
    });

    if (this._onUpdate) this._onUpdate();
    return arrow;
  },

  /** Add a rotation handle to an arrow */
  _addRotateHandle(arrow, el) {
    const handle = document.createElement('div');
    handle.className = 'arrow-rotate-handle';
    handle.title = 'Drag to rotate';
    el.appendChild(handle);

    let rotating = false;
    let centerX, centerY;

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      rotating = true;
      const rect = el.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!rotating) return;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (e.shiftKey) angle = Math.round(angle / 15) * 15;
      arrow.rotation = angle;
      const shape = el.querySelector('.arrow-shape');
      if (shape) shape.style.transform = `rotate(${angle}deg)`;
    };

    const onMouseUp = () => {
      rotating = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (this._onUpdate) this._onUpdate();
    };

    handle.addEventListener('mousedown', onMouseDown);
  },

  /** Remove an arrow by id */
  removeArrow(id) {
    const idx = this.arrows.findIndex(a => a.id === id);
    if (idx === -1) return;
    this.arrows[idx].marker.remove();
    this.arrows.splice(idx, 1);
    if (this._onUpdate) this._onUpdate();
  },

  /** Clear all arrows */
  clearAll() {
    this.arrows.forEach(a => a.marker.remove());
    this.arrows = [];
  },

  /** Get data for serialization */
  getData() {
    return this.arrows.map(a => ({
      lngLat: a.lngLat,
      rotation: a.rotation,
    }));
  },

  /** Load arrows from saved data */
  loadData(data) {
    this.clearAll();
    data.forEach(d => {
      const arrow = this.placeArrow({ lng: d.lngLat[0], lat: d.lngLat[1] });
      arrow.rotation = d.rotation || 0;
      const shape = arrow.marker.getElement().querySelector('.arrow-shape');
      if (shape) shape.style.transform = `rotate(${arrow.rotation}deg)`;
    });
  },

  /** Show all arrows */
  show() {
    this.arrows.forEach(a => {
      a.marker.getElement().style.display = '';
      if (a.marker._container) a.marker._container.style.display = '';
    });
  },

  /** Hide all arrows */
  hide() {
    this.arrows.forEach(a => {
      a.marker.getElement().style.display = 'none';
      if (a.marker._container) a.marker._container.style.display = 'none';
    });
  },
};
