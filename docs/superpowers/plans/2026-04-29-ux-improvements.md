# UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 7 usability improvements: cone visibility, pointer auto-distance, freehand sketch tool, favicon, zoom-to-course, compact venue save, and course delete.

**Architecture:** Independent changes across the SvelteKit codebase. The sketch tool is the largest addition (new component, type, store updates, serializer updates). All other changes are modifications to existing files. No new dependencies required.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes), TypeScript, Mapbox GL v3, Supabase

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/components/ConeMarker.svelte` | Modify | Add dark border + glow CSS |
| `src/lib/engine/coneLogic.ts` | Modify | Add `offsetPointerPosition()` for 5ft auto-placement |
| `src/lib/engine/distance.ts` | Modify | Add `feetToLngLatOffset()` and `feetToPixelOffset()` |
| `src/lib/components/MapContainer.svelte` | Modify | Wire pointer offset, sketch tool, zoom-to-course |
| `src/lib/types/course.ts` | Modify | Add `SketchData` interface, update `CourseData` |
| `src/lib/stores/courseStore.svelte.ts` | Modify | Add sketch CRUD methods, restore sketches in undo |
| `src/lib/stores/toolStore.svelte.ts` | Modify | Add `'sketch'` to Tool union |
| `src/lib/stores/layerStore.svelte.ts` | Modify | Add `'sketches'` layer |
| `src/lib/engine/courseSerializer.ts` | Modify | Add `'sketches'` to ARRAY_FIELDS, emptyCourse |
| `src/lib/components/SketchOverlay.svelte` | Create | Freehand drawing + rendering on map |
| `src/lib/components/Toolbar.svelte` | Modify | Add Sketch tool button |
| `src/lib/components/Sidebar.svelte` | Modify | Add course delete button |
| `src/lib/components/VenueList.svelte` | Modify | Compact save icon layout |
| `static/favicon.svg` | Replace | autox.tools "A" icon |
| `src/app.html` | Modify | Add favicon link tag |
| `src/lib/engine/svgExport.ts` | No change | `allPoints()` already excludes unknown arrays — sketches won't appear |
| `src/routes/course/[id]/+page.svelte` | Modify | Trigger zoom-to-course on clone |

---

### Task 1: Cone Visibility — Dark Border + Glow

**Files:**
- Modify: `src/lib/components/ConeMarker.svelte:246-264`

- [ ] **Step 1: Update `.cone-marker` base style**

In `ConeMarker.svelte`, replace the existing `.cone-marker` style:

```css
:global(.cone-marker) {
	width: 14px;
	height: 14px;
	border-radius: 50%;
	transform: scale(var(--marker-scale, 1));
	filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.7));
	border: 1px solid rgba(0, 0, 0, 0.6);
}
```

- [ ] **Step 2: Update `.marker-pointer` to skip border (clip-path prevents it)**

The pointer style already uses `border-radius: 0` and `clip-path`. The `border` from `.cone-marker` gets clipped, so no additional change needed — the glow from `drop-shadow` handles contrast for triangles.

- [ ] **Step 3: Verify visually**

Run: `npm run dev`

Open the app, place regular cones, pointer cones, start cones, and finish cones on satellite imagery. Confirm:
- Circle cones have a visible dark border
- All cones have a subtle dark glow around them
- Pointer triangles are visible against grass/pavement via the glow

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/ConeMarker.svelte
git commit -m "Improve cone visibility with dark border and glow"
```

---

### Task 2: Pointer Cone Auto-Placement at 5 Feet

**Files:**
- Modify: `src/lib/engine/distance.ts`
- Modify: `src/lib/engine/coneLogic.ts`
- Modify: `src/lib/components/MapContainer.svelte:117-126`

- [ ] **Step 1: Add offset utility to distance.ts**

Append to `src/lib/engine/distance.ts`:

