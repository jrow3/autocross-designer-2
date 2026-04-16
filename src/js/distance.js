// distance.js — Distance calculation and label display

const Distance = {
  _map: null,
  _label: null,
  _selectedCone: null,

  init(map) {
    this._map = map;
    this._label = document.getElementById('distance-label');
  },

  /** Set the currently selected cone (or null to deselect) */
  setSelected(cone) {
    this._selectedCone = cone;
    if (!cone) this.hideLabel();
  },

  /** Show distance from selected cone to a target lngLat, called on mousemove */
  showDistanceTo(targetLngLat) {
    if (!this._selectedCone) return;
    if (App.mode === 'image' && !ImageMap.hasScale()) return;

    const from = this._selectedCone.lngLat;
    const to = targetLngLat;

    let feet;
    if (App.mode === 'image') {
      feet = this._pixelDistFeet(from, to);
    } else {
      const meters = this._haversine(from[1], from[0], to[1], to[0]);
      feet = meters * 3.28084;
    }

    // Position label between the two points on screen
    const p1 = this._map.project(from);
    const p2 = this._map.project([to[0], to[1]]);
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;

    this._label.textContent = `${feet.toFixed(1)} ft`;
    this._label.style.left = mx + 'px';
    this._label.style.top = (my - 20) + 'px';
    this._label.classList.remove('hidden');
  },

  /** Hide the distance label */
  hideLabel() {
    this._label.classList.add('hidden');
  },

  /** Calculate total driving line length in feet */
  totalLength(waypoints) {
    if (App.mode === 'image' && !ImageMap.hasScale()) return -1;

    let total = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const a = waypoints[i - 1].lngLat;
      const b = waypoints[i].lngLat;
      if (App.mode === 'image') {
        total += this._pixelDistFeet(a, b);
      } else {
        total += this._haversine(a[1], a[0], b[1], b[0]) * 3.28084;
      }
    }
    return total;
  },

  /** Distance in feet between two image-pixel coords using calibrated scale */
  _pixelDistFeet(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const pixels = Math.sqrt(dx * dx + dy * dy);
    return pixels * ImageMap.getScale();
  },

  /**
   * Haversine formula — distance in meters between two lat/lng points
   */
  _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const toRad = deg => deg * Math.PI / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },
};
