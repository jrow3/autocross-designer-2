<script lang="ts">
	import { createMarker, wrapForMapbox, type AnyMarker } from '$lib/engine/markerFactory';
	import { onMount } from 'svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { catmullRomSpline } from '$lib/engine/catmullRom';
	import type { LngLat } from '$lib/types/course';

	const SOURCE_ID = 'driving-line-source';
	const LAYER_ID = 'driving-line-layer';

	let markers: AnyMarker[] = [];

	function buildGeoJSON() {
		const coords = courseStore.course.drivingLine.map((wp) => wp.lngLat);
		const smoothed = coords.length >= 2 ? catmullRomSpline(coords, 20) : coords;
		return {
			type: 'FeatureCollection' as const,
			features: [
				{
					type: 'Feature' as const,
					geometry: {
						type: 'LineString' as const,
						coordinates: smoothed
					},
					properties: {}
				}
			]
		};
	}

	function updateLine() {
		const map = mapStore.map;
		if (!map) return;
		const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
		if (source) {
			source.setData(buildGeoJSON());
		}
	}

	function createWaypointMarker(index: number, lngLat: LngLat): AnyMarker {
		const map = mapStore.map!;
		const el = document.createElement('div');
		el.className = 'waypoint-marker';
		const wrapper = wrapForMapbox(el);

		const marker = createMarker({ element: wrapper, draggable: true })
			.setLngLat(lngLat as [number, number])
			.addTo(map);

		marker.on('dragstart', () => {
			courseStore.pushUndo();
		});

		marker.on('drag', () => {
			const pos = marker.getLngLat();
			courseStore.updateWaypointPosition(index, [pos.lng, pos.lat]);
			updateLine();
		});

		marker.on('dragend', () => {
			const pos = marker.getLngLat();
			courseStore.updateWaypointPosition(index, [pos.lng, pos.lat]);
			updateLine();
		});

		el.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			courseStore.pushUndo();
			courseStore.removeWaypoint(index);
			rebuildMarkers();
			updateLine();
		});

		return marker;
	}

	function rebuildMarkers() {
		const map = mapStore.map;
		if (!map) return;

		for (const m of markers) m.remove();
		markers = [];

		courseStore.course.drivingLine.forEach((wp, i) => {
			markers.push(createWaypointMarker(i, wp.lngLat));
		});
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
				'line-color': '#60a5fa',
				'line-width': 3,
				'line-dasharray': [2, 2]
			}
		});

		rebuildMarkers();

		return () => {
			for (const m of markers) m.remove();
			if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
			if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
		};
	});

	$effect(() => {
		const _waypoints = courseStore.course.drivingLine.length;
		rebuildMarkers();
		updateLine();
	});
</script>

<style>
	:global(.waypoint-marker) {
		width: 12px;
		height: 12px;
		background: #60a5fa;
		border: 2px solid #fff;
		border-radius: 50%;
		cursor: pointer;
		transform: scale(var(--marker-scale, 1));
	}
</style>