```typescript
const FEET_TO_METERS = 1 / METERS_TO_FEET;

export function feetToLngLatOffset(
	origin: LngLat,
	angleDeg: number,
	feet: number
): LngLat {
	const meters = feet * FEET_TO_METERS;
	const angleRad = angleDeg * Math.PI / 180;
	const dLat = (meters * Math.cos(angleRad)) / EARTH_RADIUS_M * (180 / Math.PI);
	const cosLat = Math.cos(origin[1] * Math.PI / 180);
	const dLng = (meters * Math.sin(angleRad)) / (EARTH_RADIUS_M * cosLat) * (180 / Math.PI);
	return [origin[0] + dLng, origin[1] + dLat];
}

export function feetToPixelOffset(
	origin: LngLat,
	angleDeg: number,
	feet: number,
	feetPerPixel: number
): LngLat {
	const pixels = feet / feetPerPixel;
	const angleRad = angleDeg * Math.PI / 180;
	return [origin[0] + pixels * Math.sin(angleRad), origin[1] - pixels * Math.cos(angleRad)];
}
```

- [ ] **Step 2: Add `offsetPointerPosition()` to coneLogic.ts**

In `src/lib/engine/coneLogic.ts`, add the import at the top (after the existing import):

```typescript
import { feetToLngLatOffset, feetToPixelOffset } from './distance';
```

Then append the function at the end of the file:

```typescript
const POINTER_OFFSET_FEET = 5;

export function offsetPointerPosition(
	clickLngLat: LngLat,
	cones: ConeData[],
	mode: 'map' | 'image',
	feetPerPixel?: number
): LngLat {
	const nearest = findNearestRegularCone(clickLngLat, cones);
	if (!nearest) return clickLngLat;

	const dx = clickLngLat[0] - nearest.lngLat[0];
	const dy = clickLngLat[1] - nearest.lngLat[1];

	if (dx === 0 && dy === 0) return clickLngLat;

	let angleDeg: number;
	if (mode === 'image') {
		angleDeg = Math.atan2(dx, -dy) * (180 / Math.PI);
		if (feetPerPixel == null) return clickLngLat;
		return feetToPixelOffset(nearest.lngLat, angleDeg, POINTER_OFFSET_FEET, feetPerPixel);
	}

	const cosLat = Math.cos(nearest.lngLat[1] * Math.PI / 180);
	const correctedDx = dx * cosLat;
	angleDeg = Math.atan2(correctedDx, dy) * (180 / Math.PI);
	return feetToLngLatOffset(nearest.lngLat, angleDeg, POINTER_OFFSET_FEET);
}
```

- [ ] **Step 3: Wire into MapContainer click handler**

In `MapContainer.svelte`, add the import at the top of the `<script>`:

```typescript
import { offsetPointerPosition } from '$lib/engine/coneLogic';
```

Replace the `case 'pointer':` line within the switch statement (lines 119-125). Change from:

```typescript
case 'regular':
case 'pointer':
case 'start-cone':
case 'finish-cone':
case 'trailer':
case 'staging-grid':
	courseStore.pushUndo();
	courseStore.addCone({ id: generateId(), type: tool, lngLat, lockedTargetId: null });
	break;
```

To:

```typescript
case 'regular':
case 'start-cone':
case 'finish-cone':
case 'trailer':
case 'staging-grid':
	courseStore.pushUndo();
	courseStore.addCone({ id: generateId(), type: tool, lngLat, lockedTargetId: null });
	break;

case 'pointer': {
	const feetPerPixel = mapStore.mode === 'image' && mapStore.map && 'getScale' in mapStore.map
		? mapStore.map.getScale()
		: undefined;
	const pointerPos = offsetPointerPosition(
		lngLat, courseStore.course.cones, mapStore.mode, feetPerPixel
	);
	courseStore.pushUndo();
	courseStore.addCone({ id: generateId(), type: 'pointer', lngLat: pointerPos, lockedTargetId: null });
	break;
}
```

- [ ] **Step 4: Verify**

Run: `npm run dev`

Place a regular cone, then switch to pointer tool and click near it. The pointer should appear exactly ~5 feet from the regular cone in the click direction, not at the click location.

