// grid.js — 10x10ft measurement grid overlay

const Grid = {
  _map: null,
  _canvas: null,
  _ctx: null,
  _active: false,
  _userRotation: 0,      // degrees from slider
  _lineMode: 'light',    // 'light' (white lines) or 'dark' (black lines)
  _anchorLngLat: null,   // fixed geo anchor so grid tracks ground
  _CELL_SIZE_M: 3.048,   // 10 feet in meters

  init(map) {
    this._map = map;
    this._canvas = document.getElementById('grid-canvas');
    this._ctx = this._canvas.getContext('2d');

    this._resize();
    window.addEventListener('resize', () => this._resize());

    // Redraw on map movement
    map.on('move', () => this._draw());
    map.on('zoom', () => this._draw());
    map.on('resize', () => { this._resize(); this._draw(); });
  },

  /** Toggle grid on/off */
  toggle() {
    this._active = !this._active;
    this._canvas.style.display = this._active ? 'block' : 'none';

    if (this._active) {
      // Set anchor to current map center
      const c = this._map.getCenter();
      this._anchorLngLat = [c.lng, c.lat];
      this._draw();
    } else {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }

    return this._active;
  },

  /** Set rotation in degrees */
  setRotation(deg) {
    this._userRotation = deg;
    if (this._active) this._draw();
  },

  /** Set line mode: 'light' or 'dark' */
  setLineMode(mode) {
    this._lineMode = mode;
    if (this._active) this._draw();
  },

  /** Is grid currently active? */
  isActive() {
    return this._active;
  },

  /** Resize canvas to match viewport */
  _resize() {
    this._canvas.width = window.innerWidth;
    this._canvas.height = window.innerHeight;
  },

  /** Calculate meters per pixel at current zoom/lat */
  _metersPerPixel() {
    if (App.mode === 'image') {
      const scale = this._map._scale || 1;
      // If scale is calibrated, use real feet-per-pixel to compute meters-per-pixel
      if (ImageMap.hasScale()) {
        return (ImageMap.getScale() / 3.28084) / scale;
      }
      // Fallback: make grid cells ~50px at scale 1
      return this._CELL_SIZE_M / (50 * scale);
    }
    const lat = this._map.getCenter().lat;
    const zoom = this._map.getZoom();
    // 78271.517 = equatorial m/px at zoom 0 for 512px tiles (Mapbox GL JS default)
    return 78271.517 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
  },

  /** Draw the grid */
  _draw() {
    if (!this._active || !this._anchorLngLat) return;

    const ctx = this._ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;
    ctx.clearRect(0, 0, w, h);

    const mpp = this._metersPerPixel();
    const cellPx = this._CELL_SIZE_M / mpp;

    // Skip drawing if cells are too small or too large
    if (cellPx < 4 || cellPx > 500) return;

    // Get anchor screen position
    const anchorScreen = this._map.project(this._anchorLngLat);
    const bearing = this._map.getBearing();
    const rotation = (this._userRotation - bearing) * Math.PI / 180;

    ctx.save();
    ctx.translate(anchorScreen.x, anchorScreen.y);
    ctx.rotate(rotation);

    // Calculate how many cells we need to cover the screen
    const diagonal = Math.sqrt(w * w + h * h);
    const halfCells = Math.ceil(diagonal / cellPx) + 1;

    // Offset so anchor is at a grid intersection
    ctx.strokeStyle = this._lineMode === 'dark'
      ? 'rgba(0, 0, 0, 0.55)'
      : 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = -halfCells; i <= halfCells; i++) {
      const pos = i * cellPx;
      // Vertical lines
      ctx.moveTo(pos, -halfCells * cellPx);
      ctx.lineTo(pos, halfCells * cellPx);
      // Horizontal lines
      ctx.moveTo(-halfCells * cellPx, pos);
      ctx.lineTo(halfCells * cellPx, pos);
    }

    ctx.stroke();

    // Draw origin marker
    ctx.strokeStyle = this._lineMode === 'dark'
      ? 'rgba(0, 0, 100, 0.5)'
      : 'rgba(255, 255, 100, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 10);
    ctx.stroke();

    ctx.restore();
  },
};
