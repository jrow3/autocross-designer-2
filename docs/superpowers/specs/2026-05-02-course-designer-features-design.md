# Course Designer — Next Release Features

**Date:** 2026-05-02
**Status:** Approved

## Overview

Seven features for the next release of autocross-designer-2, covering viewer experience, interaction improvements, polygon-based course elements, and cone numbering.

## 1. Shared Link Viewer

**Goal:** Shared course links open directly into a clean read-only view instead of prompting the user to choose a mode.

**Architecture:** Separate route-level page at `/course/[id]`. No conditional flags in the editor — the viewer is its own minimal component.

**Viewer capabilities:**
- Pan, zoom, scroll the map
- Layer toggles (top-right) for cones, driving line, sketches, etc.
- Course name displayed
- "Edit a Copy" button that clones the course data into localStorage and navigates to the editor at `/`

**What's removed:**
- No left toolbar/panel
- No tool selection
- No cone placement, editing, or deletion
- No save/share (viewer doesn't own the course)

**No ModeBanner:** The viewer skips the "Draw on Live Map" / "Load Image" prompt entirely. The course already has its map/image context from the save data.

## 2. Sketch Mode Scrolling

**Goal:** Allow map navigation while the sketch tool is active.

**Interaction model:**
- **Left-click + drag:** Draw sketch (existing behavior)
- **Right-click + drag:** Pan the map
- **Scroll wheel:** Zoom in/out

**Implementation:** Instead of fully disabling `dragPan` when sketch is active, keep scroll wheel zoom enabled and add a right-click drag handler that temporarily enables `dragPan` for the duration of the drag. Suppress the browser context menu on right-click within the map when sketch tool is active.

## 3. Trailer Placement

**Goal:** Replace the current fiddly resize-handle placement with a simple single-click drop.

**Behavior:**
- Select trailer tool, click on map → places a 20' × 10' trailer at that location
- Trailer can be dragged to reposition after placement
- Edge/corner handles available for resizing if the default size isn't right
- Rotation handle for orienting the trailer

**Changes from current:** No more tiny initial marker that requires immediate resizing. The default size is usable for most trailers without adjustment.

## 4. Staging Area

**Goal:** Define staging/grid areas as shaded polygons instead of the current grid overlay.

**Interaction:**
- Select staging area tool
- Click to place vertices — each click adds a corner of the polygon
- Double-click (or click the first vertex) to close the polygon
- Completed polygon renders as a shaded fill (e.g., blue, semi-transparent) with a border
- Label "STAGING" (or user-defined) displayed inside

**Uses the shared polygon engine** (see Architecture section).

**Replaces:** The current grid/staging-grid marker type. The existing grid overlay (canvas-based spacing grid) remains as a separate visual tool.

## 5. Worker Zones

**Goal:** Define areas where groups of cones are assigned to a numbered worker station.

**Interaction:**
- Select worker zone tool
- Click vertices to define the zone boundary (same polygon engine as staging area)
- Double-click to close
- Zone renders with a dashed border and station label (e.g., "Station 1")
- Each zone is auto-assigned the next available station number
- Station number can be edited

**Styling:** Distinct from staging areas — dashed border, different color palette per station (auto-assigned from a preset list).

**Data:** Worker zones are stored in `courseStore` alongside other course elements. Each zone stores its station number and vertex coordinates.

## 6. Run-off / Safety Zones

**Goal:** Mark hazards (walls, poles, barriers) and visualize the required safety buffer around them.

**Hazard marker types:**
- **Point:** Single click to place (e.g., light pole). Buffer renders as a circle.
- **Line:** Click two or more points to define a line segment (e.g., wall, barrier). Buffer renders as a rounded rectangle/capsule around the line.

**Buffer visualization:**
- Red semi-transparent shaded zone extending outward from the hazard marker
- Default buffer distance: 25 feet
- Buffer distance is a tool setting, configurable before or after placement
- Buffer distance can vary per hazard marker

**Layer:** Run-off zones are a toggleable layer.

## 7. Cone Numbering

**Goal:** Number cones by worker station so each station's workers know which cones they're responsible for.

**Numbering format:** `X01`, `X02`, `X03`... where `X` is the station number. Station 1 → 101, 102, 103. Station 2 → 201, 202, 203.

**Algorithm — driving line projection (primary):**
1. For each worker zone, find all cones inside the zone boundary
2. For each cone, project it onto the nearest point on the driving line
3. Sort cones by their projected position along the driving line
4. Assign sequential numbers within the station
5. Cones equidistant from the line (e.g., gate pairs) are ordered by proximity to the line

**Algorithm — nearest-neighbor chain (fallback):**
- Used when no driving line passes through a zone
- Start from the zone vertex closest to the map origin
- Chain to the nearest unnumbered cone repeatedly
- Assign sequential numbers

**Unnumbered cones:** Cones outside all worker zones remain unnumbered.

**Execution model:**
- Cone numbering is a manual action — user clicks "Number Cones" (button location TBD, likely in sidebar or toolbar)
- Numbers persist until the user re-runs the action
- Changing cones, zones, or the driving line does NOT auto-update or auto-clear numbers
- Results display on a toggleable "Cone Numbers" layer — each cone shows its number as a label

## Architecture

### Shared Polygon Engine

Staging areas, worker zones, and (partially) run-off zones all need vertex-by-vertex polygon drawing. One shared polygon tool handles:

- Click to add vertices
- Double-click or click first vertex to close
- Visual feedback: line segments between placed vertices, dashed preview line to cursor
- Vertex handles for editing after placement (drag to move, click to delete)
- Each feature type provides its own: fill color/opacity, border style, label, and data model

**Run-off zones extend the polygon engine** with additional point and line placement modes, plus buffer rendering via geometric offset calculation.

### New Tools

| Tool | Type | Sidebar Section |
|------|------|----------------|
| Staging Area | Polygon | Course Elements |
| Worker Zone | Polygon | Course Elements |
| Hazard Point | Point | Safety |
| Hazard Line | Line | Safety |

### New Layers

| Layer | Default Visible | Content |
|-------|----------------|---------|
| Staging Areas | Yes | Shaded polygons |
| Worker Zones | Yes | Dashed boundary polygons with station labels |
| Safety Zones | Yes | Red buffer zones around hazard markers |
| Cone Numbers | No | Number labels on cones |

### Data Model Additions

Course data extends with:
- `stagingAreas: StagingArea[]` — polygon vertices, label
- `workerZones: WorkerZone[]` — polygon vertices, station number
- `hazardMarkers: HazardMarker[]` — type (point/line), coordinates, buffer distance
- `coneNumbers: Map<coneId, string>` — assigned numbers, populated by the numbering action

All new data is included in save/share/export. Staging areas, worker zones, and safety zones are visible in the shared link viewer (as toggleable layers). Cone numbers are excluded from the viewer — they're a design-time tool, not a presentation feature.

### Shared Link Viewer

Separate route: `/course/[id]/+page.svelte` (existing file, currently redirects to editor). Replaced with a standalone viewer component that:
- Loads course data from Supabase
- Renders the map with all visual layers
- Provides layer toggles
- Shows "Edit a Copy" button
- Does not import toolbar, tool store, or any editing machinery