- [ ] **Step 5: Commit**

```bash
git add src/lib/engine/distance.ts src/lib/engine/coneLogic.ts src/lib/components/MapContainer.svelte
git commit -m "Auto-place pointer cones 5 feet from nearest cone"
```

---

### Task 3: Sketch Tool — Types, Stores, and Serializer

**Files:**
- Modify: `src/lib/types/course.ts`
- Modify: `src/lib/stores/courseStore.svelte.ts`
- Modify: `src/lib/stores/toolStore.svelte.ts`
- Modify: `src/lib/stores/layerStore.svelte.ts`
- Modify: `src/lib/engine/courseSerializer.ts`

- [ ] **Step 1: Add SketchData type and update CourseData**

In `src/lib/types/course.ts`, add after the `OutlineSegmentData` interface (after line 52):

```typescript
export interface SketchData {
	id: string;
	points: LngLat[];
}
```

Add `sketches` to `CourseData` (after `courseOutline` on line 62):

```typescript
sketches: SketchData[];
```

- [ ] **Step 2: Add sketch methods to courseStore**

In `src/lib/stores/courseStore.svelte.ts`, add the import of `SketchData`:

```typescript
import { type CourseData, type ConeData, type ObstacleData, type WorkerData, type NoteData, type WaypointData, type MeasurementData, type OutlineSegmentData, type SketchData, type LngLat } from '$lib/types/course';
```

Add `course.sketches = data.sketches;` to the `restore()` function (after line 22):

```typescript
course.sketches = data.sketches;
```

Add these methods to the `courseStore` object, before the `setMapView` method:

```typescript
addSketch(sketch: SketchData): void {
	course.sketches.push(sketch);
},

removeSketch(id: string): void {
	const idx = course.sketches.findIndex((s) => s.id === id);
	if (idx !== -1) course.sketches.splice(idx, 1);
},
```

- [ ] **Step 3: Add 'sketch' to Tool union**

In `src/lib/stores/toolStore.svelte.ts`, add `'sketch'` to the `Tool` type after `'scale'`:

```typescript
| 'sketch';
```

- [ ] **Step 4: Add 'sketches' layer**

In `src/lib/stores/layerStore.svelte.ts`, add `'sketches'` to the `LayerKey` type:

```typescript
| 'sketches';
```

Add to the layers array (before the `'grid'` entry):

```typescript
{ key: 'sketches', label: 'Sketches', visible: true },
```

- [ ] **Step 5: Update courseSerializer**

In `src/lib/engine/courseSerializer.ts`, add `'sketches'` to the `ARRAY_FIELDS` constant:

```typescript
const ARRAY_FIELDS = [
	'cones',
	'drivingLine',
	'measurements',
	'notes',
	'obstacles',
	'workers',
	'courseOutline',
	'sketches'
] as const;
```

Add `sketches: []` to `emptyCourse()` return value (after `courseOutline`):

```typescript
sketches: [],
```

- [ ] **Step 6: Verify build**

Run: `npm run build`

