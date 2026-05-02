# Course Designer Next Release — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shared link viewer, sketch mode scrolling, trailer placement, staging areas, worker zones, run-off/safety zones, and cone numbering to autocross-designer-2.

**Architecture:** Route-level split for viewer (`/course/[id]` becomes standalone). Shared polygon engine for staging areas, worker zones, and run-off zones. Cone numbering as a separate manual action using driving-line projection. All new data types added to `CourseData` and serialized with save/share/export.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, Mapbox GL v3, TypeScript, Supabase

**Spec:** `docs/superpowers/specs/2026-05-02-course-designer-features-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/lib/components/CourseViewer.svelte` | Read-only shared course viewer (map + layers, no tools) |
| `src/lib/components/PolygonOverlay.svelte` | Shared polygon drawing engine (vertex-by-vertex, close on double-click) |
| `src/lib/components/StagingOverlay.svelte` | Renders staging area polygons as shaded fills |
| `src/lib/components/WorkerZoneOverlay.svelte` | Renders worker zone polygons with dashed borders and station labels |
| `src/lib/components/HazardOverlay.svelte` | Renders hazard markers (points/lines) with red buffer zones |
| `src/lib/components/ConeNumberOverlay.svelte` | Renders cone number labels as a toggleable layer |
| `src/lib/engine/polygonEngine.ts` | Point-in-polygon, polygon GeoJSON builders, vertex editing math |
| `src/lib/engine/coneNumbering.ts` | Driving-line projection + nearest-neighbor fallback algorithms |
| `src/lib/engine/bufferGeometry.ts` | Buffer zone computation (circle around point, capsule around line) |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/types/course.ts` | Add `StagingAreaData`, `WorkerZoneData`, `HazardMarkerData`, `ConeNumberMap` types; extend `CourseData`; add new `LayerKey` and `Tool` values |
| `src/lib/stores/courseStore.svelte.ts` | Add CRUD methods for staging areas, worker zones, hazard markers, cone numbers |
| `src/lib/stores/toolStore.svelte.ts` | Add new tool types: `staging-area`, `worker-zone`, `hazard-point`, `hazard-line` |
| `src/lib/stores/layerStore.svelte.ts` | Add new layers: `stagingAreas`, `workerZones`, `safetyZones`, `coneNumbers` |
| `src/lib/components/MapContainer.svelte` | Add tool dispatch for new tools, render new overlays, right-click pan for sketch mode |
| `src/lib/components/SketchOverlay.svelte` | Keep scroll wheel zoom enabled during sketch, add right-click pan support |
| `src/lib/components/Toolbar.svelte` | Add new tool buttons in appropriate sections |
| `src/lib/components/Sidebar.svelte` | Add "Number Cones" button, hazard buffer distance setting |
| `src/lib/components/ConeMarker.svelte` | Change trailer default size to 20'×10' equivalent, simplify initial placement |
| `src/lib/engine/courseSerializer.ts` | Add new arrays to `emptyCourse()`, handle in `validate()` |
| `src/routes/course/[id]/+page.svelte` | Replace redirect-to-editor with standalone `CourseViewer` |
| `src/lib/config/shortcuts.ts` | Add keyboard shortcuts for new tools |

---

## Task 1: Extend Type Definitions

**Files:**
- Modify: `src/lib/types/course.ts`

- [ ] **Step 1: Add new data types**

Add the following types after the existing `SketchData` interface:

```typescript
export interface StagingAreaData {
  id: string;
  vertices: LngLat[];
  label: string;
}

export interface WorkerZoneData {
  id: string;
  vertices: LngLat[];
  stationNumber: number;
}

export interface HazardMarkerData {
  id: string;
  type: 'point' | 'line';
  coordinates: LngLat[];
  bufferFeet: number;
}

