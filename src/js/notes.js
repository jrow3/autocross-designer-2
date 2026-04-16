// notes.js — Map notes with numbered bubble markers and sidebar display

const Notes = {
  notes: [],           // { id, number, text, lngLat, marker }
  _nextId: 1,
  _nextNumber: 1,
  _map: null,
  _onUpdate: null,

  init(map, { onUpdate }) {
    this._map = map;
    this._onUpdate = onUpdate;
  },

  /** Add a note at the given lngLat, prompting for text */
  addNote(lngLat) {
    const text = prompt('Note text:');
    if (text === null || text.trim() === '') return;

    const id = this._nextId++;
    const number = this._nextNumber++;
    const lng = lngLat.lng !== undefined ? lngLat.lng : lngLat[0];
    const lat = lngLat.lat !== undefined ? lngLat.lat : lngLat[1];

    const el = document.createElement('div');
    el.className = 'note-marker';
    el.innerHTML = `<span class="note-number">${number}</span>`;

    const marker = window.createMarker({ element: el, draggable: true })
      .setLngLat([lng, lat])
      .addTo(this._map);

    const note = { id, number, text, lngLat: [lng, lat], marker };
    this.notes.push(note);

    // Update lngLat on drag
    marker.on('dragend', () => {
      const pos = marker.getLngLat();
      note.lngLat = [pos.lng, pos.lat];
      if (this._onUpdate) this._onUpdate();
    });

    // Right-click to delete
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.removeNote(id);
    });

    if (this._onUpdate) this._onUpdate();
    return note;
  },

  /** Remove a note by id */
  removeNote(id) {
    const idx = this.notes.findIndex(n => n.id === id);
    if (idx === -1) return;
    this.notes[idx].marker.remove();
    this.notes.splice(idx, 1);
    if (this._onUpdate) this._onUpdate();
  },

  /** Get data for serialization */
  getData() {
    return this.notes.map(n => ({
      number: n.number,
      text: n.text,
      lngLat: n.lngLat,
    }));
  },

  /** Load notes from saved data */
  loadData(data) {
    this.clearAll();
    let maxNum = 0;
    data.forEach(d => {
      const id = this._nextId++;
      const el = document.createElement('div');
      el.className = 'note-marker';
      el.innerHTML = `<span class="note-number">${d.number}</span>`;

      const marker = window.createMarker({ element: el, draggable: true })
        .setLngLat(d.lngLat)
        .addTo(this._map);

      const note = { id, number: d.number, text: d.text, lngLat: d.lngLat.slice(), marker };
      this.notes.push(note);

      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        note.lngLat = [pos.lng, pos.lat];
        if (this._onUpdate) this._onUpdate();
      });

      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.removeNote(id);
      });

      if (d.number > maxNum) maxNum = d.number;
    });
    this._nextNumber = maxNum + 1;
  },

  /** Clear all notes */
  clearAll() {
    this.notes.forEach(n => n.marker.remove());
    this.notes = [];
  },

  /** Render the notes list in the sidebar */
  renderSidebar() {
    const list = document.getElementById('notes-list');
    if (!list) return;

    if (this.notes.length === 0) {
      list.innerHTML = '<div style="font-size:12px;color:rgba(255,255,255,0.4)">No notes</div>';
      return;
    }

    list.innerHTML = this.notes.map(n => {
      const truncated = n.text.length > 30 ? n.text.substring(0, 30) + '...' : n.text;
      return `<div class="note-item" data-note-id="${n.id}">
        <span class="note-item-number">${n.number}</span>
        <span class="note-item-text">${truncated}</span>
      </div>`;
    }).join('');

    // Click to highlight on map
    list.querySelectorAll('.note-item').forEach(el => {
      el.addEventListener('click', () => {
        const note = this.notes.find(n => n.id === parseInt(el.dataset.noteId));
        if (note) {
          // Flash the marker
          const markerEl = note.marker.getElement();
          markerEl.classList.add('note-highlight');
          setTimeout(() => markerEl.classList.remove('note-highlight'), 1500);

          // Pan to note if in map mode
          if (App.mode === 'map') {
            App.map.flyTo({ center: note.lngLat, speed: 2 });
          }
        }
      });
    });
  },

  /** Get note count */
  count() {
    return this.notes.length;
  },
};