Expected: No type errors. The build should succeed.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types/course.ts src/lib/stores/courseStore.svelte.ts src/lib/stores/toolStore.svelte.ts src/lib/stores/layerStore.svelte.ts src/lib/engine/courseSerializer.ts
git commit -m "Add sketch data model, store methods, and serialization"
```

---

### Task 4: Sketch Tool — SketchOverlay Component

**Files:**
- Create: `src/lib/components/SketchOverlay.svelte`

- [ ] **Step 1: Create SketchOverlay.svelte**

Create `src/lib/components/SketchOverlay.svelte`:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { toolStore } from '$lib/stores/toolStore.svelte';
	import { selectionStore } from '$lib/stores/selectionStore.svelte';
	import type { LngLat } from '$lib/types/course';

	const SOURCE_ID = 'sketch-source';
	const LAYER_ID = 'sketch-layer';

	let isDrawing = false;
	let currentPoints: LngLat[] = [];
	let currentSketchId = '';

	function buildGeoJSON() {
		return {
			type: 'FeatureCollection' as const,
			features: courseStore.course.sketches.map((s) => ({
				type: 'Feature' as const,
				geometry: {
					type: 'LineString' as const,
					coordinates: s.points
				},
				properties: { id: s.id }
			}))
		};
	}

	function updateSource() {
		const map = mapStore.map;
		if (!map) return;
		const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
		if (source) source.setData(buildGeoJSON());
	}

	function generateId(): string {
		return 'sk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
	}

	export function handleMouseDown(e: { lngLat: { lng: number; lat: number }; originalEvent: MouseEvent }) {
		if (toolStore.activeTool !== 'sketch') return;
		if (e.originalEvent.button !== 0) return;
		isDrawing = true;
		currentSketchId = generateId();
		currentPoints = [[e.lngLat.lng, e.lngLat.lat]];

		const map = mapStore.map;
		if (map && 'dragPan' in map) (map as mapboxgl.Map).dragPan.disable();
	}

	export function handleMouseMove(e: { lngLat: { lng: number; lat: number } }) {
		if (!isDrawing) return;
		currentPoints.push([e.lngLat.lng, e.lngLat.lat]);

		const map = mapStore.map;
		if (!map) return;
		const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
		if (!source) return;

		const data = buildGeoJSON();
		if (currentPoints.length >= 2) {
			data.features.push({
				type: 'Feature',
				geometry: { type: 'LineString', coordinates: [...currentPoints] },
				properties: { id: currentSketchId }
			});
		}
		source.setData(data);
	}

	export function handleMouseUp() {
		if (!isDrawing) return;
		isDrawing = false;

		const map = mapStore.map;
		if (map && 'dragPan' in map) (map as mapboxgl.Map).dragPan.enable();

		if (currentPoints.length >= 2) {
			courseStore.pushUndo();
			courseStore.addSketch({ id: currentSketchId, points: [...currentPoints] });
			updateSource();
		}
		currentPoints = [];
		currentSketchId = '';
	}

	export function handleClick(e: { lngLat: { lng: number; lat: number } }) {
		if (toolStore.activeTool !== 'select') return;

		const map = mapStore.map;
		if (!map || !('queryRenderedFeatures' in map)) return;
		const mapbox = map as mapboxgl.Map;
		const point = mapbox.project([e.lngLat.lng, e.lngLat.lat]);
		const features = mapbox.queryRenderedFeatures(
			[[point.x - 5, point.y - 5], [point.x + 5, point.y + 5]],
			{ layers: [LAYER_ID] }
		);

		if (features.length > 0) {
			const sketchId = features[0].properties?.id;
			if (sketchId) {
				selectionStore.clear();
				selectionStore.select('sketch', sketchId);
			}
		}
	}

	export function deleteSelected() {
		for (const item of selectionStore.selected) {
			if (item.type === 'sketch') {
				courseStore.pushUndo();
				courseStore.removeSketch(item.id);
			}
		}
		selectionStore.clear();
		updateSource();
	}

	onMount(() => {
		const map = mapStore.map;
		if (!map) return;

		map.addSource(SOURCE_ID, {
			type: 'geojson',
			data: buildGeoJSON()
		});

		map.addLayer({
			id: LAYER_ID,
			type: 'line',
			source: SOURCE_ID,
			paint: {
				'line-color': '#a855f7',
				'line-width': 2,
				'line-opacity': 0.7
			}
		});

		return () => {
			if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
			if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
		};
	});

	$effect(() => {
		const _len = courseStore.course.sketches.length;
		updateSource();
	});
</script>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: Builds with no errors (component not yet wired into MapContainer).

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/SketchOverlay.svelte
git commit -m "Add SketchOverlay component for freehand drawing"
```

---

### Task 5: Sketch Tool — Wire into MapContainer and Toolbar

**Files:**
- Modify: `src/lib/components/MapContainer.svelte`
- Modify: `src/lib/components/Toolbar.svelte`

