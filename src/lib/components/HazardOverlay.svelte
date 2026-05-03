<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { pointBuffer, lineBuffer } from '$lib/engine/bufferGeometry';
	import type mapboxgl from 'mapbox-gl';

	const BUFFER_SOURCE = 'hazard-buffer-source';
	const MARKER_SOURCE = 'hazard-marker-source';
	const BUFFER_FILL_LAYER = 'hazard-buffer-fill';
	const BUFFER_LINE_LAYER = 'hazard-buffer-line';
	const MARKER_POINT_LAYER = 'hazard-marker-points';
	const MARKER_LINE_LAYER = 'hazard-marker-lines';

	function buildBufferGeoJSON(): GeoJSON.FeatureCollection {
		return {
			type: 'FeatureCollection',
			features: courseStore.course.hazardMarkers.map((marker) => {
				const ring =
					marker.type === 'point'
						? pointBuffer(marker.coordinates[0], marker.bufferFeet)
						: lineBuffer(marker.coordinates, marker.bufferFeet);
				return {
					type: 'Feature' as const,
					geometry: {
						type: 'Polygon' as const,
						coordinates: [[...ring, ring[0]]]
					},
					properties: {}
				};
			})
		};
	}

	function buildMarkerGeoJSON(): GeoJSON.FeatureCollection {
		return {
			type: 'FeatureCollection',
			features: courseStore.course.hazardMarkers.map((marker) => {
				if (marker.type === 'point') {
					return {
						type: 'Feature' as const,
						geometry: { type: 'Point' as const, coordinates: marker.coordinates[0] },
						properties: {}
					};
				} else {
					return {
						type: 'Feature' as const,
						geometry: { type: 'LineString' as const, coordinates: marker.coordinates },
						properties: {}
					};
				}
			})
		};
	}

	let layersAdded = false;

	function ensureLayers() {
		const map = mapStore.map as mapboxgl.Map | null;
		if (!map || layersAdded) return;
		if (typeof map.getSource !== 'function') return;
		if (map.getSource(BUFFER_SOURCE)) { layersAdded = true; return; }

		try {
			map.addSource(BUFFER_SOURCE, { type: 'geojson', data: buildBufferGeoJSON() });
			map.addSource(MARKER_SOURCE, { type: 'geojson', data: buildMarkerGeoJSON() });

			map.addLayer({
				id: BUFFER_FILL_LAYER, type: 'fill', source: BUFFER_SOURCE,
				paint: { 'fill-color': '#ff0000', 'fill-opacity': 0.15 }
			});
			map.addLayer({
				id: BUFFER_LINE_LAYER, type: 'line', source: BUFFER_SOURCE,
				paint: { 'line-color': '#ff0000', 'line-width': 1, 'line-dasharray': [4, 3] }
			});
			map.addLayer({
				id: MARKER_POINT_LAYER, type: 'circle', source: MARKER_SOURCE,
				filter: ['==', '$type', 'Point'],
				paint: { 'circle-radius': 5, 'circle-color': '#ff0000', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' }
			});
			map.addLayer({
				id: MARKER_LINE_LAYER, type: 'line', source: MARKER_SOURCE,
				filter: ['==', '$type', 'LineString'],
				paint: { 'line-color': '#ff0000', 'line-width': 3 }
			});
			layersAdded = true;
		} catch (_) {}
	}

	function updateSources() {
		const map = mapStore.map as mapboxgl.Map | null;
		if (!map || typeof map.getSource !== 'function') return;
		ensureLayers();
		const bufferSource = map.getSource(BUFFER_SOURCE) as mapboxgl.GeoJSONSource | undefined;
		if (bufferSource) bufferSource.setData(buildBufferGeoJSON());
		const markerSource = map.getSource(MARKER_SOURCE) as mapboxgl.GeoJSONSource | undefined;
		if (markerSource) markerSource.setData(buildMarkerGeoJSON());
	}

	$effect(() => {
		const _ = courseStore.course.hazardMarkers;
		updateSources();
	});

	onMount(() => {
		ensureLayers();
	});

	onDestroy(() => {
		const map = mapStore.map as mapboxgl.Map | null;
		if (!map || typeof map.getLayer !== 'function') return;
		try {
			for (const layer of [MARKER_LINE_LAYER, MARKER_POINT_LAYER, BUFFER_LINE_LAYER, BUFFER_FILL_LAYER]) {
				if (map.getLayer(layer)) map.removeLayer(layer);
			}
			for (const source of [MARKER_SOURCE, BUFFER_SOURCE]) {
				if (map.getSource(source)) map.removeSource(source);
			}
		} catch (_) {}
	});
</script>
