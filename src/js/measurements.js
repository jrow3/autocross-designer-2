// measurements.js — Persistent distance measurements with two-click workflow

const Measurements = {
  measurements: [],     // { id, points, coneIds, markers, labelEl, svgEl, sourceId }
  _nextId: 1,
  _map: null,
  _visible: true,
  _pendingPoint: null,  // first click lngLat waiting for second
  _pendingMarker: null,
  _pendingConeId: null, // cone id if first click snapped to a cone
  _dragging: false,     // true while an endpoint is being dragged

  init(map) {
    this._map = map;
    map.on('move', () => this.updateAllLabels());
  },

  /** Handle a click while measure tool is active. screenPoint for cone snapping. */
  handleClick(lngLat, screenPoint) {
    // Ignore clicks that result from finishing an endpoint drag
    if (this._dragging) return;

    let point = [lngLat.lng, lngLat.lat];
    let coneId = null;

    // Snap to cone if within 25px
    if (screenPoint) {
      const nearCone = App._findConeNear(screenPoint);
      if (nearCone) {
        point = nearCone.lngLat.slice();
        coneId = nearCone.id;
      }
    }

    // Also check if this click came directly from a cone (via _handleConeSelect)
    if (!coneId) {
      const exactCone = Cones.cones.find(c =>
        c.lngLat[0] === point[0] && c.lngLat[1] === point[1]
      );
      if (exactCone) coneId = exactCone.id;
    }

    if (!this._pendingPoint) {
      // First click
      this._pendingPoint = point;
      this._pendingConeId = coneId;
      this._pendingMarker = this._createEndpointMarker(point);
    } else {
      // Second click — create the measurement
      const p1 = this._pendingPoint;
      const p2 = point;
      const coneId1 = this._pendingConeId;
      const coneId2 = coneId;

      if (this._pendingMarker) {
        this._pendingMarker.remove();
        this._pendingMarker = null;
      }
      this._pendingPoint = null;
      this._pendingConeId = null;

      // Hide the live preview line/label
      App._hidePreviewLine();

      this._createMeasurement(p1, p2, coneId1, coneId2);
    }
  },

  /** Cancel a pending first click */
  cancelPending() {
    if (this._pendingMarker) {
      this._pendingMarker.remove();
      this._pendingMarker = null;
    }
    this._pendingPoint = null;
    this._pendingConeId = null;
  },

  /** Called when a cone moves — update any measurements anchored to it */
  updateConePosition(coneId, newLngLat) {
    for (const m of this.measurements) {
      let changed = false;

      if (m.coneIds[0] === coneId) {
        m.points[0] = newLngLat.slice();
        m.markers[0].setLngLat(newLngLat);
        changed = true;
      }
      if (m.coneIds[1] === coneId) {
        m.points[1] = newLngLat.slice();
        m.markers[1].setLngLat(newLngLat);
        changed = true;
      }

      if (changed) {
        this._updateMeasurementVisuals(m);
      }
    }
  },

  /** Called when a cone is deleted — detach any measurements from it (keep measurement, just unlink) */
  detachCone(coneId) {
    for (const m of this.measurements) {
      if (m.coneIds[0] === coneId) m.coneIds[0] = null;
      if (m.coneIds[1] === coneId) m.coneIds[1] = null;
    }
  },

  /** Create a full measurement between two points */
  _createMeasurement(p1, p2, coneId1, coneId2) {
    History.push();
    const id = this._nextId++;

    // Create endpoint markers (draggable)
    const m1 = this._createEndpointMarker(p1, id, 0);
    const m2 = this._createEndpointMarker(p2, id, 1);

    // Create label
    const labelEl = document.createElement('div');
    labelEl.className = 'measurement-label';
    labelEl.textContent = this._computeDistanceLabel(p1, p2);

    labelEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.removeMeasurement(id);
    });

    if (App.mode === 'image') {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('measurement-line-svg');
      svg.setAttribute('width', ImageMap._imageWidth);
      svg.setAttribute('height', ImageMap._imageHeight);
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '2';
      svg.style.overflow = 'visible';

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', p1[0]);
      line.setAttribute('y1', p1[1]);
      line.setAttribute('x2', p2[0]);
      line.setAttribute('y2', p2[1]);
      line.setAttribute('stroke', '#f472b6');
      line.setAttribute('stroke-width', '3');
      line.setAttribute('stroke-dasharray', '8,5');
      svg.appendChild(line);

      ImageMap._wrapper.insertBefore(svg, ImageMap._markerContainer);

      const midX = (p1[0] + p2[0]) / 2;
      const midY = (p1[1] + p2[1]) / 2;
      labelEl.style.position = 'absolute';
      labelEl.style.left = midX + 'px';
      labelEl.style.top = midY + 'px';
      labelEl.style.transform = `translate(-50%, -100%) scale(${1 / ImageMap._scale})`;
      labelEl.style.pointerEvents = 'auto';
      labelEl.style.zIndex = '10';
      ImageMap._markerContainer.appendChild(labelEl);

      this.measurements.push({
        id, points: [p1, p2], coneIds: [coneId1 || null, coneId2 || null],
        markers: [m1, m2], labelEl, svgEl: svg, sourceId: null,
      });
    } else {
      const svgOverlay = this._createMapLineSVG(p1, p2);
      document.body.appendChild(svgOverlay);

      labelEl.style.pointerEvents = 'auto';
      document.body.appendChild(labelEl);
      this._positionLabel(labelEl, p1, p2);

      this.measurements.push({
        id, points: [p1, p2], coneIds: [coneId1 || null, coneId2 || null],
        markers: [m1, m2], labelEl, svgEl: svgOverlay, sourceId: null,
      });
    }
  },

  /** Create an SVG line overlay for map mode */
  _createMapLineSVG(p1, p2) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '5';
    svg.style.overflow = 'visible';

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('stroke', '#f472b6');
    line.setAttribute('stroke-width', '2.5');
    line.setAttribute('stroke-dasharray', '6,4');
    svg.appendChild(line);

    const sp1 = this._map.project(p1);
    const sp2 = this._map.project(p2);
    line.setAttribute('x1', sp1.x);
    line.setAttribute('y1', sp1.y);
    line.setAttribute('x2', sp2.x);
    line.setAttribute('y2', sp2.y);

    return svg;
  },

  /** Create an endpoint marker dot */
  _createEndpointMarker(point, measureId, endpointIndex) {
    const el = document.createElement('div');
    el.className = 'measurement-endpoint';

    if (measureId !== undefined) {
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.removeMeasurement(measureId);
      });
    }

    const draggable = measureId !== undefined;
    const marker = window.createMarker({ element: el, draggable })
      .setLngLat(point)
      .addTo(this._map);

    if (draggable) {
      marker.on('dragstart', () => {
        this._dragging = true;
      });
      marker.on('drag', () => {
        const m = this.measurements.find(m => m.id === measureId);
        if (!m) return;
        const pos = marker.getLngLat();
        m.points[endpointIndex] = [pos.lng, pos.lat];
        // Detach from cone since it's been manually moved
        m.coneIds[endpointIndex] = null;
        this._updateMeasurementVisuals(m);
      });
      marker.on('dragend', () => {
        // Delay clearing so the subsequent click event is still suppressed
        setTimeout(() => { this._dragging = false; }, 50);
      });
    }

    return marker;
  },

  /** Update line geometry and label for a measurement */
  _updateMeasurementVisuals(m) {
    // Update label text
    m.labelEl.textContent = this._computeDistanceLabel(m.points[0], m.points[1]);

    if (App.mode === 'image') {
      const line = m.svgEl ? m.svgEl.querySelector('line') : null;
      if (line) {
        line.setAttribute('x1', m.points[0][0]);
        line.setAttribute('y1', m.points[0][1]);
        line.setAttribute('x2', m.points[1][0]);
        line.setAttribute('y2', m.points[1][1]);
      }
      const midX = (m.points[0][0] + m.points[1][0]) / 2;
      const midY = (m.points[0][1] + m.points[1][1]) / 2;
      m.labelEl.style.left = midX + 'px';
      m.labelEl.style.top = midY + 'px';
    } else {
      const line = m.svgEl ? m.svgEl.querySelector('line') : null;
      if (line) {
        const sp1 = this._map.project(m.points[0]);
        const sp2 = this._map.project(m.points[1]);
        line.setAttribute('x1', sp1.x);
        line.setAttribute('y1', sp1.y);
        line.setAttribute('x2', sp2.x);
        line.setAttribute('y2', sp2.y);
      }
      this._positionLabel(m.labelEl, m.points[0], m.points[1]);
    }
  },

  /** Compute distance label string between two points */
  _computeDistanceLabel(p1, p2) {
    let feet;
    if (App.mode === 'image') {
      if (!ImageMap.hasScale()) {
        const dx = p1[0] - p2[0];
        const dy = p1[1] - p2[1];
        return Math.sqrt(dx * dx + dy * dy).toFixed(0) + ' px';
      }
      feet = Distance._pixelDistFeet(p1, p2);
    } else {
      const meters = Distance._haversine(p1[1], p1[0], p2[1], p2[0]);
      feet = meters * 3.28084;
    }
    return feet.toFixed(1) + ' ft';
  },

  /** Position a label at the midpoint (map mode) */
  _positionLabel(labelEl, p1, p2) {
    const sp1 = this._map.project(p1);
    const sp2 = this._map.project(p2);
    const mx = (sp1.x + sp2.x) / 2;
    const my = (sp1.y + sp2.y) / 2;
    labelEl.style.left = mx + 'px';
    labelEl.style.top = (my - 16) + 'px';
  },

  /** Update all label and line positions (called on pan/zoom) */
  updateAllLabels() {
    if (App.mode === 'image') {
      for (const m of this.measurements) {
        if (m.labelEl && m.labelEl.parentNode) {
          const midX = (m.points[0][0] + m.points[1][0]) / 2;
          const midY = (m.points[0][1] + m.points[1][1]) / 2;
          m.labelEl.style.left = midX + 'px';
          m.labelEl.style.top = midY + 'px';
          m.labelEl.style.transform = `translate(-50%, -100%) scale(${1 / ImageMap._scale})`;
        }
      }
      return;
    }

    for (const m of this.measurements) {
      if (m.labelEl && m.labelEl.parentNode) {
        this._positionLabel(m.labelEl, m.points[0], m.points[1]);
      }
      if (m.svgEl && m.svgEl.parentNode) {
        const line = m.svgEl.querySelector('line');
        if (line) {
          const sp1 = this._map.project(m.points[0]);
          const sp2 = this._map.project(m.points[1]);
          line.setAttribute('x1', sp1.x);
          line.setAttribute('y1', sp1.y);
          line.setAttribute('x2', sp2.x);
          line.setAttribute('y2', sp2.y);
        }
      }
    }
  },

  /** Remove a measurement by id */
  removeMeasurement(id) {
    const idx = this.measurements.findIndex(m => m.id === id);
    if (idx === -1) return;
    const m = this.measurements[idx];

    m.markers.forEach(mk => mk.remove());
    if (m.labelEl && m.labelEl.parentNode) {
      m.labelEl.parentNode.removeChild(m.labelEl);
    }
    if (m.svgEl && m.svgEl.parentNode) {
      m.svgEl.parentNode.removeChild(m.svgEl);
    }

    this.measurements.splice(idx, 1);
  },

  /** Toggle visibility */
  toggleVisibility() {
    this._visible = !this._visible;
    for (const m of this.measurements) {
      const display = this._visible ? '' : 'none';
      m.markers.forEach(mk => {
        mk.getElement().style.display = display;
        if (mk._container) mk._container.style.display = display;
      });
      if (m.labelEl) m.labelEl.style.display = display;
      if (m.svgEl) m.svgEl.style.display = display;
    }
    return this._visible;
  },

  /** Clear all */
  clearAll() {
    while (this.measurements.length > 0) {
      this.removeMeasurement(this.measurements[0].id);
    }
  },

  /** Get data for serialization */
  getData() {
    return this.measurements.map(m => ({
      p1: m.points[0],
      p2: m.points[1],
      coneId1: m.coneIds[0],
      coneId2: m.coneIds[1],
    }));
  },

  /** Load measurements from saved data */
  loadData(data) {
    this.clearAll();
    data.forEach(d => {
      this._createMeasurement(d.p1, d.p2, d.coneId1 || null, d.coneId2 || null);
    });
  },
};