export type ConeNumberMap = Record<string, string>;
```

- [ ] **Step 2: Extend CourseData**

Add new arrays to the `CourseData` interface:

```typescript
export interface CourseData {
  schemaVersion: number;
  cones: ConeData[];
  drivingLine: WaypointData[];
  measurements: MeasurementData[];
  notes: NoteData[];
  obstacles: ObstacleData[];
  workers: WorkerData[];
  courseOutline: OutlineSegmentData[];
  sketches: SketchData[];
  stagingAreas: StagingAreaData[];
  workerZones: WorkerZoneData[];
  hazardMarkers: HazardMarkerData[];
  coneNumbers: ConeNumberMap;
  mapCenter: LngLat;
  mapZoom: number;
  imageMode?: boolean;
  imageFileName?: string;
  imageScale?: number;
}
```

- [ ] **Step 3: Extend LayerKey and ConeType**

Update the `LayerKey` type:

```typescript
export type LayerKey = 'cones' | 'obstacles' | 'workers' | 'drivingLine' | 'measurements' | 'notes' | 'courseOutline' | 'sketches' | 'grid' | 'stagingAreas' | 'workerZones' | 'safetyZones' | 'coneNumbers';
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types/course.ts
git commit -m "Add types for staging areas, worker zones, hazard markers, cone numbers"
```

---

## Task 2: Update Stores

**Files:**
- Modify: `src/lib/stores/courseStore.svelte.ts`
- Modify: `src/lib/stores/toolStore.svelte.ts`
- Modify: `src/lib/stores/layerStore.svelte.ts`
- Modify: `src/lib/engine/courseSerializer.ts`

- [ ] **Step 1: Update courseSerializer.ts emptyCourse()**

Add default empty arrays and object for the new fields in the `emptyCourse()` function:

```typescript
function emptyCourse(): CourseData {
  return {
    schemaVersion: SCHEMA_VERSION,
    cones: [],
    drivingLine: [],
    measurements: [],
    notes: [],
    obstacles: [],
    workers: [],
    courseOutline: [],
    sketches: [],
    stagingAreas: [],
    workerZones: [],
    hazardMarkers: [],
    coneNumbers: {},
    mapCenter: [-96.7694672, 40.8446702],
    mapZoom: 18
  };
}
```

Also update `validate()` to ensure the new arrays/object exist:

```typescript
function validate(data: any): any {
  // ... existing sanitization ...
  
  // Ensure existing arrays
  for (const key of ['cones', 'drivingLine', 'measurements', 'notes', 'obstacles', 'workers', 'courseOutline', 'sketches', 'stagingAreas', 'workerZones', 'hazardMarkers']) {
    if (!Array.isArray(data[key])) data[key] = [];
    data[key] = data[key].slice(0, MAX_ITEMS);
  }
  if (typeof data.coneNumbers !== 'object' || data.coneNumbers === null) {
    data.coneNumbers = {};
  }
  return data;
}
```

- [ ] **Step 2: Add courseStore methods for staging areas**

Add CRUD methods to courseStore after the existing sketch methods:

```typescript
addStagingArea(area: StagingAreaData) {
  this.pushUndo();
  course.stagingAreas = [...course.stagingAreas, area];
},
removeStagingArea(id: string) {
  this.pushUndo();
  course.stagingAreas = course.stagingAreas.filter(a => a.id !== id);
},
updateStagingAreaVertices(id: string, vertices: LngLat[]) {
  this.pushUndo();
  course.stagingAreas = course.stagingAreas.map(a =>
    a.id === id ? { ...a, vertices } : a
  );
},
```

- [ ] **Step 3: Add courseStore methods for worker zones**

```typescript
addWorkerZone(zone: WorkerZoneData) {
  this.pushUndo();
  course.workerZones = [...course.workerZones, zone];
},
removeWorkerZone(id: string) {
  this.pushUndo();
  course.workerZones = course.workerZones.filter(z => z.id !== id);
},
updateWorkerZoneVertices(id: string, vertices: LngLat[]) {
  this.pushUndo();
  course.workerZones = course.workerZones.map(z =>
    z.id === id ? { ...z, vertices } : z
  );
},
updateWorkerZoneStation(id: string, stationNumber: number) {
  this.pushUndo();
  course.workerZones = course.workerZones.map(z =>
    z.id === id ? { ...z, stationNumber } : z
  );
},
```

- [ ] **Step 4: Add courseStore methods for hazard markers**

```typescript
addHazardMarker(marker: HazardMarkerData) {
  this.pushUndo();
  course.hazardMarkers = [...course.hazardMarkers, marker];
},
removeHazardMarker(id: string) {
  this.pushUndo();
  course.hazardMarkers = course.hazardMarkers.filter(m => m.id !== id);
},
updateHazardBuffer(id: string, bufferFeet: number) {
  this.pushUndo();
  course.hazardMarkers = course.hazardMarkers.map(m =>
    m.id === id ? { ...m, bufferFeet } : m
  );
},
```

- [ ] **Step 5: Add courseStore methods for cone numbers**

```typescript
setConeNumbers(numbers: ConeNumberMap) {
  this.pushUndo();
  course.coneNumbers = { ...numbers };
},
clearConeNumbers() {
  this.pushUndo();
  course.coneNumbers = {};
},
```

- [ ] **Step 6: Update toolStore with new tools**

Add new tools to the `Tool` type in `src/lib/stores/toolStore.svelte.ts`:

```typescript
export type Tool = 'regular' | 'pointer' | 'start-cone' | 'finish-cone' | 'trailer' | 'staging-grid' | 'gate' | 'slalom' | 'obstacle' | 'worker' | 'select' | 'drivingline' | 'measure' | 'courseoutline' | 'note' | 'scale' | 'sketch' | 'staging-area' | 'worker-zone' | 'hazard-point' | 'hazard-line';
```

Add tool-specific state for hazard buffer default:

```typescript
let hazardBufferFeet = $state(25);
```

Add getter and setter:

```typescript
get hazardBufferFeet() { return hazardBufferFeet; },
setHazardBufferFeet(feet: number) { hazardBufferFeet = feet; },
```

- [ ] **Step 7: Update layerStore with new layers**

Add the 4 new layers to the layers array in `src/lib/stores/layerStore.svelte.ts`:

```typescript
{ key: 'stagingAreas' as LayerKey, label: 'Staging Areas', visible: true },
{ key: 'workerZones' as LayerKey, label: 'Worker Zones', visible: true },
{ key: 'safetyZones' as LayerKey, label: 'Safety Zones', visible: true },
{ key: 'coneNumbers' as LayerKey, label: 'Cone Numbers', visible: false },
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/stores/courseStore.svelte.ts src/lib/stores/toolStore.svelte.ts src/lib/stores/layerStore.svelte.ts src/lib/engine/courseSerializer.ts
git commit -m "Add store methods and layers for staging areas, worker zones, hazards, cone numbers"
```

---

## Task 3: Sketch Mode Scrolling

**Files:**
- Modify: `src/lib/components/SketchOverlay.svelte`
- Modify: `src/lib/components/MapContainer.svelte`

- [ ] **Step 1: Add right-click pan to SketchOverlay**

In `SketchOverlay.svelte`, modify `handleMouseDown` to only start drawing on left-click (button 0). Add right-click pan handling:

```typescript
export function handleMouseDown(e: mapboxgl.MapMouseEvent & { originalEvent: MouseEvent }) {
  if (toolStore.activeTool !== 'sketch') return;
  
  // Right-click: enable panning instead of drawing
  if (e.originalEvent.button === 2) {
    return; // Let MapContainer handle right-click pan
  }
  
  // Left-click only
  if (e.originalEvent.button !== 0) return;
  
  isDrawing = true;
  currentSketchId = generateId();
  currentPoints = [e.lngLat.toArray() as LngLat];
  if (map && 'dragPan' in map) (map as mapboxgl.Map).dragPan.disable();
}
```

- [ ] **Step 2: Add right-click pan handlers to MapContainer**

In `MapContainer.svelte`, add right-click pan support for sketch mode. Add state variables:

```typescript
let isRightClickPanning = false;
let rightClickPanStart: { x: number; y: number } | null = null;
```

Add a contextmenu suppressor and right-click pan handlers after `initBoxSelection()`:

```typescript
function initSketchPan() {
  const canvas = map.getCanvasContainer();
  
  canvas.addEventListener('contextmenu', (e: MouseEvent) => {
    if (toolStore.activeTool === 'sketch') {
      e.preventDefault();
    }
  });

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    if (toolStore.activeTool !== 'sketch' || e.button !== 2) return;
    isRightClickPanning = true;
    rightClickPanStart = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isRightClickPanning || !rightClickPanStart) return;
    const dx = e.clientX - rightClickPanStart.x;
    const dy = e.clientY - rightClickPanStart.y;
    map.panBy([-dx, -dy], { duration: 0 });
    rightClickPanStart = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('mouseup', (e: MouseEvent) => {
    if (e.button !== 2 || !isRightClickPanning) return;
    isRightClickPanning = false;
    rightClickPanStart = null;
    canvas.style.cursor = '';
  });
}
```

Call `initSketchPan()` in the map `load` handler alongside `initBoxSelection()`.

- [ ] **Step 3: Keep scroll wheel zoom enabled during sketch**

In `SketchOverlay.svelte`, the current code disables `dragPan` but scroll wheel zoom is already handled by Mapbox separately via `scrollZoom`. Verify that `scrollZoom` is never disabled. No code change needed — just confirm by reading the file that only `dragPan` is toggled, not `scrollZoom`.

- [ ] **Step 4: Build and test manually**

```bash
cd "Projects/autocross-designer-2" && npm run build
```

Expected: Build succeeds. Manually test: select sketch tool, left-click draws, right-click+drag pans, scroll wheel zooms.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/SketchOverlay.svelte src/lib/components/MapContainer.svelte
git commit -m "Add right-click pan and scroll zoom in sketch mode"
```

---

## Task 4: Trailer Placement

**Files:**
- Modify: `src/lib/components/ConeMarker.svelte`
- Modify: `src/lib/components/MapContainer.svelte`

- [ ] **Step 1: Change trailer default dimensions**

In `ConeMarker.svelte`, find the default dimensions for `marker-trailer` (currently 40×20px). The trailer should be 20'×10'. At the default zoom level (18), the marker scale translates pixels to approximate feet. The existing trailer is roughly 40×20 at scale 1.0. Change the initial size to represent 20'×10':