- [ ] **Step 1: Add SketchOverlay to MapContainer**

In `MapContainer.svelte`, add the import:

```typescript
import SketchOverlay from './SketchOverlay.svelte';
```

Add state variable near the other overlay refs (after line 56):

```typescript
let sketchOverlay = $state<SketchOverlay>();
```

Add a `'sketch'` case to `handleClick` (before `case 'select':`):

```typescript
case 'sketch':
	break;
```

Wire the sketch events into the map initialization. In `initMapMode()`, add after `map.on('mousemove', handleMouseMove);` (after line 479):

```typescript
map.on('mousedown', (e: mapboxgl.MapMouseEvent) => sketchOverlay?.handleMouseDown(e));
map.on('mousemove', (e: mapboxgl.MapMouseEvent) => sketchOverlay?.handleMouseMove(e));
map.on('mouseup', () => sketchOverlay?.handleMouseUp());
map.on('click', (e: mapboxgl.MapMouseEvent) => sketchOverlay?.handleClick(e));
```

In `initImageMode()`, add the same events after `imageMap.on('mousemove', handleMouseMove);` (after line 502):

```typescript
imageMap.on('mousedown', (e: any) => sketchOverlay?.handleMouseDown(e));
imageMap.on('mousemove', (e: any) => sketchOverlay?.handleMouseMove(e));
imageMap.on('mouseup', () => sketchOverlay?.handleMouseUp());
imageMap.on('click', (e: any) => sketchOverlay?.handleClick(e));
```

In the template, add the SketchOverlay after the GridOverlay (after line 554):

```svelte
{#if layerStore.isVisible('sketches')}
	<SketchOverlay bind:this={sketchOverlay} />
{/if}
```

Add keyboard handler for delete. In `initMapMode()` after `initBoxSelection()` (after line 470):

```typescript
document.addEventListener('keydown', (e) => {
	if (e.key === 'Delete' || e.key === 'Backspace') {
		sketchOverlay?.deleteSelected();
	}
});
```

- [ ] **Step 2: Add Sketch button to Toolbar**

In `src/lib/components/Toolbar.svelte`, add the sketch tool in the "Course Elements" section, after the Outline button (after line 85):

```svelte
<ToolButton tool="sketch" label="Sketch" title="Freehand sketch line" />
```

- [ ] **Step 3: Verify**

Run: `npm run dev`

Test:
- Select Sketch tool from toolbar
- Click and drag on the map — a purple line should appear following the mouse
- Release — the line persists
- Draw multiple strokes
- Switch to Select tool, click a sketch line, press Delete — it should be removed
- Toggle "Sketches" layer in sidebar — lines hide/show

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/MapContainer.svelte src/lib/components/Toolbar.svelte
git commit -m "Wire sketch tool into map and toolbar"
```

---

### Task 6: Favicon

**Files:**
- Replace: `static/favicon.svg`
- Modify: `src/app.html`

- [ ] **Step 1: Replace favicon.svg**

Replace the contents of `static/favicon.svg` with:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <!-- left leg of A -->
  <line x1="16" y1="4" x2="8" y2="27" stroke="#ff6b35" stroke-width="3" stroke-linecap="round"/>
  <!-- right leg of A -->
  <line x1="16" y1="4" x2="24" y2="27" stroke="#ff6b35" stroke-width="3" stroke-linecap="round"/>
  <!-- crossbar of A (inset to stay within the legs) -->
  <line x1="11.5" y1="17" x2="20.5" y2="17" stroke="#ff6b35" stroke-width="2.5" stroke-linecap="round"/>
  <!-- base -->
  <line x1="4" y1="27" x2="28" y2="27" stroke="#ff6b35" stroke-width="3" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 2: Add favicon link to app.html**

In `src/app.html`, add inside `<head>` before `%sveltekit.head%`:

```html
<link rel="icon" href="/favicon.svg" />
```

The full head becomes:

```html
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="text-scale" content="scale" />
	<link rel="icon" href="/favicon.svg" />
	%sveltekit.head%
