# Autocross Designer 2 — UX Improvements Design

Date: 2026-04-29

## Overview

Seven usability improvements to the autocross course designer. These range from quick CSS fixes to a new freehand sketch tool.

## 1. Cone Visibility

**Problem:** Cones blend into satellite imagery due to poor contrast and no border/outline.

**Solution:** Add a dark stroke and outer glow to all cone markers via CSS in `ConeMarker.svelte`:
- `border: 1px solid rgba(0, 0, 0, 0.6)` on circle-based cones (regular, start, finish)
- Enhanced `filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.7))` on all cone types
- Pointer cones use clip-path (triangle) so they cannot have a CSS border — the drop-shadow glow provides the contrast

**Files:** `src/lib/components/ConeMarker.svelte`

## 2. Pointer Cone Default Distance

**Problem:** Pointer cones land wherever you click, requiring manual positioning near the target cone.

**Solution:** When placing a pointer cone, auto-place it 5 feet from the nearest non-pointer cone in the direction of the click:
- Find the nearest non-pointer cone to the click location
- Calculate the angle from that cone toward the click point
- Place the pointer 5 feet from that cone along that angle
- Map mode: convert 5 feet to longitude/latitude offset with latitude correction for projection distortion
- Image mode: convert 5 feet using the scale calibration
- Pointer auto-rotates toward the target cone via existing logic

**Files:** `src/lib/components/MapContainer.svelte` (click handler for pointer placement), `src/lib/engine/coneLogic.ts` or new utility for distance conversion

## 3. Free Draw Guide Line (Sketch Tool)

**Problem:** No way to sketch a rough course layout to guide cone placement.

**Solution:** New `sketch` tool for freehand drawing on the map.

**Interaction:**
- Select sketch tool from toolbar
- Click and drag to draw freehand — mouse/touch move events capture coordinates into a polyline
- Each click-drag produces one independent stroke segment
- Use select tool to click a stroke, then delete key or right-click to remove it

**Data model:** New `sketches` array in `CourseData`:
```typescript
interface SketchData {
  id: string;
  points: LngLat[];
}
```

**Rendering:** New `SketchOverlay.svelte` component drawing SVG polylines projected onto the map (same pattern as `DrivingLine.svelte`).

**Layer toggle:** New "Sketches" toggle in `layerStore`, visible in the Layers section of the sidebar.

**Persistence:** Stored in `courseStore`, included in undo/redo snapshots, serialized with course saves.

**Exports:** Excluded from PDF, SVG, and shared course views — these are design aids, not course elements.

**Files:** `src/lib/components/SketchOverlay.svelte` (new), `src/lib/types/course.ts`, `src/lib/stores/courseStore.svelte.ts`, `src/lib/stores/toolStore.svelte.ts`, `src/lib/stores/layerStore.svelte.ts`, `src/lib/components/Toolbar.svelte`, `src/lib/components/Sidebar.svelte`, `src/lib/components/MapContainer.svelte`, `src/lib/engine/courseSerializer.ts`

## 4. Favicon

**Problem:** Favicon is still the default Svelte logo, should match autox.tools branding.

**Solution:**
- Copy the "A" icon SVG from `Projects/autox-tools/src/favicon.svg` to `static/favicon.svg` (replacing the Svelte logo)
- Add `<link rel="icon" href="/favicon.svg">` to `src/app.html`

**Files:** `static/favicon.svg`, `src/app.html`

## 5. Zoom to Course on Load

**Problem:** Loading a course restores the saved viewport instead of framing the course content.

**Solution:** After loading course data (from sidebar "My Courses" or shared URL `/course/[id]`):
- Compute the bounding box of all course elements: cones, driving line waypoints, measurements, notes, obstacles, workers, outline segments, sketches
- Call `map.fitBounds()` with zero padding
- If the course has no elements, fall back to the saved `mapCenter`/`mapZoom`

**Files:** `src/lib/components/MapContainer.svelte`, `src/routes/course/[id]/+page.svelte`

## 6. Venue Save — Compact Layout

**Problem:** Venue save button is at the bottom of the sidebar and gets pushed off screen.

**Solution:** Replace the text input + "Save" button with a compact inline layout:
- Same text input but reduced height
- Small save icon button (floppy disk SVG) replacing the text "Save" button
- Same row, minimal vertical footprint
- Behavior unchanged: disabled when input is empty, Enter key still triggers save

**Files:** `src/lib/components/VenueList.svelte`

## 7. Course Delete from Sidebar

**Problem:** No way to delete saved courses from the UI despite `deleteCourse()` existing in the service layer.

**Solution:** Add delete capability to the "My Courses" section of the sidebar:
- `×` button next to each course name (same pattern as venue delete in `VenueList.svelte`)
- On click, show `confirm()` dialog: "Delete [course name]?"
- On confirm, call `deleteCourse(id)` from `courseService.ts`
- Refresh the course list after successful deletion

**Files:** `src/lib/components/Sidebar.svelte`, `src/lib/services/courseService.ts` (already implemented, just needs UI wiring)