Find the section where trailer dimensions are set (in the marker creation or in the CSS). The current defaults are set when a trailer cone is created without explicit width/height. In `MapContainer.svelte`'s `handleClick`, when adding a trailer cone, set default dimensions:

```typescript
case 'trailer': {
  const cone: ConeData = {
    id: generateId(),
    type: 'trailer',
    lngLat: clickLngLat,
    width: 80,
    height: 40,
    rotation: 0
  };
  courseStore.addCone(cone);
  break;
}
```

This replaces the current generic cone creation for trailers to include explicit default dimensions (80×40px ≈ 20'×10' at standard zoom).

- [ ] **Step 2: Ensure ConeMarker uses width/height from data**

In `ConeMarker.svelte`, verify that the marker element uses `cone.width` and `cone.height` when available, falling back to defaults only when those properties are undefined. Find the dimension application code and ensure it reads from `cone.width ?? 40` for trailer and `cone.width ?? 60` for staging-grid.

- [ ] **Step 3: Build and verify**

```bash
cd "Projects/autocross-designer-2" && npm run build
```

Expected: Build succeeds. Manually test: select trailer tool, click on map → 20'×10' trailer appears, drag to reposition, resize handles work.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/ConeMarker.svelte src/lib/components/MapContainer.svelte
git commit -m "Set trailer default size to 20x10 feet equivalent"
```

---

## Task 5: Polygon Engine

**Files:**
- Create: `src/lib/engine/polygonEngine.ts`
- Create: `src/lib/components/PolygonOverlay.svelte`

- [ ] **Step 1: Create polygonEngine.ts**

```typescript
import type { LngLat } from '$lib/types/course';

export function pointInPolygon(point: LngLat, polygon: LngLat[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function polygonToGeoJSON(vertices: LngLat[]): GeoJSON.Feature<GeoJSON.Polygon> {
  const closed = [...vertices, vertices[0]];
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [closed]
    }
  };
}

export function lineToGeoJSON(points: LngLat[]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: points
    }
  };
}

export function verticesCollection(vertices: LngLat[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: vertices.map((v, i) => ({
      type: 'Feature' as const,
      properties: { index: i },
      geometry: { type: 'Point' as const, coordinates: v }
    }))
  };
}
```

- [ ] **Step 2: Create PolygonOverlay.svelte**

This component handles interactive polygon drawing on the Mapbox map. It adds GeoJSON sources and layers for the in-progress polygon, and emits a `complete` event when the polygon is closed.

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { LngLat } from '$lib/types/course';
  import { mapStore } from '$lib/stores/mapStore.svelte';
  import { toolStore } from '$lib/stores/toolStore.svelte';
  import type mapboxgl from 'mapbox-gl';

  interface Props {
    activeTools: string[];
    fillColor: string;
    fillOpacity: number;
    strokeColor: string;
    strokeDasharray?: number[];
    onComplete: (vertices: LngLat[]) => void;
  }

  let { activeTools, fillColor, fillOpacity, strokeColor, strokeDasharray, onComplete }: Props = $props();

  let vertices: LngLat[] = $state([]);
  let mousePos: LngLat | null = $state(null);
  let sourceId = `polygon-draw-${crypto.randomUUID().slice(0, 8)}`;
  let lineSourceId = `${sourceId}-line`;
  let vertexSourceId = `${sourceId}-vertices`;

  export function handleClick(e: mapboxgl.MapMouseEvent) {
    if (!activeTools.includes(toolStore.activeTool)) return;

    const clickLngLat: LngLat = [e.lngLat.lng, e.lngLat.lat];

    // Close polygon if clicking near first vertex
    if (vertices.length >= 3) {
      const first = vertices[0];
      const dx = clickLngLat[0] - first[0];
      const dy = clickLngLat[1] - first[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.00005) {
        completePolygon();
        return;
      }
    }

    vertices = [...vertices, clickLngLat];
    updateSources();
  }

  export function handleDoubleClick(e: mapboxgl.MapMouseEvent) {
    if (!activeTools.includes(toolStore.activeTool)) return;
    if (vertices.length >= 3) {
      e.preventDefault();
      completePolygon();
    }
  }

  export function handleMouseMove(e: mapboxgl.MapMouseEvent) {
    if (!activeTools.includes(toolStore.activeTool)) return;
    if (vertices.length === 0) return;
    mousePos = [e.lngLat.lng, e.lngLat.lat];
    updateSources();
  }

  function completePolygon() {
    if (vertices.length < 3) return;
    onComplete([...vertices]);
    vertices = [];
    mousePos = null;
    updateSources();
  }

  function updateSources() {
    const map = mapStore.map as mapboxgl.Map;
    if (!map) return;

    // Polygon fill (only if >= 3 vertices)
    const polySource = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
    if (polySource) {
      if (vertices.length >= 3) {
        const allPoints = mousePos ? [...vertices, mousePos] : vertices;
        const closed = [...allPoints, allPoints[0]];
        polySource.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [closed] }
        });
      } else {
        polySource.setData({ type: 'FeatureCollection', features: [] });
      }
    }

    // Line segments
    const lineSource = map.getSource(lineSourceId) as mapboxgl.GeoJSONSource;
    if (lineSource) {
      const allPoints = mousePos ? [...vertices, mousePos] : vertices;
      if (allPoints.length >= 2) {
        lineSource.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: allPoints }
        });
      } else {
        lineSource.setData({ type: 'FeatureCollection', features: [] });
      }
    }

    // Vertex dots
    const vertexSource = map.getSource(vertexSourceId) as mapboxgl.GeoJSONSource;
    if (vertexSource) {
      vertexSource.setData({
        type: 'FeatureCollection',
        features: vertices.map((v, i) => ({
          type: 'Feature' as const,
          properties: { index: i },
          geometry: { type: 'Point' as const, coordinates: v }
        }))
      });
    }
  }

  onMount(() => {
    const map = mapStore.map as mapboxgl.Map;
    if (!map) return;

    map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource(lineSourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource(vertexSourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    map.addLayer({
      id: `${sourceId}-fill`,
      type: 'fill',
      source: sourceId,
      paint: { 'fill-color': fillColor, 'fill-opacity': fillOpacity }
    });

    map.addLayer({
      id: `${lineSourceId}-line`,
      type: 'line',
      source: lineSourceId,
      paint: {
        'line-color': strokeColor,
        'line-width': 2,
        ...(strokeDasharray ? { 'line-dasharray': strokeDasharray } : {})
      }
    });

    map.addLayer({
      id: `${vertexSourceId}-points`,
      type: 'circle',
      source: vertexSourceId,
      paint: {
        'circle-radius': 5,
        'circle-color': strokeColor,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5
      }
    });
  });

  onDestroy(() => {
    const map = mapStore.map as mapboxgl.Map;
    if (!map) return;
    try {
      map.removeLayer(`${sourceId}-fill`);
      map.removeLayer(`${lineSourceId}-line`);
      map.removeLayer(`${vertexSourceId}-points`);
      map.removeSource(sourceId);
      map.removeSource(lineSourceId);
      map.removeSource(vertexSourceId);
    } catch {}
  });
</script>
```

