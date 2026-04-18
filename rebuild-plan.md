# Autocross Designer 2 — Svelte Rebuild

## Why This Rebuild

The primary driver is **sharing and cloud persistence**. The current app's URL sharing is broken — it encodes course data into the URL with a 2.5KB hard limit and stub compression functions that don't actually compress. Most real courses exceed this limit, making the "Share" button useless. Courses only exist in one browser's localStorage, with autosave using sessionStorage that's lost on tab close. There's no way to browse saved courses, access them from another device, or send someone a working link.

Fixing sharing properly requires server-side storage (Supabase), which requires a build system, which makes it the right time to also address the architectural debt that blocks every other improvement: the 1642-line monolithic `app.js`, circular module dependencies, and the `window.createMarker` runtime hack.

Beyond sharing, this rebuild targets:
- **UI feedback** — ghost markers, selection highlighting, tool state indicators, grouped toolbar
- **New course tools** — timing/sector lines, extensible obstacle types
- **Better exports** — PDF, SVG, and a print layout with title/legend/cone counts/scale bar

## Context

The current codebase is a vanilla JS app (~10K lines) with Mapbox GL JS, deployed to GitHub Pages with no build step. It works for single-user local design but can't grow.

## Tech Stack

- **SvelteKit** with `adapter-static` (deploys to GitHub Pages)
- **Svelte 5** runes for reactivity
- **TypeScript**
- **Mapbox GL JS v3.x** (unchanged)
- **Supabase** free tier — PostgreSQL + REST API for course storage
- **Vite** (comes with SvelteKit)

## Phased Implementation

### Phase 0: Scaffolding
- Create SvelteKit project in `Projects/autocross-designer-2/` (replace `src/`)
- Install: `mapbox-gl`, `@supabase/supabase-js`, `@sveltejs/adapter-static`
- Configure env vars: `VITE_MAPBOX_TOKEN`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Define TypeScript interfaces in `src/lib/types/course.ts` (matching existing JSON format for backward compat)
- Copy pure logic into `src/lib/engine/`: distance, catmull-rom spline, gate math, slalom math, cone snap logic, grid renderer, course serializer, print capture
- Update GitHub Actions for `npm run build` → deploy `build/`

### Phase 1: Map + Core Cone Placement
- `courseStore.ts` — central store holding `CourseData` with snapshot-based undo/redo
- `toolStore.ts` — active tool, tool config (gate width, obstacle type), active tool step indicator (e.g., "Click second gate point")
- `mapStore.ts` — map instance ref, mode, zoom
- `MapContainer.svelte` — initializes Mapbox, exposes map via `setContext`, dispatches clicks to active tool handler
- `ConeMarker.svelte` — creates `mapboxgl.Marker` on mount, handles drag/delete; ghost marker preview on hover before click
- `Toolbar.svelte` + `ToolButton.svelte` — cone tools only at first
- `ToolStatus.svelte` — displays current tool step/prompt (e.g., "Place first gate cone")
- `+layout.svelte` — app shell: toolbar left, map center, sidebar right
- Keyboard shortcuts via `<svelte:window on:keydown>`

### Phase 2: Remaining Placement Tools
- Gate tool (two-click, uses `engine/gateLogic.ts`)
- Slalom tool (two-click + `SlalomDialog.svelte`)
- `ObstacleMarker.svelte` — data-driven obstacle types loaded from `engine/obstacleTypes.ts` (fences, buildings, trees, parking lines, curbs, drains, light poles, trailers) so new types are config, not code
- `WorkerMarker.svelte`, `NoteMarker.svelte`
- `NoteDialog.svelte` (replaces `prompt()`)
- `TimingLine.svelte` — start/finish timing lines and sector split markers for walk-through planning
- Trailer + staging grid resize/rotate handles
- `PreviewLine.svelte` — rubber-band line during multi-click tools

### Phase 3: Drawing Tools + Overlays
- `MeasurementOverlay.svelte` — SVG lines + draggable endpoints
- `OutlineOverlay.svelte` — Bezier curves + control points
- Driving line: `WaypointMarker.svelte` + GeoJSON layer + `catmullRom.ts`
- `GridOverlay.svelte` — canvas element using `gridRenderer.ts`

### Phase 4: Sidebar + Layers + Selection
- `Sidebar.svelte`: `CourseInfo`, `LayerToggles`, `NotesList`, `WorkersList`
- `layerStore.ts` — visibility toggles, wired into marker components
- `selectionStore.ts` — multi-select, box-select overlay, group drag/delete, clear visual highlight/outline on selected elements

