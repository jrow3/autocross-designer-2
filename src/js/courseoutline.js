// courseoutline.js — Course boundary outline segments (quadratic Bezier curves)

const CourseOutline = {
  segments: [],       // { id, points: [p1, p2], controlPoint, markers: [m1, m2, mCtrl], svgEl }
  _nextId: 1,
  _map: null,
  _visible: true,
  _pendingPoint: null,
  _pendingMarker: null,
  _dragging: false,

  init(map) {
    this._map = map;
    map.on('move', () => this.updateAllPositions());
  },

  /** Handle a click while courseoutline tool is active */
  handleClick(lngLat) {
    if (this._dragging) return;

    const point = [lngLat.lng, lngLat.lat];

    if (!this._pendingPoint) {
      // First click
      this._pendingPoint = point;
      this._pendingMarker = this._createPendingMarker(point);
    } else {
      // Second click — create the segment
      const p1 = this._pendingPoint;
      const p2 = point;

      if (this._pendingMarker) {
        this._pendingMarker.remove();
        this._pendingMarker = null;
      }
      this._pendingPoint = null;

      App._hidePreviewLine();

      this._createSegment(p1, p2);
    }
  },

  /** Cancel a pending first click */
  cancelPending() {
    if (this._pendingMarker) {
      this._pendingMarker.remove();
      this._pendingMarker = null;
    }
    this._pendingPoint = null;
  },

  /** Create a full outline segment between two points */
  _createSegment(p1, p2) {
    History.push();
    const id = this._nextId++;
    const controlPoint = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];

    const m1 = this._createEndpointMarker(p1, id, 0);
    const m2 = this._createEndpointMarker(p2, id, 1);
    const mCtrl = this._createControlMarker(controlPoint, id);

    // Create SVG with <path> for quadratic bezier
    if (App.mode === 'image') {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('outline-line-svg');
      svg.setAttribute('width', ImageMap._imageWidth);
      svg.setAttribute('height', ImageMap._imageHeight);
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '2';
      svg.style.overflow = 'visible';

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('stroke', '#ffffff');
      path.setAttribute('stroke-width', '3');
      path.setAttribute('fill', 'none');
      path.setAttribute('d', `M ${p1[0]} ${p1[1]} Q ${controlPoint[0]} ${controlPoint[1]} ${p2[0]} ${p2[1]}`);
      svg.appendChild(path);

      ImageMap._wrapper.insertBefore(svg, ImageMap._markerContainer);

      this.segments.push({
        id, points: [p1, p2], controlPoint,
        markers: [m1, m2, mCtrl], svgEl: svg,
      });
    } else {
      const svg = this._createMapSVG(p1, p2, controlPoint);
      document.body.appendChild(svg);

      this.segments.push({
        id, points: [p1, p2], controlPoint,
        markers: [m1, m2, mCtrl], svgEl: svg,
      });
    }
  },

  /** Create an SVG overlay for map mode */
  _createMapSVG(p1, p2, cp) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '5';
    svg.style.overflow = 'visible';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke', '#ffffff');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);

    const sp1 = this._map.project(p1);
    const sp2 = this._map.project(p2);
    const scp = this._map.project(cp);
    path.setAttribute('d', `M ${sp1.x} ${sp1.y} Q ${scp.x} ${scp.y} ${sp2.x} ${sp2.y}`);

    return svg;
  },

  /** Create a temporary pending marker (not draggable) */
  _createPendingMarker(point) {
    const el = document.createElement('div');
    el.className = 'outline-endpoint';
    return window.createMarker({ element: el, draggable: false })
      .setLngLat(point)
      .addTo(this._map);
  },

  /** Create a draggable endpoint marker */
  _createEndpointMarker(point, segId, index) {
    const el = document.createElement('div');
    el.className = 'outline-endpoint';

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.removeSegment(segId);
    });

    const marker = window.createMarker({ element: el, draggable: true })
      .setLngLat(point)
      .addTo(this._map);

    marker.on('dragstart', () => { this._dragging = true; });
    marker.on('drag', () => {
      const seg = this.segments.find(s => s.id === segId);
      if (!seg) return;
      const pos = marker.getLngLat();
      seg.points[index] = [pos.lng, pos.lat];
      this._updateSegmentVisuals(seg);
    });
    marker.on('dragend', () => {
      setTimeout(() => { this._dragging = false; }, 50);
    });

    return marker;
  },

  /** Create a draggable control point marker (curve handle) */
  _createControlMarker(point, segId) {
    const el = document.createElement('div');
    el.className = 'outline-control';

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.removeSegment(segId);
    });

    const marker = window.createMarker({ element: el, draggable: true })
      .setLngLat(point)
      .addTo(this._map);

    marker.on('dragstart', () => { this._dragging = true; });
    marker.on('drag', () => {
      const seg = this.segments.find(s => s.id === segId);
      if (!seg) return;
      const pos = marker.getLngLat();
      seg.controlPoint = [pos.lng, pos.lat];
      this._updateSegmentVisuals(seg);
    });
    marker.on('dragend', () => {
      setTimeout(() => { this._dragging = false; }, 50);
    });

    return marker;
  },

  /** Update SVG path from current points */
  _updateSegmentVisuals(seg) {
    const path = seg.svgEl ? seg.svgEl.querySelector('path') : null;
    if (!path) return;

    if (App.mode === 'image') {
      path.setAttribute('d',
        `M ${seg.points[0][0]} ${seg.points[0][1]} Q ${seg.controlPoint[0]} ${seg.controlPoint[1]} ${seg.points[1][0]} ${seg.points[1][1]}`
      );
    } else {
      const sp1 = this._map.project(seg.points[0]);
      const sp2 = this._map.project(seg.points[1]);
      const scp = this._map.project(seg.controlPoint);
      path.setAttribute('d',
        `M ${sp1.x} ${sp1.y} Q ${scp.x} ${scp.y} ${sp2.x} ${sp2.y}`
      );
    }
  },

  /** Reproject all SVG paths on map move/zoom */
  updateAllPositions() {
    if (App.mode === 'image') return; // image coords don't change on move
    for (const seg of this.segments) {
      this._updateSegmentVisuals(seg);
    }
  },

  /** Remove a segment by id */
  removeSegment(id) {
    const idx = this.segments.findIndex(s => s.id === id);
    if (idx === -1) return;
    const seg = this.segments[idx];

    seg.markers.forEach(mk => mk.remove());
    if (seg.svgEl && seg.svgEl.parentNode) {
      seg.svgEl.parentNode.removeChild(seg.svgEl);
    }

    this.segments.splice(idx, 1);
  },

  /** Toggle visibility */
  toggleVisibility() {
    this._visible = !this._visible;
    const display = this._visible ? '' : 'none';
    for (const seg of this.segments) {
      seg.markers.forEach(mk => {
        mk.getElement().style.display = display;
        if (mk._container) mk._container.style.display = display;
      });
      if (seg.svgEl) seg.svgEl.style.display = display;
    }
    return this._visible;
  },

  /** Clear all segments */
  clearAll() {
    while (this.segments.length > 0) {
      this.removeSegment(this.segments[0].id);
    }
  },

  /** Serialize for save */
  getData() {
    return this.segments.map(s => ({
      p1: s.points[0],
      p2: s.points[1],
      cp: s.controlPoint,
    }));
  },

  /** Load from saved data */
  loadData(data) {
    this.clearAll();
    data.forEach(d => {
      const id = this._nextId++;
      const p1 = d.p1, p2 = d.p2;
      const cp = d.cp || [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];

      const m1 = this._createEndpointMarker(p1, id, 0);
      const m2 = this._createEndpointMarker(p2, id, 1);
      const mCtrl = this._createControlMarker(cp, id);

      if (App.mode === 'image') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('outline-line-svg');
        svg.setAttribute('width', ImageMap._imageWidth);
        svg.setAttribute('height', ImageMap._imageHeight);
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '2';
        svg.style.overflow = 'visible';

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke', '#ffffff');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('d', `M ${p1[0]} ${p1[1]} Q ${cp[0]} ${cp[1]} ${p2[0]} ${p2[1]}`);
        svg.appendChild(path);

        ImageMap._wrapper.insertBefore(svg, ImageMap._markerContainer);

        this.segments.push({
          id, points: [p1, p2], controlPoint: cp,
          markers: [m1, m2, mCtrl], svgEl: svg,
        });
      } else {
        const svg = this._createMapSVG(p1, p2, cp);
        document.body.appendChild(svg);

        this.segments.push({
          id, points: [p1, p2], controlPoint: cp,
          markers: [m1, m2, mCtrl], svgEl: svg,
        });
      }
    });
  },
};