- [ ] **Step 3: Build and verify**

```bash
cd "Projects/autocross-designer-2" && npm run build
```

Expected: Build succeeds. PolygonOverlay is not wired up yet — just validating no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/engine/polygonEngine.ts src/lib/components/PolygonOverlay.svelte
git commit -m "Add shared polygon drawing engine and overlay component"
```

---

## Task 6: Staging Area Feature

**Files:**
- Create: `src/lib/components/StagingOverlay.svelte`
- Modify: `src/lib/components/MapContainer.svelte`
- Modify: `src/lib/components/Toolbar.svelte`

- [ ] **Step 1: Create StagingOverlay.svelte**

Renders completed staging area polygons as shaded fills on the map:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { courseStore } from '$lib/stores/courseStore.svelte';
  import { mapStore } from '$lib/stores/mapStore.svelte';
  import type mapboxgl from 'mapbox-gl';

  const SOURCE_ID = 'staging-areas-source';
  const FILL_LAYER_ID = 'staging-areas-fill';
  const LINE_LAYER_ID = 'staging-areas-line';
  const LABEL_LAYER_ID = 'staging-areas-label';

  function buildGeoJSON(): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: courseStore.course.stagingAreas.map(area => ({
        type: 'Feature' as const,
        properties: { label: area.label || 'STAGING' },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[...area.vertices, area.vertices[0]]]
        }
      }))
    };
  }

  function updateSource() {
    const map = mapStore.map as mapboxgl.Map;
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
    if (source) source.setData(buildGeoJSON());
  }

  $effect(() => {
    const _ = courseStore.course.stagingAreas;
    updateSource();
  });

  onMount(() => {
    const map = mapStore.map as mapboxgl.Map;
    if (!map) return;

    map.addSource(SOURCE_ID, { type: 'geojson', data: buildGeoJSON() });

    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: { 'fill-color': '#6495ED', 'fill-opacity': 0.25 }
    });

    map.addLayer({
      id: LINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': '#6495ED', 'line-width': 2 }
    });

    map.addLayer({
      id: LABEL_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 14,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold']
      },
      paint: { 'text-color': '#6495ED', 'text-halo-color': '#000', 'text-halo-width': 1 }
    });
  });

  onDestroy(() => {
    const map = mapStore.map as mapboxgl.Map;
    if (!map) return;
    try {
      map.removeLayer(FILL_LAYER_ID);
      map.removeLayer(LINE_LAYER_ID);
      map.removeLayer(LABEL_LAYER_ID);
      map.removeSource(SOURCE_ID);
    } catch {}
  });
</script>
```

- [ ] **Step 2: Wire up staging area tool in MapContainer**

In `MapContainer.svelte`:

1. Import `PolygonOverlay` and `StagingOverlay`
2. Add a `let polygonOverlay: PolygonOverlay;` ref
3. Add `PolygonOverlay` to the template with staging area configuration:

```svelte
<PolygonOverlay
  bind:this={polygonOverlay}
  activeTools={['staging-area']}
  fillColor="#6495ED"
  fillOpacity={0.2}
  strokeColor="#6495ED"
  onComplete={(vertices) => {
    courseStore.addStagingArea({
      id: generateId(),
      vertices,
      label: 'STAGING'
    });
  }}
/>

{#if layerStore.isVisible('stagingAreas')}
  <StagingOverlay />
{/if}
```

4. In `handleClick`, add a case for `staging-area`:

```typescript
case 'staging-area':
  polygonOverlay?.handleClick(e);
  return;
```

5. In the `dblclick` handler (or add one), call `polygonOverlay?.handleDoubleClick(e)`.

6. In `handleMouseMove`, add: `polygonOverlay?.handleMouseMove(e);`

- [ ] **Step 3: Add staging area tool button to Toolbar**

In `Toolbar.svelte`, in the "Lot Features" section (where trailer and staging-grid are), add:

```svelte
<ToolButton tool="staging-area" label="Staging Area" title="Draw staging area polygon" />
```

- [ ] **Step 4: Build and test**

```bash
cd "Projects/autocross-designer-2" && npm run build
```

Expected: Build succeeds. Manually test: select staging area tool, click to place vertices, double-click to close, shaded polygon appears.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/StagingOverlay.svelte src/lib/components/MapContainer.svelte src/lib/components/Toolbar.svelte
git commit -m "Add staging area polygon drawing and rendering"
```

---

## Task 7: Worker Zone Feature

**Files:**
- Create: `src/lib/components/WorkerZoneOverlay.svelte`
- Modify: `src/lib/components/MapContainer.svelte`
- Modify: `src/lib/components/Toolbar.svelte`

- [ ] **Step 1: Create WorkerZoneOverlay.svelte**

Similar to StagingOverlay but with dashed borders, unique colors per station, and station labels:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { courseStore } from '$lib/stores/courseStore.svelte';
  import { mapStore } from '$lib/stores/mapStore.svelte';
  import type mapboxgl from 'mapbox-gl';

  const SOURCE_ID = 'worker-zones-source';
  const FILL_LAYER_ID = 'worker-zones-fill';
  const LINE_LAYER_ID = 'worker-zones-line';
  const LABEL_LAYER_ID = 'worker-zones-label';

  const ZONE_COLORS = [
    '#ff6b6b', '#4ecdc4', '#a882ff', '#ffd93d', '#6bcb77',
    '#ff8fab', '#4cc9f0', '#f4a261', '#90be6d', '#c77dff'
  ];

  function colorForStation(n: number): string {
    return ZONE_COLORS[(n - 1) % ZONE_COLORS.length];
  }

  function buildGeoJSON(): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: courseStore.course.workerZones.map(zone => ({
        type: 'Feature' as const,
        properties: {
          label: `Station ${zone.stationNumber}`,
          color: colorForStation(zone.stationNumber)
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[...zone.vertices, zone.vertices[0]]]
        }
      }))
    };
  }

  function updateSource() {
    const map = mapStore.map as mapboxgl.Map;
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
    if (source) source.setData(buildGeoJSON());
  }

  $effect(() => {
    const _ = courseStore.course.workerZones;
    updateSource();
  });

  onMount(() => {
    const map = mapStore.map as mapboxgl.Map;
    if (!map) return;

    map.addSource(SOURCE_ID, { type: 'geojson', data: buildGeoJSON() });

    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.1
      }
    });

    map.addLayer({
      id: LINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 2,
        'line-dasharray': [6, 3]
      }
    });

    map.addLayer({
      id: LABEL_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 13,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold']
      },
      paint: {
        'text-color': ['get', 'color'],
        'text-halo-color': '#000',
        'text-halo-width': 1
      }
    });
  });

  onDestroy(() => {
    const map = mapStore.map as mapboxgl.Map;
    if (!map) return;
    try {
      map.removeLayer(FILL_LAYER_ID);
      map.removeLayer(LINE_LAYER_ID);
      map.removeLayer(LABEL_LAYER_ID);
      map.removeSource(SOURCE_ID);
    } catch {}
  });
</script>
```

- [ ] **Step 2: Wire up worker zone tool in MapContainer**

