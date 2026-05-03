<script lang="ts">
	import mapboxgl from 'mapbox-gl';
	import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
	import { onMount, setContext } from 'svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { toolStore } from '$lib/stores/toolStore.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { computeGateCones, computeDirectionalCones } from '$lib/engine/gateLogic';
	import { offsetPointerPosition } from '$lib/engine/coneLogic';
	import { computeSlalomPositions } from '$lib/engine/slalomLogic';
	import { ImageMap } from '$lib/engine/imageMap';
	import type { LngLat } from '$lib/types/course';
	import ConeMarker from './ConeMarker.svelte';
	import WorkerMarker from './WorkerMarker.svelte';
	import NoteMarker from './NoteMarker.svelte';
	import NoteDialog from './NoteDialog.svelte';
	import SlalomDialog from './SlalomDialog.svelte';
	import PreviewLine from './PreviewLine.svelte';
	import DrivingLine from './DrivingLine.svelte';
	import MeasurementOverlay from './MeasurementOverlay.svelte';
	import OutlineOverlay from './OutlineOverlay.svelte';
	import GridOverlay from './GridOverlay.svelte';
import SketchOverlay from './SketchOverlay.svelte';
	import PolygonOverlay from './PolygonOverlay.svelte';
	import StagingOverlay from './StagingOverlay.svelte';
	import WorkerZoneOverlay from './WorkerZoneOverlay.svelte';
	import HazardOverlay from './HazardOverlay.svelte';
	import ConeNumberOverlay from './ConeNumberOverlay.svelte';
	import ModeBanner from './ModeBanner.svelte';
	import ScaleDialog from './ScaleDialog.svelte';
	import { layerStore } from '$lib/stores/layerStore.svelte';
	import { autosave, loadAutosave } from '$lib/services/courseService';
	import { deserialize } from '$lib/engine/courseSerializer';
	import { createMarker, wrapForMapbox, type AnyMarker } from '$lib/engine/markerFactory';
	import { distanceFeet } from '$lib/engine/distance';
	import { selectionStore } from '$lib/stores/selectionStore.svelte';

	const BASE_ZOOM = 17;
	let container: HTMLDivElement;

	function generateId(): string {
		return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
	}

	// Mode selection
	let showBanner = $state(true);

	// Multi-click tool state
	let gateCenter: LngLat | null = $state(null);
	let slalomStart: LngLat | null = $state(null);
	let slalomEnd: LngLat | null = $state(null);
	let showSlalomDialog = $state(false);
	let pendingNoteLngLat: LngLat | null = $state(null);
	let mousePos: LngLat | null = $state(null);
	let nextNoteNumber = $state(1);

	// Hazard line tool state
	let hazardLinePoints: LngLat[] = $state([]);

	// Scale calibration state
	let scalePoint1: LngLat | null = $state(null);
	let scalePoint1Marker: ReturnType<typeof createMarker> | null = null;
	let scalePixelDist: number = $state(0);
	let showScaleDialog = $state(false);

	let measurementOverlay = $state<MeasurementOverlay>();
	let outlineOverlay = $state<OutlineOverlay>();
	let gridOverlay = $state<GridOverlay>();
	let sketchOverlay = $state<SketchOverlay>();
	let stagingPolygonOverlay = $state<PolygonOverlay>();
	let workerZonePolygonOverlay = $state<PolygonOverlay>();

	setContext('map', mapStore);



	let previewFrom: LngLat | null = $derived(gateCenter ?? slalomStart);

	let ghostPositions: LngLat[] = $derived.by(() => {
		if (!mousePos) return [];
		if (gateCenter && toolStore.activeTool === 'gate') {
			const { left, right } = computeGateCones(
				gateCenter, mousePos, toolStore.gateWidthFeet, mapStore.mode
			);
			const positions: LngLat[] = [left, right];
			if (toolStore.gateDirectionalCones) {
				const { leftDirectional, rightDirectional } = computeDirectionalCones(
					gateCenter, mousePos, toolStore.gateWidthFeet, mapStore.mode
				);
				positions.push(leftDirectional, rightDirectional);
			}
			return positions;
		}
		if (slalomStart && !slalomEnd && toolStore.activeTool === 'slalom') {
			const spacing = toolStore.slalomSpacingFeet;
			const dist = distanceFeet(slalomStart, mousePos, mapStore.mode);
			const count = dist != null && dist > 0 ? Math.max(2, Math.floor(dist / spacing) + 1) : 2;
			return computeSlalomPositions(slalomStart, mousePos, { count, spacingFeet: spacing }, mapStore.mode);
		}
		return [];
	});

	let ghostMarkers: AnyMarker[] = [];

	$effect(() => {
		ghostMarkers.forEach(m => m.remove());
		ghostMarkers = [];

		const map = mapStore.map;
		if (!map || ghostPositions.length === 0) return;

		for (let i = 0; i < ghostPositions.length; i++) {
			const pos = ghostPositions[i];
			const inner = document.createElement('div');
			const isDirectional = i >= 2 && toolStore.activeTool === 'gate';
			inner.className = `cone-marker ${isDirectional ? 'marker-pointer' : 'marker-regular'} ghost-marker`;
			const wrapper = wrapForMapbox(inner);
			const m = createMarker({ element: wrapper })
				.setLngLat(pos as [number, number])
				.addTo(map);
			ghostMarkers.push(m);
		}
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function handleClick(e: any) {
		const lngLat: LngLat = [e.lngLat.lng, e.lngLat.lat];
		const tool = toolStore.activeTool;

		switch (tool) {
			case 'regular':
			case 'start-cone':
			case 'finish-cone':
				courseStore.pushUndo();
				courseStore.addCone({ id: generateId(), type: tool, lngLat, lockedTargetId: null });
				break;

			case 'trailer':
				courseStore.pushUndo();
				courseStore.addCone({ id: generateId(), type: 'trailer', lngLat, width: 80, height: 40, rotation: 0, lockedTargetId: null });
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

			case 'gate':
				handleGateClick(lngLat);
				break;

			case 'slalom':
				handleSlalomClick(lngLat);
				break;

			case 'worker':
				courseStore.pushUndo();
				courseStore.addWorker({
					id: generateId(),
					number: courseStore.course.workers.length + 1,
					lngLat
				});
				break;

			case 'drivingline':
				courseStore.pushUndo();
				courseStore.addWaypoint({ lngLat });
				break;

			case 'measure':
				measurementOverlay?.handleClick(lngLat);
				break;

			case 'courseoutline':
				outlineOverlay?.handleClick(lngLat);
				break;

			case 'note':
				pendingNoteLngLat = lngLat;
				break;

			case 'scale':
				handleScaleClick(lngLat);
				break;

			case 'sketch':
				break;

			case 'staging-area':
				stagingPolygonOverlay?.handleClick(e);
				return;

			case 'worker-zone':
				workerZonePolygonOverlay?.handleClick(e);
				return;

			case 'hazard-point': {
				courseStore.addHazardMarker({
					id: generateId(),
					type: 'point',
					coordinates: [lngLat],
					bufferFeet: toolStore.hazardBufferFeet
				});
				return;
			}

			case 'hazard-line': {
				if (hazardLinePoints.length === 0) {
					hazardLinePoints = [lngLat];
					toolStore.setStatus('Click second point to finish hazard line.');
				} else {
					courseStore.addHazardMarker({
						id: generateId(),
						type: 'line',
						coordinates: [hazardLinePoints[0], lngLat],
						bufferFeet: toolStore.hazardBufferFeet
					});
					hazardLinePoints = [];
					toolStore.clearStatus();
				}
				return;
			}

			case 'select': {
				// Check if clicking on a hazard marker/buffer
				const map = mapStore.map as mapboxgl.Map;
				if (map && typeof map.queryRenderedFeatures === 'function') {
					const point = e.point;
					const hazardFeatures = map.queryRenderedFeatures(point, {
						layers: ['hazard-marker-points', 'hazard-marker-lines', 'hazard-buffer-fill']
					});
					if (hazardFeatures.length > 0) {
						// Find the hazard marker closest to the click
						const clickLngLat = lngLat;
						let closestId = '';
						let closestDist = Infinity;
						for (const marker of courseStore.course.hazardMarkers) {
							for (const coord of marker.coordinates) {
								const dx = coord[0] - clickLngLat[0];
								const dy = coord[1] - clickLngLat[1];
								const d = dx * dx + dy * dy;
								if (d < closestDist) {
									closestDist = d;
									closestId = marker.id;
								}
							}
						}
						if (closestId) {
							selectionStore.clear();
							selectionStore.select('hazard', closestId);
							break;
						}
					}
				}
				selectionStore.clear();
				break;
			}
		}
	}

	function handleGateClick(lngLat: LngLat) {
		if (!gateCenter) {
			gateCenter = lngLat;
			toolStore.setStatus('Click to set driving direction through the gate');
		} else {
			courseStore.pushUndo();
			const { left, right } = computeGateCones(
				gateCenter,
				lngLat,
				toolStore.gateWidthFeet,
				mapStore.mode
			);
			courseStore.addCone({ id: generateId(), type: 'regular', lngLat: left, lockedTargetId: null });
			courseStore.addCone({ id: generateId(), type: 'regular', lngLat: right, lockedTargetId: null });
			if (toolStore.gateDirectionalCones) {
				const { leftDirectional, rightDirectional } = computeDirectionalCones(
					gateCenter, lngLat, toolStore.gateWidthFeet, mapStore.mode
				);
				courseStore.addCone({ id: generateId(), type: 'pointer', lngLat: leftDirectional, lockedTargetId: null });
				courseStore.addCone({ id: generateId(), type: 'pointer', lngLat: rightDirectional, lockedTargetId: null });
			}
			gateCenter = null;
			toolStore.clearStatus();
		}
	}

	function handleSlalomClick(lngLat: LngLat) {
		if (showSlalomDialog) return;
		if (!slalomStart) {
			slalomStart = lngLat;
			toolStore.setStatus('Click the end position for the slalom');
		} else {
			slalomEnd = lngLat;
			showSlalomDialog = true;
			toolStore.clearStatus();
		}
	}

	function handleSlalomConfirm(count: number, spacingFeet: number) {
		if (!slalomStart || !slalomEnd) return;
		courseStore.pushUndo();
		const positions = computeSlalomPositions(
			slalomStart,
			slalomEnd,
			{ count, spacingFeet: spacingFeet || undefined },
			mapStore.mode
		);
		for (const pos of positions) {
			courseStore.addCone({ id: generateId(), type: 'regular', lngLat: pos, lockedTargetId: null });
		}
		slalomStart = null;
		slalomEnd = null;
		showSlalomDialog = false;
	}

	function handleSlalomCancel() {
		slalomStart = null;
		slalomEnd = null;
		showSlalomDialog = false;
		toolStore.clearStatus();
	}

	function handleNoteConfirm(text: string) {
		if (!pendingNoteLngLat) return;
		courseStore.pushUndo();
		courseStore.addNote({
			id: generateId(),
			number: nextNoteNumber++,
			text,
			lngLat: pendingNoteLngLat
		});
		pendingNoteLngLat = null;
	}

	function handleNoteCancel() {
		pendingNoteLngLat = null;
	}

	function handleScaleClick(lngLat: LngLat) {
		if (!scalePoint1) {
			scalePoint1 = lngLat;
			const map = mapStore.map!;
			const el = document.createElement('div');
			el.className = 'measurement-endpoint';
			scalePoint1Marker = createMarker({ element: el })
				.setLngLat(lngLat as [number, number])
				.addTo(map);
			toolStore.setStatus('Click the second point to set scale');
		} else {
			const dx = lngLat[0] - scalePoint1[0];
			const dy = lngLat[1] - scalePoint1[1];
			scalePixelDist = Math.sqrt(dx * dx + dy * dy);
			showScaleDialog = true;
			scalePoint1 = null;
			scalePoint1Marker?.remove();
			scalePoint1Marker = null;
			toolStore.clearStatus();
		}
	}

	function handleScaleConfirm(feetPerPixel: number) {
		const map = mapStore.map;
		if (map && 'setScale' in map) {
			map.setScale(feetPerPixel);
		}
		showScaleDialog = false;
		toolStore.setStatus(`Scale: ${feetPerPixel.toFixed(4)} ft/px`);
	}

	function handleScaleCancel() {
		showScaleDialog = false;
		scalePoint1 = null;
		scalePoint1Marker?.remove();
		scalePoint1Marker = null;
		toolStore.clearStatus();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function handleDblClick(e: any) {
		if (toolStore.activeTool === 'staging-area') {
			stagingPolygonOverlay?.handleDoubleClick(e);
		}
		if (toolStore.activeTool === 'worker-zone') {
			workerZonePolygonOverlay?.handleDoubleClick(e);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function handleMouseMove(e: any) {
		mousePos = [e.lngLat.lng, e.lngLat.lat];
		stagingPolygonOverlay?.handleMouseMove(e);
		workerZonePolygonOverlay?.handleMouseMove(e);
	}

	function updateMarkerScale() {
		const z = mapStore.zoom;
		const scale = Math.pow(2, z - BASE_ZOOM) * 0.1 * mapStore.markerSize;
		container?.style.setProperty('--marker-scale', String(scale));
	}

	// Box selection for select tool
	let isBoxSelecting = false;

	// Right-click pan in sketch mode
	let isRightClickPanning = false;
	let rightClickPanStart: { x: number; y: number } | null = null;

	function initSketchPan() {
		const canvasContainer = container.querySelector('.mapboxgl-canvas-container') as HTMLElement | null;
		if (!canvasContainer) return;

		canvasContainer.addEventListener('contextmenu', (e) => {
			e.preventDefault();
		});

		canvasContainer.addEventListener('mousedown', (e) => {
			if (e.button !== 2) return;
			isRightClickPanning = true;
			rightClickPanStart = { x: e.clientX, y: e.clientY };
			canvasContainer.style.cursor = 'grabbing';
		});

		canvasContainer.addEventListener('mousemove', (e) => {
			if (!isRightClickPanning || !rightClickPanStart) return;
			const dx = e.clientX - rightClickPanStart.x;
			const dy = e.clientY - rightClickPanStart.y;
			(mapStore.map as mapboxgl.Map).panBy([-dx, -dy], { duration: 0 });
			rightClickPanStart = { x: e.clientX, y: e.clientY };
		});

		canvasContainer.addEventListener('mouseup', (e) => {
			if (e.button !== 2) return;
			isRightClickPanning = false;
			rightClickPanStart = null;
			canvasContainer.style.cursor = '';
		});
	}

	function initBoxSelection() {
		container.addEventListener('mousedown', (e) => {
			if (toolStore.activeTool !== 'select' || e.button !== 0) return;
			const target = e.target as HTMLElement;
			if (target.closest('.cone-marker,.worker-marker,.obstacle-marker,.note-marker,.measurement-endpoint,.outline-endpoint,.outline-control,.resize-handle,.rotate-handle,.mapboxgl-ctrl,.mapboxgl-marker')) return;

			e.preventDefault();
			isBoxSelecting = true;
			selectionStore.startBox(e.clientX, e.clientY);

			const map = mapStore.map;
			if (map && 'dragPan' in map) (map as mapboxgl.Map).dragPan.disable();

			const onMove = (ev: MouseEvent) => {
				if (!isBoxSelecting) return;
				selectionStore.updateBox(ev.clientX, ev.clientY);
			};

			const onUp = () => {
				if (!isBoxSelecting) return;
				isBoxSelecting = false;
				selectionStore.endBox();
				if (map && 'dragPan' in map) (map as mapboxgl.Map).dragPan.enable();
				document.removeEventListener('mousemove', onMove);
				document.removeEventListener('mouseup', onUp);

				const rect = selectionStore.boxRect;
				if (rect.width < 5 && rect.height < 5) return;

				selectionStore.clear();
				const mapEl = map as mapboxgl.Map;
				const containerRect = container.getBoundingClientRect();

				function inBox(lngLat: [number, number]): boolean {
					const pt = mapEl.project(lngLat);
					const sx = pt.x + containerRect.left;
					const sy = pt.y + containerRect.top;
					return sx >= rect.x && sx <= rect.x + rect.width && sy >= rect.y && sy <= rect.y + rect.height;
				}

				for (const cone of courseStore.course.cones) {
					if (inBox(cone.lngLat as [number, number])) selectionStore.select('cone', cone.id);
				}
				for (const w of courseStore.course.workers) {
					if (inBox(w.lngLat as [number, number])) selectionStore.select('worker', w.id);
				}
				courseStore.course.measurements.forEach((m, i) => {
					if (inBox(m.p1 as [number, number]) || inBox(m.p2 as [number, number])) {
						selectionStore.select('measurement', String(i));
					}
				});
				courseStore.course.courseOutline.forEach((seg, i) => {
					if (inBox(seg.p1 as [number, number]) || inBox(seg.p2 as [number, number])) {
						selectionStore.select('outline', String(i));
					}
				});
			};

			document.addEventListener('mousemove', onMove);
			document.addEventListener('mouseup', onUp);
		});
	}

	$effect(() => {
		const _size = mapStore.markerSize;
		updateMarkerScale();
	});

	$effect(() => {
		const fade = mapStore.mapFade;
		const _map = mapStore.map;
		if (!container) return;
		const canvas = container.querySelector('canvas.mapboxgl-canvas') as HTMLCanvasElement | null;
		if (canvas) {
			if (fade === 0) {
				canvas.style.filter = '';
			} else {
				const sat = 100 - fade;
				const bright = Math.max(20, 100 - fade * 0.8);
				canvas.style.filter = `saturate(${sat}%) brightness(${bright}%)`;
			}
		}
	});

	$effect(() => {
		const _tool = toolStore.activeTool;
		gateCenter = null;
		if (!showSlalomDialog) {
			slalomStart = null;
			slalomEnd = null;
		}
		scalePoint1 = null;
		scalePoint1Marker?.remove();
		scalePoint1Marker = null;
		measurementOverlay?.cancelPending();
		outlineOverlay?.cancelPending();
		if (toolStore.activeTool !== 'hazard-line') {
			hazardLinePoints = [];
		}
	});

	// Autosave on course changes
	$effect(() => {
		const _cones = courseStore.course.cones.length;
		const _workers = courseStore.course.workers.length;
		const _notes = courseStore.course.notes.length;
		const _waypoints = courseStore.course.drivingLine.length;
		autosave(courseStore.course);
	});

	function handleModeSelect(mode: 'map' | 'image', imageSrc?: string, _fileName?: string) {
		// Load autosaved course if available
		const saved = loadAutosave();
		if (saved) {
			courseStore.load(deserialize(saved));
		}
		showBanner = false;
		mapStore.setMode(mode);

		if (mode === 'image' && imageSrc) {
			initImageMode(imageSrc);
		} else {
			initMapMode();
		}
	}

	function initMapMode() {
		const token = import.meta.env.VITE_MAPBOX_TOKEN;
		if (!token) {
			console.error('VITE_MAPBOX_TOKEN not set');
			return;
		}

		mapboxgl.accessToken = token;
		mapboxgl.workerUrl = '/mapbox-gl-csp-worker.js';

		const map = new mapboxgl.Map({
			container,
			style: 'mapbox://styles/mapbox/satellite-streets-v12',
			center: courseStore.course.mapCenter as [number, number],
			zoom: courseStore.course.mapZoom,
			minZoom: 10,
			maxZoom: 22,
			preserveDrawingBuffer: true,
			dragRotate: false,
			pitchWithRotate: false,
			touchPitch: false
		});

		map.doubleClickZoom.disable();
		map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

		map.addControl(new MapboxGeocoder({
			accessToken: token,
			mapboxgl: mapboxgl as never,
			collapsed: true,
			placeholder: 'Search location...'
		}), 'top-right');

		map.on('load', () => {
			mapStore.setMap(map);
			initBoxSelection();
			initSketchPan();
			if (sessionStorage.getItem('fitCourseOnLoad')) {
				sessionStorage.removeItem('fitCourseOnLoad');
				setTimeout(() => fitBoundsToCourse(), 100);
			}
			document.addEventListener('keydown', (e) => {
				if (e.key === 'Delete' || e.key === 'Backspace') {
					sketchOverlay?.deleteSelected();
				}
			});
		});

		map.on('zoom', () => {
			mapStore.setZoom(map.getZoom());
			updateMarkerScale();
		});

		map.on('click', handleClick);
		map.on('mousemove', handleMouseMove);
		map.on('dblclick', handleDblClick);
		map.on('mousedown', (e: mapboxgl.MapMouseEvent) => sketchOverlay?.handleMouseDown(e));
		map.on('mousemove', (e: mapboxgl.MapMouseEvent) => sketchOverlay?.handleMouseMove(e));
		map.on('mouseup', () => sketchOverlay?.handleMouseUp());
		map.on('click', (e: mapboxgl.MapMouseEvent) => sketchOverlay?.handleClick(e));

		map.on('moveend', () => {
			const center = map.getCenter();
			courseStore.setMapView([center.lng, center.lat], map.getZoom());
		});
	}

	function initImageMode(imageSrc: string) {
		const imageMap = new ImageMap(container, imageSrc);

		imageMap.on('load', () => {
			mapStore.setMap(imageMap);
			toolStore.setTool('scale');
			toolStore.setStatus('Calibrate: click two points with a known distance');
		});

		imageMap.on('zoom', () => {
			mapStore.setZoom(imageMap.getZoom());
			updateMarkerScale();
		});

		imageMap.on('click', handleClick);
		imageMap.on('mousemove', handleMouseMove);
		imageMap.on('mousedown', (e: any) => sketchOverlay?.handleMouseDown(e));
		imageMap.on('mousemove', (e: any) => sketchOverlay?.handleMouseMove(e));
		imageMap.on('mouseup', () => sketchOverlay?.handleMouseUp());
		imageMap.on('click', (e: any) => sketchOverlay?.handleClick(e));

		imageMap.on('move', () => {
			const center = imageMap.getCenter();
			courseStore.setMapView([center.lng, center.lat], imageMap.getZoom());
		});

		document.addEventListener('keydown', (e) => {
			if (e.key === 'Delete' || e.key === 'Backspace') {
				sketchOverlay?.deleteSelected();
			}
		});
	}

	export function fitBoundsToCourse(data?: import('$lib/types/course').CourseData) {
		const map = mapStore.map;
		if (!map || !('fitBounds' in map)) return;

		const course = data ?? courseStore.course;
		const points: LngLat[] = [];
		for (const c of course.cones) points.push(c.lngLat);
		for (const wp of course.drivingLine) points.push(wp.lngLat);
		for (const m of course.measurements) { points.push(m.p1); points.push(m.p2); }
		for (const n of course.notes) points.push(n.lngLat);
		for (const w of course.workers) points.push(w.lngLat);
		for (const s of course.courseOutline) { points.push(s.p1); points.push(s.p2); }
		for (const sk of (course.sketches ?? [])) {
			for (const p of sk.points) points.push(p);
		}

		if (points.length === 0) return;

		// Filter outliers: remove points far from the median cluster
		const lngs = points.map(p => p[0]).sort((a, b) => a - b);
		const lats = points.map(p => p[1]).sort((a, b) => a - b);
		const medLng = lngs[Math.floor(lngs.length / 2)];
		const medLat = lats[Math.floor(lats.length / 2)];
		const filtered = points.filter(p =>
			Math.abs(p[0] - medLng) < 1 && Math.abs(p[1] - medLat) < 1
		);
		const fitPoints = filtered.length > 0 ? filtered : points;

		let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
		for (const [lng, lat] of fitPoints) {
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

	onMount(() => {
		return () => {
			mapStore.map?.remove();
		};
	});
</script>

<div class="map-outer">
	<div class="map-container" bind:this={container}></div>

	{#if showBanner}
		<ModeBanner onselect={handleModeSelect} />
	{/if}

	{#if mapStore.map}
		{#if layerStore.isVisible('cones')}
			{#each courseStore.course.cones as cone (cone.id)}
				<ConeMarker {cone} />
			{/each}
		{/if}
		{#if layerStore.isVisible('workers')}
			{#each courseStore.course.workers as worker (worker.id)}
				<WorkerMarker {worker} />
			{/each}
		{/if}
		{#if layerStore.isVisible('notes')}
			{#each courseStore.course.notes as note (note.id)}
				<NoteMarker {note} />
			{/each}
		{/if}
		{#if layerStore.isVisible('drivingLine')}
			<DrivingLine />
		{/if}
		{#if layerStore.isVisible('measurements')}
			<MeasurementOverlay bind:this={measurementOverlay} />
		{/if}
		{#if layerStore.isVisible('courseOutline')}
			<OutlineOverlay bind:this={outlineOverlay} />
		{/if}
		<GridOverlay bind:this={gridOverlay} />
		{#if layerStore.isVisible('sketches')}
			<SketchOverlay bind:this={sketchOverlay} />
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
		{#if layerStore.isVisible('coneNumbers')}
			<ConeNumberOverlay />
		{/if}
		<PolygonOverlay
			bind:this={stagingPolygonOverlay}
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
		<PolygonOverlay
			bind:this={workerZonePolygonOverlay}
			activeTools={['worker-zone']}
			fillColor="#ff6b6b"
			fillOpacity={0.1}
			strokeColor="#ff6b6b"
			strokeDasharray={[6, 3]}
			onComplete={(vertices) => {
				const nextStation = Math.max(0, ...courseStore.course.workerZones.map(z => z.stationNumber)) + 1;
				courseStore.addWorkerZone({
					id: generateId(),
					vertices,
					stationNumber: nextStation
				});
			}}
		/>
	{/if}
</div>

{#if previewFrom && mousePos}
	<PreviewLine from={previewFrom} to={mousePos} />
{/if}

{#if showSlalomDialog && slalomStart && slalomEnd}
	<SlalomDialog
		start={slalomStart}
		end={slalomEnd}
		onconfirm={handleSlalomConfirm}
		oncancel={handleSlalomCancel}
	/>
{/if}

{#if pendingNoteLngLat}
	<NoteDialog onconfirm={handleNoteConfirm} oncancel={handleNoteCancel} />
{/if}

{#if showScaleDialog}
	<ScaleDialog
		pixelDistance={scalePixelDist}
		onconfirm={handleScaleConfirm}
		oncancel={handleScaleCancel}
	/>
{/if}

{#if selectionStore.boxActive}
	{@const r = selectionStore.boxRect}
	<div class="selection-box" style="left:{r.x}px;top:{r.y}px;width:{r.width}px;height:{r.height}px"></div>
{/if}

<style>
	.map-outer {
		flex: 1;
		position: relative;
		--marker-scale: 1;
	}

	.map-container {
		position: absolute;
		inset: 0;
	}

	.map-container :global(.mapboxgl-canvas-container) {
		cursor: crosshair;
		z-index: 2;
	}

	.map-container :global(.mapboxgl-ctrl-geocoder) {
		background: var(--bg-surface);
		color: var(--text-primary);
		border: 1px solid var(--border);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.map-container :global(.mapboxgl-ctrl-geocoder input) {
		color: var(--text-primary);
	}

	.map-container :global(.mapboxgl-ctrl-geocoder .suggestions) {
		background: var(--bg-surface);
		border-color: var(--border);
	}

	.map-container :global(.mapboxgl-ctrl-geocoder .suggestions > li > a) {
		color: var(--text-secondary);
	}

	.map-container :global(.mapboxgl-ctrl-geocoder .suggestions > .active > a),
	.map-container :global(.mapboxgl-ctrl-geocoder .suggestions > li > a:hover) {
		background: var(--bg-hover);
		color: var(--text-primary);
	}
</style>