### Phase 5: Image Mode
- Port `imageMap.ts` + `imageMarker.ts` into `src/lib/engine/`
- `ModeBanner.svelte` — landing mode selection (map vs image)
- `ImageGallery.svelte` — bundled course image picker
- `ScaleDialog.svelte` — two-point calibration
- `MapContainer.svelte` branches on mode: Mapbox or ImageMap adapter

### Phase 6: Supabase Cloud Save + Share
- Set up Supabase project with `courses` table:
  - `id` (uuid), `creator_token` (text), `title`, `data` (jsonb), `is_public`, `created_at`, `updated_at`
  - RLS: public read for public courses, creator-only write via token header
- `supabase.ts` — client init
- `courseService.ts` — save/load/list/update CRUD
- Creator token: random UUID generated on first visit, stored in localStorage
- "Save & Share" button → saves to Supabase → returns shareable URL
- `/course/[id]` route — read-only view with "Clone to Editor" button
- "My Courses" list in sidebar
- Keep localStorage save/load for offline use

### Phase 7: Export, Print, Venues
- JSON export/import in toolbar
- `PrintDialog.svelte` — configurable print layout with course title, cone count summary, element legend, and scale bar
- `printCapture.ts` — canvas export for raster output
- PDF export via `jsPDF` + canvas capture → downloadable PDF with print layout
- SVG export — vector format rendering of course elements for Illustrator/Inkscape editing
- `VenueList.svelte` — venue template save/load via localStorage

### Phase 8: UI Polish
- Grouped toolbar with collapsible sections + icons + tooltips
- Better multi-step tool feedback (ghost markers for slalom preview, pulsing dots)
- Dark theme via CSS custom properties
- Component-scoped styles (extract from existing 2000-line `style.css`)

## Code Reuse Map

**Copy as-is into `src/lib/engine/`:**
- `distance.js` → `distance.ts` (Haversine + pixel distance)
- `drivingline.js` lines 103-139 → `catmullRom.ts` (spline interpolation)
- `storage.js` serialize/migrate/validate → `courseSerializer.ts`
- `app.js` lines 433-479 → `gateLogic.ts` (gate placement math)
- `app.js` lines 485-612 → `slalomLogic.ts` (slalom placement math)
- `cones.js` lines 25-73 → `coneLogic.ts` (pointer rotation/snap)
- `grid.js` lines 85-144 → `gridRenderer.ts` (canvas drawing)
- `app.js` lines 874-1188 → `printCapture.ts` (canvas export)

**Port with adaptation:**
- `imageMap.js` + `imageMarker.js` → `engine/imageMap.ts`, `engine/imageMarker.ts` (class stays, event wiring moves to Svelte)
- `sharing.js` compression → keep for URL fallback, primary sharing via Supabase

**Rewrite as Svelte components:**
- `app.js` → decomposed into stores + `MapContainer` + `Toolbar` + layout
- `cones.js` → `ConeMarker.svelte` + `courseStore`
- `measurements.js` → `MeasurementOverlay.svelte`
- `courseoutline.js` → `OutlineOverlay.svelte`
- `notes.js` → `NoteMarker.svelte` + `NotesList.svelte`
- `obstacles.js` → `ObstacleMarker.svelte`
- `workers.js` → `WorkerMarker.svelte` + `WorkersList.svelte`
- `selection.js` → `selectionStore.ts` + box-select in `MapContainer`
- `history.js` → snapshot logic in `courseStore.ts`
- `layers.js` → `layerStore.ts` + `LayerToggles.svelte`

## Key Architecture Decisions

- **Single `courseStore`** (not per-module stores) — undo/redo needs atomic snapshots of all course data at once
- **Svelte context for map instance** — avoids prop drilling; map is mutable/non-reactive (Mapbox manages its own state)
- **Imperative Mapbox markers** — `mapboxgl.Marker` is a DOM element positioned by the library; Svelte components create them in `onMount`, remove in `onDestroy`
- **`adapter-static`** — GitHub Pages is static-only; Supabase calls happen client-side in `onMount`

## Verification

After each phase:
1. `npm run build` succeeds (no TS errors, static adapter produces output)
2. `npm run preview` — manual test in browser
3. Phase 1+: place cones, undo/redo, verify markers persist across tool switches
4. Phase 5: test both map and image mode
5. Phase 6: save a course, copy the share link, open in incognito → course loads read-only
6. Final: import a JSON from the old app → verify it loads correctly (backward compat)