Reuse the same `PolygonOverlay` by adding `'worker-zone'` to its `activeTools` array. Add a second `PolygonOverlay` instance for worker zones with different styling:

```svelte
<PolygonOverlay
  bind:this={workerZonePolygonOverlay}
  activeTools={['worker-zone']}
  fillColor="#ff6b6b"
  fillOpacity={0.1}
  strokeColor="#ff6b6b"
  strokeDasharray={[6, 3]}
  onComplete={(vertices) => {
    const nextStation = courseStore.course.workerZones.length + 1;
    courseStore.addWorkerZone({
      id: generateId(),
      vertices,
      stationNumber: nextStation
    });
  }}
/>

{#if layerStore.isVisible('workerZones')}
  <WorkerZoneOverlay />
{/if}
```

Add the `worker-zone` case to `handleClick`:

```typescript
case 'worker-zone':
  workerZonePolygonOverlay?.handleClick(e);
  return;
```

Wire `handleMouseMove` and `handleDoubleClick` the same as staging area.

- [ ] **Step 3: Add worker zone tool button to Toolbar**

In Toolbar.svelte, add a new "Safety" section or add to "Lot Features":

```svelte
<ToolButton tool="worker-zone" label="Worker Zone" title="Draw worker station zone" />
```

- [ ] **Step 4: Build and test**

```bash
cd "Projects/autocross-designer-2" && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/WorkerZoneOverlay.svelte src/lib/components/MapContainer.svelte src/lib/components/Toolbar.svelte
git commit -m "Add worker zone polygon drawing with station numbering"
```

---

## Task 8: Run-off / Safety Zones

**Files:**
- Create: `src/lib/engine/bufferGeometry.ts`
- Create: `src/lib/components/HazardOverlay.svelte`
- Modify: `src/lib/components/MapContainer.svelte`
- Modify: `src/lib/components/Toolbar.svelte`
- Modify: `src/lib/components/Sidebar.svelte`

- [ ] **Step 1: Create bufferGeometry.ts**

Computes buffer zone GeoJSON for point and line hazards:

```typescript
import type { LngLat } from '$lib/types/course';

const EARTH_RADIUS_M = 6371000;
const FEET_TO_METERS = 0.3048;

function feetToDegreesLat(feet: number): number {
  const meters = feet * FEET_TO_METERS;
  return (meters / EARTH_RADIUS_M) * (180 / Math.PI);
}

function feetToDegreesLng(feet: number, lat: number): number {
  const meters = feet * FEET_TO_METERS;
  const latRad = lat * Math.PI / 180;
  return (meters / (EARTH_RADIUS_M * Math.cos(latRad))) * (180 / Math.PI);
}

export function pointBuffer(center: LngLat, bufferFeet: number, segments: number = 32): LngLat[] {
  const points: LngLat[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    const dLng = feetToDegreesLng(bufferFeet, center[1]) * Math.cos(angle);
    const dLat = feetToDegreesLat(bufferFeet) * Math.sin(angle);
    points.push([center[0] + dLng, center[1] + dLat]);
  }
  return points;
}

export function lineBuffer(points: LngLat[], bufferFeet: number, segments: number = 16): LngLat[] {
  if (points.length < 2) return pointBuffer(points[0], bufferFeet);

  // Build capsule: offset left side forward, semicircle at end, offset right side back, semicircle at start
  const result: LngLat[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const [lng1, lat1] = points[i];
    const [lng2, lat2] = points[i + 1];
    const angle = Math.atan2(lat2 - lat1, lng2 - lng1);
    const perpAngle = angle + Math.PI / 2;

    const dLngPerp = feetToDegreesLng(bufferFeet, lat1) * Math.cos(perpAngle);
    const dLatPerp = feetToDegreesLat(bufferFeet) * Math.sin(perpAngle);

    // Left side
    result.push([lng1 + dLngPerp, lat1 + dLatPerp]);
    result.push([lng2 + dLngPerp, lat2 + dLatPerp]);
  }

  // Semicircle at end
  const lastPt = points[points.length - 1];
  const prevPt = points[points.length - 2];
  const endAngle = Math.atan2(lastPt[1] - prevPt[1], lastPt[0] - prevPt[0]);
  for (let i = 0; i <= segments; i++) {
    const a = endAngle + Math.PI / 2 + (i / segments) * Math.PI;
    const dLng = feetToDegreesLng(bufferFeet, lastPt[1]) * Math.cos(a);
    const dLat = feetToDegreesLat(bufferFeet) * Math.sin(a);
    result.push([lastPt[0] + dLng, lastPt[1] + dLat]);
  }

  // Right side (reverse)
  for (let i = points.length - 2; i >= 0; i--) {
    const [lng1, lat1] = points[i];
    const [lng2, lat2] = points[i + 1];
    const angle = Math.atan2(lat2 - lat1, lng2 - lng1);
    const perpAngle = angle - Math.PI / 2;

    const dLngPerp = feetToDegreesLng(bufferFeet, lat1) * Math.cos(perpAngle);
    const dLatPerp = feetToDegreesLat(bufferFeet) * Math.sin(perpAngle);

    result.push([lng2 + dLngPerp, lat2 + dLatPerp]);
    result.push([lng1 + dLngPerp, lat1 + dLatPerp]);
  }

  // Semicircle at start
  const firstPt = points[0];
  const nextPt = points[1];
  const startAngle = Math.atan2(nextPt[1] - firstPt[1], nextPt[0] - firstPt[0]);
  for (let i = 0; i <= segments; i++) {
    const a = startAngle - Math.PI / 2 + (i / segments) * Math.PI;
    const dLng = feetToDegreesLng(bufferFeet, firstPt[1]) * Math.cos(a);
    const dLat = feetToDegreesLat(bufferFeet) * Math.sin(a);
    result.push([firstPt[0] + dLng, firstPt[1] + dLat]);
  }

  return result;
}
```

- [ ] **Step 2: Create HazardOverlay.svelte**