</head>
```

- [ ] **Step 3: Verify**

Run: `npm run dev`

Check the browser tab — should show the orange "A" icon instead of the Svelte logo.

- [ ] **Step 4: Commit**

```bash
git add static/favicon.svg src/app.html
git commit -m "Replace favicon with autox.tools A icon"
```

---

### Task 7: Zoom to Course on Load

**Files:**
- Modify: `src/lib/components/MapContainer.svelte`
- Modify: `src/routes/course/[id]/+page.svelte`

- [ ] **Step 1: Add fitBoundsToCourse function in MapContainer**

In `MapContainer.svelte`, add this function after `handleScaleCancel()` (after line 296):

```typescript
export function fitBoundsToCourse() {
	const map = mapStore.map;
	if (!map || !('fitBounds' in map)) return;

	const points: LngLat[] = [];
	for (const c of courseStore.course.cones) points.push(c.lngLat);
	for (const wp of courseStore.course.drivingLine) points.push(wp.lngLat);
	for (const m of courseStore.course.measurements) { points.push(m.p1); points.push(m.p2); }
	for (const n of courseStore.course.notes) points.push(n.lngLat);
	for (const o of courseStore.course.obstacles) points.push(o.lngLat);
	for (const w of courseStore.course.workers) points.push(w.lngLat);
	for (const s of courseStore.course.courseOutline) { points.push(s.p1); points.push(s.p2); }
	for (const sk of courseStore.course.sketches) {
		for (const p of sk.points) points.push(p);
	}

	if (points.length === 0) return;

	let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
	for (const [lng, lat] of points) {
		if (lng < minLng) minLng = lng;
		if (lng > maxLng) maxLng = lng;
		if (lat < minLat) minLat = lat;
		if (lat > maxLat) maxLat = lat;
	}

	(map as mapboxgl.Map).fitBounds(
		[[minLng, minLat], [maxLng, maxLat]],
		{ padding: 0, animate: false }
	);
}
```

- [ ] **Step 2: Call fitBoundsToCourse when loading from sidebar**

In `Sidebar.svelte`, the `openCourse()` function currently loads the course data but has no access to MapContainer. We need to expose fitBounds through an event.

Add a prop to Sidebar:

```typescript
let { onfitcourse }: { onfitcourse?: () => void } = $props();
```

Update `openCourse()`:

```typescript
async function openCourse(id: string) {
	const saved = await loadCourse(id);
	if (saved) {
		courseStore.load(deserialize(saved.data));
		onfitcourse?.();
	}
}
```

- [ ] **Step 3: Wire in +page.svelte**

In `src/routes/+page.svelte`, add a ref to MapContainer and pass the callback to Sidebar.

Add `bind:this` to MapContainer:

```svelte
<MapContainer bind:this={mapContainer} />
```

Add the variable in the script:

```typescript
let mapContainer = $state<MapContainer>();
```

Add the import if MapContainer isn't already imported (it's used as a component so it should be). Then pass to Sidebar:

```svelte
<Sidebar onfitcourse={() => mapContainer?.fitBoundsToCourse()} />
```

- [ ] **Step 4: Trigger fitBounds on shared course clone**

In `src/routes/course/[id]/+page.svelte`, the `cloneToEditor()` function loads data and navigates to `/`. The fitBounds needs to happen after the map initializes on the home page.

The simplest approach: store a flag in sessionStorage that the home page checks after map init.

Update `cloneToEditor()` in `course/[id]/+page.svelte`:

```typescript
function cloneToEditor() {
	if (!course) return;
	const data = deserialize(course.data);
	courseStore.load(data);
	sessionStorage.setItem('fitCourseOnLoad', 'true');
	goto('/');
}
```

In `MapContainer.svelte`, at the end of `initMapMode()` inside `map.on('load', ...)` (after line 470):

```typescript
if (sessionStorage.getItem('fitCourseOnLoad')) {
	sessionStorage.removeItem('fitCourseOnLoad');
	setTimeout(() => fitBoundsToCourse(), 100);
}
```

- [ ] **Step 5: Verify**

Run: `npm run dev`

Test:
- Save a course, then load it from "My Courses" — map should zoom to fit all elements
- Share a course URL, open it, click "Clone to Editor" — map should zoom to fit
- Load an empty course — map should stay at default center/zoom

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/MapContainer.svelte src/lib/components/Sidebar.svelte src/routes/+page.svelte src/routes/course/[id]/+page.svelte
git commit -m "Zoom to fit course bounds on load"
```