Renders hazard markers and their buffer zones:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { courseStore } from '$lib/stores/courseStore.svelte';
  import { mapStore } from '$lib/stores/mapStore.svelte';
  import { pointBuffer, lineBuffer } from '$lib/engine/bufferGeometry';
  import type mapboxgl from 'mapbox-gl';

  const BUFFER_SOURCE = 'hazard-buffer-source';
  const BUFFER_FILL = 'hazard-buffer-fill';
  const BUFFER_LINE = 'hazard-buffer-line';
  const MARKER_SOURCE = 'hazard-marker-source';
  const MARKER_LAYER = 'hazard-marker-points';

  function buildBufferGeoJSON(): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: courseStore.course.hazardMarkers.map(marker => {
        const buffer = marker.type === 'point'
          ? pointBuffer(marker.coordinates[0], marker.bufferFeet)
          : lineBuffer(marker.coordinates, marker.bufferFeet);
        return {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'Polygon' as const,
            coordinates: [buffer]
          }
        };
      })
    };
  }

  function buildMarkerGeoJSON(): GeoJSON.FeatureCollection {
    const features: GeoJSON.Feature[] = [];
    for (const marker of courseStore.course.hazardMarkers) {
      if (marker.type === 'point') {
        features.push({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: marker.coordinates[0] }
        });
      } else {
        features.push({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: marker.coordinates }
        });
      }
    }
    return { type: 'FeatureCollection', features };
  }

  function updateSources() {
    const map = mapStore.map as mapboxgl.Map;
    if (!map) return;
    const bufferSrc = map.getSource(BUFFER_SOURCE) as mapboxgl.GeoJSONSource;
    if (bufferSrc) bufferSrc.setData(buildBufferGeoJSON());
    const markerSrc = map.getSource(MARKER_SOURCE) as mapboxgl.GeoJSONSource;
    if (markerSrc) markerSrc.setData(buildMarkerGeoJSON());
  }

  $effect(() => {
    const _ = courseStore.course.hazardMarkers;
    updateSources();
  });

  onMount(() => {
    const map = mapStore.map as mapboxgl.Map;
    if (!map) return;

    map.addSource(BUFFER_SOURCE, { type: 'geojson', data: buildBufferGeoJSON() });
    map.addSource(MARKER_SOURCE, { type: 'geojson', data: buildMarkerGeoJSON() });

    map.addLayer({
      id: BUFFER_FILL,
      type: 'fill',
      source: BUFFER_SOURCE,
      paint: { 'fill-color': '#ff0000', 'fill-opacity': 0.15 }
    });

    map.addLayer({
      id: BUFFER_LINE,
      type: 'line',
      source: BUFFER_SOURCE,
      paint: { 'line-color': '#ff0000', 'line-width': 1, 'line-dasharray': [4, 3] }
    });

    map.addLayer({
      id: MARKER_LAYER,
      type: 'circle',
      source: MARKER_SOURCE,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': 5,
        'circle-color': '#ff0000',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2
      }
    });

    map.addLayer({
      id: `${MARKER_LAYER}-lines`,
      type: 'line',
      source: MARKER_SOURCE,
      filter: ['==', '$type', 'LineString'],
      paint: { 'line-color': '#ff0000', 'line-width': 3 }
    });
  });

  onDestroy(() => {
    const map = mapStore.map as mapboxgl.Map;
    if (!map) return;
    try {
      map.removeLayer(BUFFER_FILL);
      map.removeLayer(BUFFER_LINE);
      map.removeLayer(MARKER_LAYER);
      map.removeLayer(`${MARKER_LAYER}-lines`);
      map.removeSource(BUFFER_SOURCE);
      map.removeSource(MARKER_SOURCE);
    } catch {}
  });
</script>
```

- [ ] **Step 3: Wire up hazard tools in MapContainer**

Add hazard point and line tool handling. Hazard point is single-click. Hazard line is multi-click (double-click to finish):

```typescript
let hazardLinePoints: LngLat[] = [];