---

### Task 8: Venue Save — Compact Icon Button

**Files:**
- Modify: `src/lib/components/VenueList.svelte:54-62, 108-121`

- [ ] **Step 1: Replace Save button with icon**

In `VenueList.svelte`, replace the save button markup (line 61):

```html
<button class="venue-save-btn" onclick={saveCurrentVenue} disabled={!newName.trim()}>Save</button>
```

With:

```html
<button class="venue-save-btn" onclick={saveCurrentVenue} disabled={!newName.trim()} title="Save venue">
	<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
		<polyline points="17 21 17 13 7 13 7 21"/>
		<polyline points="7 3 7 8 15 8"/>
	</svg>
</button>
```

- [ ] **Step 2: Update button CSS for icon sizing**

Replace the `.venue-save-btn` style:

```css
.venue-save-btn {
	padding: 3px 6px;
	background: #1e293b;
	border: 1px solid #334155;
	border-radius: 3px;
	color: #cbd5e1;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	flex-shrink: 0;
}
```

Update the input height to match:

```css
.venue-save input {
	flex: 1;
	padding: 3px 6px;
	background: #0f172a;
	border: 1px solid #334155;
	border-radius: 3px;
	color: #e2e8f0;
	font-size: 12px;
	outline: none;
	height: 24px;
}
```

- [ ] **Step 3: Verify**

Run: `npm run dev`

Check sidebar — venue save should show a compact input + floppy disk icon, same row, minimal height.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/VenueList.svelte
git commit -m "Replace venue save button with compact icon"
```

---

### Task 9: Course Delete from Sidebar

**Files:**
- Modify: `src/lib/components/Sidebar.svelte:217-233`

- [ ] **Step 1: Add deleteCourse import**

In `Sidebar.svelte`, update the import from courseService (line 8):

```typescript
import { listMyCourses, loadCourse, deleteCourse, type SavedCourse } from '$lib/services/courseService';
```

- [ ] **Step 2: Add handleDeleteCourse function**

Add after the `openCourse` function:

```typescript
async function handleDeleteCourse(id: string, title: string) {
	if (!confirm(`Delete "${title}"?`)) return;
	const ok = await deleteCourse(id);
	if (ok) {
		myCourses = myCourses.filter((c) => c.id !== id);
	}
}
```

- [ ] **Step 3: Add delete button to course list items**

Replace the course list markup (lines 225-230):

```svelte
<div class="item-list">
	{#each myCourses as c}
		<div class="course-item">
			<button class="list-item" onclick={() => openCourse(c.id)}>
				<span class="item-text">{c.title}</span>
			</button>
			<button class="course-delete" onclick={() => handleDeleteCourse(c.id, c.title)} title="Delete">&times;</button>
		</div>
	{/each}
</div>
```

- [ ] **Step 4: Add CSS for course-item and course-delete**

Add to the `<style>` section:

```css
.course-item {
	display: flex;
	gap: 4px;
}

.course-delete {
	padding: 4px 8px;
	background: none;
	border: none;
	color: #64748b;
	cursor: pointer;
	font-size: 16px;
}

.course-delete:hover {
	color: #ef4444;
}
```

- [ ] **Step 5: Verify**

Run: `npm run dev`

Check sidebar "My Courses" section — each course should have an `×` button. Clicking it shows a confirm dialog. Confirming removes the course from the list.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/Sidebar.svelte
git commit -m "Add course delete button to sidebar"
```