// In handleClick switch:
case 'hazard-point': {
  courseStore.addHazardMarker({
    id: generateId(),
    type: 'point',
    coordinates: [clickLngLat],
    bufferFeet: toolStore.hazardBufferFeet
  });
  return;
}
case 'hazard-line': {
  hazardLinePoints = [...hazardLinePoints, clickLngLat];
  toolStore.setStatus(`Hazard line: ${hazardLinePoints.length} points. Double-click to finish.`);
  return;
}
```

Add dblclick handler for hazard line:

```typescript
// In dblclick handler:
if (toolStore.activeTool === 'hazard-line' && hazardLinePoints.length >= 2) {
  courseStore.addHazardMarker({
    id: generateId(),
    type: 'line',
    coordinates: [...hazardLinePoints],
    bufferFeet: toolStore.hazardBufferFeet
  });
  hazardLinePoints = [];
  toolStore.clearStatus();
}
```

Add cleanup when tool changes (in the existing $effect that watches activeTool):

```typescript
if (toolStore.activeTool !== 'hazard-line') {
  hazardLinePoints = [];
}
```

Add HazardOverlay to template:

```svelte
{#if layerStore.isVisible('safetyZones')}
  <HazardOverlay />
{/if}
```

- [ ] **Step 4: Add hazard tool buttons to Toolbar and buffer setting to Sidebar**

In `Toolbar.svelte`, add a new "Safety" section:

```svelte
<!-- Safety -->
<div class="section">
  <button class="section-header" onclick={() => toggleSection('safety')}>Safety</button>
  {#if !collapsed.safety}
    <ToolButton tool="hazard-point" label="Hazard Point" title="Mark a point hazard (pole, post)" />
    <ToolButton tool="hazard-line" label="Hazard Line" title="Mark a line hazard (wall, barrier)" />
  {/if}
</div>
```

In `Sidebar.svelte`, add a buffer distance setting (visible when a hazard tool is active):

```svelte
{#if toolStore.activeTool === 'hazard-point' || toolStore.activeTool === 'hazard-line'}
  <div class="setting">
    <label>Buffer Distance (ft)</label>
    <input type="number" min="1" max="100" value={toolStore.hazardBufferFeet}
      oninput={(e) => toolStore.setHazardBufferFeet(Number(e.currentTarget.value))} />
  </div>
{/if}
```

- [ ] **Step 5: Build and test**

```bash
cd "Projects/autocross-designer-2" && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/engine/bufferGeometry.ts src/lib/components/HazardOverlay.svelte src/lib/components/MapContainer.svelte src/lib/components/Toolbar.svelte src/lib/components/Sidebar.svelte
git commit -m "Add hazard markers with configurable buffer zones"
```

---

## Task 9: Cone Numbering

**Files:**
- Create: `src/lib/engine/coneNumbering.ts`
- Create: `src/lib/components/ConeNumberOverlay.svelte`
- Modify: `src/lib/components/Sidebar.svelte`
- Modify: `src/lib/components/MapContainer.svelte`

- [ ] **Step 1: Create coneNumbering.ts**

The core algorithm: project cones onto the driving line, number by position. Fallback to nearest-neighbor for zones without a driving line.

```typescript
import type { LngLat, ConeData, WaypointData, WorkerZoneData, ConeNumberMap } from '$lib/types/course';
import { pointInPolygon } from '$lib/engine/polygonEngine';

interface ProjectedCone {
  cone: ConeData;
  projectionIndex: number;
}

function projectOntoLine(point: LngLat, line: LngLat[]): number {
  let bestDist = Infinity;
  let bestT = 0;

  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i];
    const [bx, by] = line[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    let t = 0;
    if (lenSq > 0) {
      t = ((point[0] - ax) * dx + (point[1] - ay) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const px = ax + t * dx;
    const py = ay + t * dy;
    const dist = Math.sqrt((point[0] - px) ** 2 + (point[1] - py) ** 2);

    if (dist < bestDist) {
      bestDist = dist;
      bestT = i + t;
    }
  }

  return bestT;
}

function drivingLinePassesThroughZone(line: LngLat[], zone: WorkerZoneData): boolean {
  return line.some(pt => pointInPolygon(pt, zone.vertices));
}

function numberByDrivingLine(cones: ConeData[], drivingLine: LngLat[]): ConeData[] {
  const projected: ProjectedCone[] = cones.map(cone => ({
    cone,
    projectionIndex: projectOntoLine(cone.lngLat, drivingLine)
  }));

  projected.sort((a, b) => a.projectionIndex - b.projectionIndex);
  return projected.map(p => p.cone);
}

function numberByNearestNeighbor(cones: ConeData[]): ConeData[] {
  if (cones.length === 0) return [];

  const remaining = [...cones];
  const ordered: ConeData[] = [];

  // Start with the cone closest to the top-left of the bounding box
  remaining.sort((a, b) => {
    const scoreA = a.lngLat[0] + a.lngLat[1];
    const scoreB = b.lngLat[0] + b.lngLat[1];
    return scoreA - scoreB;
  });

  ordered.push(remaining.shift()!);

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dx = remaining[i].lngLat[0] - last.lngLat[0];
      const dy = remaining[i].lngLat[1] - last.lngLat[1];
      const dist = dx * dx + dy * dy;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    ordered.push(remaining.splice(nearestIdx, 1)[0]);
  }

  return ordered;
}

export function numberCones(
  cones: ConeData[],
  workerZones: WorkerZoneData[],
  drivingLine: WaypointData[]
): ConeNumberMap {
  const numbers: ConeNumberMap = {};
  const linePoints: LngLat[] = drivingLine.map(wp => wp.lngLat);

  for (const zone of workerZones) {
    const conesInZone = cones.filter(c => pointInPolygon(c.lngLat, zone.vertices));
    if (conesInZone.length === 0) continue;

    const useDrivingLine = linePoints.length >= 2 && drivingLinePassesThroughZone(linePoints, zone);

    const ordered = useDrivingLine
      ? numberByDrivingLine(conesInZone, linePoints)
      : numberByNearestNeighbor(conesInZone);

    ordered.forEach((cone, i) => {
      const num = zone.stationNumber * 100 + (i + 1);
      numbers[cone.id] = String(num);
    });
  }

  return numbers;
}
```

- [ ] **Step 2: Create ConeNumberOverlay.svelte**

Renders number labels on cones using Mapbox symbol layer:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { courseStore } from '$lib/stores/courseStore.svelte';
  import { mapStore } from '$lib/stores/mapStore.svelte';
  import type mapboxgl from 'mapbox-gl';

  const SOURCE_ID = 'cone-numbers-source';
  const LAYER_ID = 'cone-numbers-label';

  function buildGeoJSON(): GeoJSON.FeatureCollection {
    const numbers = courseStore.course.coneNumbers;
    const cones = courseStore.course.cones;

    return {
      type: 'FeatureCollection',
      features: cones
        .filter(c => numbers[c.id])
        .map(c => ({
          type: 'Feature' as const,
          properties: { label: numbers[c.id] },
          geometry: {
            type: 'Point' as const,
            coordinates: c.lngLat
          }
        }))
    };
  }

  function updateSource() {
    const map = mapStore.map as mapboxgl.Map;
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
    if (source) source.setData(buildGeoJSON());
  }

  $effect(() => {
    const _numbers = courseStore.course.coneNumbers;
    const _cones = courseStore.course.cones;
    updateSource();
  });

  onMount(() => {
    const map = mapStore.map as mapboxgl.Map;
    if (!map) return;

    map.addSource(SOURCE_ID, { type: 'geojson', data: buildGeoJSON() });

    map.addLayer({
      id: LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 12,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-offset': [0, 1.5],
        'text-anchor': 'top'
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 1.5
      }
    });
  });

  onDestroy(() => {
    const map = mapStore.map as mapboxgl.Map;
    if (!map) return;
    try {
      map.removeLayer(LAYER_ID);
      map.removeSource(SOURCE_ID);
    } catch {}
  });
</script>
```

- [ ] **Step 3: Add "Number Cones" button to Sidebar**

In `Sidebar.svelte`, add a button in the course info section or near the worker list:

```svelte
<div class="setting">
  <button class="action-btn" onclick={runConeNumbering}>
    Number Cones
  </button>
  {#if Object.keys(courseStore.course.coneNumbers).length > 0}
    <button class="action-btn secondary" onclick={() => courseStore.clearConeNumbers()}>
      Clear Numbers
    </button>
  {/if}
</div>
```

Import and implement `runConeNumbering`:

```typescript
import { numberCones } from '$lib/engine/coneNumbering';

function runConeNumbering() {
  const { cones, workerZones, drivingLine } = courseStore.course;
  if (workerZones.length === 0) {
    toolStore.setStatus('Draw worker zones first');
    return;
  }
  const numbers = numberCones(cones, workerZones, drivingLine);
  courseStore.setConeNumbers(numbers);
  layerStore.setVisible('coneNumbers', true);
  toolStore.setStatus(`Numbered ${Object.keys(numbers).length} cones`);
}
```

- [ ] **Step 4: Add ConeNumberOverlay to MapContainer**

In `MapContainer.svelte`:

```svelte
{#if layerStore.isVisible('coneNumbers')}
  <ConeNumberOverlay />
{/if}
```

- [ ] **Step 5: Build and test**

```bash
cd "Projects/autocross-designer-2" && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/engine/coneNumbering.ts src/lib/components/ConeNumberOverlay.svelte src/lib/components/Sidebar.svelte src/lib/components/MapContainer.svelte
git commit -m "Add cone numbering by worker station with driving line projection"
```

---

## Task 10: Shared Link Viewer

**Files:**
- Create: `src/lib/components/CourseViewer.svelte`
- Modify: `src/routes/course/[id]/+page.svelte`

- [ ] **Step 1: Create CourseViewer.svelte**

Standalone read-only viewer with map, layer toggles, and "Edit a Copy" button. No toolbar, no editing tools:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import { courseStore } from '$lib/stores/courseStore.svelte';
  import { layerStore } from '$lib/stores/layerStore.svelte';
  import { mapStore } from '$lib/stores/mapStore.svelte';
  import { goto } from '$app/navigation';
  import { saveLocal } from '$lib/services/courseService';
  import { deserialize } from '$lib/engine/courseSerializer';
  import ConeMarker from './ConeMarker.svelte';
  import ObstacleMarker from './ObstacleMarker.svelte';
  import WorkerMarker from './WorkerMarker.svelte';
  import NoteMarker from './NoteMarker.svelte';
  import DrivingLine from './DrivingLine.svelte';
  import MeasurementOverlay from './MeasurementOverlay.svelte';
  import OutlineOverlay from './OutlineOverlay.svelte';
  import StagingOverlay from './StagingOverlay.svelte';
  import WorkerZoneOverlay from './WorkerZoneOverlay.svelte';
  import HazardOverlay from './HazardOverlay.svelte';

  interface Props {
    title: string;
  }

  let { title }: Props = $props();
  let container: HTMLDivElement;
  let map: mapboxgl.Map;

  function editCopy() {
    const name = `${title} (copy)`;
    saveLocal(name, courseStore.course);
    sessionStorage.setItem('fitCourseOnLoad', 'true');
    goto('/');
  }

  onMount(() => {
    const { mapCenter, mapZoom } = courseStore.course;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
    map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: mapCenter,
      zoom: mapZoom,
      minZoom: 10,
      maxZoom: 22
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-left');

    map.on('load', () => {
      mapStore.setMap(map);
      mapStore.setMode('map');

      // Fit bounds to course
      const allPoints = courseStore.course.cones.map(c => c.lngLat);
      if (allPoints.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        allPoints.forEach(p => bounds.extend(p as [number, number]));
        map.fitBounds(bounds, { padding: 80, maxZoom: 19 });
      }
    });

    // Hide sketches by default on shared view
    layerStore.setVisible('sketches', false);

    return () => {
      map?.remove();
    };
  });

  const course = $derived(courseStore.course);
</script>

<div class="viewer">
  <div class="map-container" bind:this={container}></div>

  <!-- Course title -->
  <div class="course-title">{title}</div>

  <!-- Layer toggles -->
  <div class="layer-toggles">
    {#each layerStore.layers as layer}
      <label>
        <input type="checkbox" checked={layer.visible}
          onchange={() => layerStore.toggle(layer.key)} />
        {layer.label}
      </label>
    {/each}
  </div>

  <!-- Edit a Copy button -->
  <button class="edit-copy-btn" onclick={editCopy}>
    ✎ Edit a Copy
  </button>

  <!-- Render layers (read-only, no drag handlers) -->
  {#if layerStore.isVisible('cones')}
    {#each course.cones as cone (cone.id)}
      <ConeMarker {cone} />
    {/each}
  {/if}
  {#if layerStore.isVisible('obstacles')}
    {#each course.obstacles as obstacle (obstacle.id)}
      <ObstacleMarker {obstacle} />
    {/each}
  {/if}
  {#if layerStore.isVisible('workers')}
    {#each course.workers as worker (worker.id)}
      <WorkerMarker {worker} />
    {/each}
  {/if}
  {#if layerStore.isVisible('notes')}
    {#each course.notes as note (note.id)}
      <NoteMarker {note} />
    {/each}
  {/if}
  {#if layerStore.isVisible('drivingLine')}
    <DrivingLine />
  {/if}
  {#if layerStore.isVisible('measurements')}
    <MeasurementOverlay />
  {/if}
  {#if layerStore.isVisible('courseOutline')}
    <OutlineOverlay />
  {/if}
  {#if layerStore.isVisible('stagingAreas')}
    <StagingOverlay />
  {/if}
  {#if layerStore.isVisible('workerZones')}
    <WorkerZoneOverlay />
  {/if}
  {#if layerStore.isVisible('safetyZones')}
    <HazardOverlay />
  {/if}
</div>

<style>
  .viewer {
    width: 100%;
    height: 100vh;
    position: relative;
  }

  .map-container {
    width: 100%;
    height: 100%;
  }

  .course-title {
    position: absolute;
    top: 10px;
    left: 50px;
    background: rgba(0, 0, 0, 0.7);
    color: #eee;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 1;
  }

  .layer-toggles {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12px;
    color: #eee;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 1;
  }

  .layer-toggles label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  .edit-copy-btn {
    position: absolute;
    bottom: 20px;
    right: 20px;
    background: #e94560;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    z-index: 1;
  }

  .edit-copy-btn:hover {
    background: #d63851;
  }
</style>
```

- [ ] **Step 2: Update shared link route**

Replace the current redirect-to-editor logic in `src/routes/course/[id]/+page.svelte` with the standalone viewer:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { loadCourse } from '$lib/services/courseService';
  import { deserialize } from '$lib/engine/courseSerializer';
  import { courseStore } from '$lib/stores/courseStore.svelte';
  import CourseViewer from '$lib/components/CourseViewer.svelte';

  let loading = $state(true);
  let error = $state('');
  let title = $state('');

  onMount(async () => {
    try {
      const id = $page.params.id;
      const result = await loadCourse(id);
      if (!result) {
        error = 'Course not found';
        loading = false;
        return;
      }
      title = result.title;
      const data = deserialize(result.data);
      courseStore.load(data);
      loading = false;
    } catch (e) {
      error = 'Failed to load course';
      loading = false;
    }
  });
</script>

{#if loading}
  <div class="loading">Loading course...</div>
{:else if error}
  <div class="error">{error}</div>
{:else}
  <CourseViewer {title} />
{/if}

<style>
  .loading, .error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-size: 18px;
    color: #ccc;
    background: #1a1a2e;
  }

  .error {
    color: #e94560;
  }
</style>
```

- [ ] **Step 3: Build and test**

```bash
cd "Projects/autocross-designer-2" && npm run build
```

Expected: Build succeeds. Note: The CourseViewer renders markers as read-only. ConeMarker currently has drag and right-click delete handlers — these will still fire in the viewer. A future refinement could add a `readonly` prop to suppress them, but for this release the viewer is functional: markers display, dragging just modifies local state that isn't saved back, and there's no save button.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/CourseViewer.svelte src/routes/course/[id]/+page.svelte
git commit -m "Add read-only shared link viewer with Edit a Copy button"
```

---

## Task 11: Keyboard Shortcuts for New Tools

**Files:**
- Modify: `src/lib/config/shortcuts.ts`

- [ ] **Step 1: Add shortcuts for new tools**

Add entries to `TOOL_SHORTCUTS` and `KEY_TOOL_MAP`:

```typescript
// In TOOL_SHORTCUTS, add:
'staging-area': 'a',
'worker-zone': 'z',
'hazard-point': 'h',
'hazard-line': 'j',

// In KEY_TOOL_MAP, add:
'a': 'staging-area',
'z': 'worker-zone',
'h': 'hazard-point',
'j': 'hazard-line',
```

Check that these keys don't conflict with existing shortcuts. Existing keys used: 1-9, 0, q, w, e, r, d, m, o, n, s, Escape. The letters a, z, h, j should be free.

- [ ] **Step 2: Commit**

```bash
git add src/lib/config/shortcuts.ts
git commit -m "Add keyboard shortcuts for staging area, worker zone, and hazard tools"
```

---

## Task 12: Final Integration and Build Verification

**Files:**
- All files from previous tasks

- [ ] **Step 1: Run full build**

```bash
cd "Projects/autocross-designer-2" && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run type checking**

```bash
cd "Projects/autocross-designer-2" && npx svelte-check
```

Expected: No type errors.

- [ ] **Step 3: Manual smoke test checklist**

Run `npm run dev` and verify:

1. **Sketch mode**: Left-click draws, right-click+drag pans, scroll wheel zooms
2. **Trailer**: Click places 20'×10' trailer, drag to move, handles to resize
3. **Staging area**: Click vertices, double-click closes, shaded polygon appears
4. **Worker zone**: Click vertices, double-click closes, dashed zone with station label
5. **Hazard point**: Click places red dot with 25' red buffer circle
6. **Hazard line**: Click points, double-click finishes, red buffer capsule renders
7. **Buffer setting**: Change buffer distance in sidebar, new hazards use updated value
8. **Cone numbering**: Draw worker zones around cones, click "Number Cones", labels appear
9. **Layer toggles**: All new layers toggle on/off correctly
10. **Save/load**: Save course with new elements, reload, everything persists
11. **Shared link**: Open a shared course URL, see read-only viewer, click "Edit a Copy"

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "Fix integration issues from smoke test"
```
