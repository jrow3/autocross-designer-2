<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { pointBuffer, lineBuffer } from '$lib/engine/bufferGeometry';

	const BUFFER_SOURCE = 'hazard-buffer-source';
	const MARKER_SOURCE = 'hazard-marker-source';
	const BUFFER_FILL_LAYER = 'hazard-buffer-fill';
	const BUFFER_LINE_LAYER = 'hazard-buffer-line';
	const MARKER_POINT_LAYER = 'hazard-marker-points';
	const MARKER_LINE_LAYER = 'hazard-marker-lines';

	function buildBufferGeoJSON() {
		return {
			type: 'FeatureCollection' as const,
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

	function buildMarkerGeoJSON() {
		return {
			type: 'FeatureCollection' as const,
			features: courseStore.course.hazardMarkers.map((marker) => {
				if (marker.type === 'point') {
					return {
						type: 'Feature' as const,
						geometry: {
							type: 'Point' as const,
							coordinates: marker.coordinates[0]
						},
						properties: {}
					};
				} else {
					return {
						type: 'Feature' as const,
						geometry: {
							type: 'LineString' as const,
							coordinates: marker.coordinates
						},
						properties: {}
					};
				}
			})
		};
	}

	function updateSources() {
		const map = mapStore.map;
		if (!map) return;
		const bufferSource = map.getSource(BUFFER_SOURCE) as mapboxgl.GeoJSONSource | undefined;
		if (bufferSource) bufferSource.setData(buildBufferGeoJSON());
		const markerSource = map.getSource(MARKER_SOURCE) as mapboxgl.GeoJSONSource | undefined;
		if (markerSource) markerSource.setData(buildMarkerGeoJSON());
	}

	$effect(() => {
		const _markers = courseStore.course.hazardMarkers.length;
		updateSources();
	});

	onMount(() => {
		const map = mapStore.map;
		if (!map) return;

		map.addSource(BUFFER_SOURCE, { type: 'geojson', data: buildBufferGeoJSON() });
		map.addSource(MARKER_SOURCE, { type: 'geojson', data: buildMarkerGeoJSON() });

		map.addLayer({
			id: BUFFER_FILL_LAYER,
			type: 'fill',
			source: BUFFER_SOURCE,
			paint: {
				'fill-color': '#ff0000',
				'fill-opacity': 0.15
			}
		});

		map.addLayer({
			id: BUFFER_LINE_LAYER,
			type: 'line',
			source: BUFFER_SOURCE,
			paint: {
				'line-color': '#ff0000',
				'line-width': 1,
				'line-dasharray': [4, 3]
			}
		});

		map.addLayer({
			id: MARKER_POINT_LAYER,
			type: 'circle',
			source: MARKER_SOURCE,
			filter: ['==', '$type', 'Point'],
			paint: {
				'circle-radius': 5,
				'circle-color': '#ff0000',
				'circle-stroke-width': 2,
				'circle-stroke-color': '#ffffff'
			}
		});

		map.addLayer({
			id: MARKER_LINE_LAYER,
			type: 'line',
			source: MARKER_SOURCE,
			filter: ['==', '$type', 'LineString'],
			paint: {
				'line-color': '#ff0000',
				'line-width': 3
			}
		});
	});

	onDestroy(() => {
		const map = mapStore.map;
		if (!map) return;
		try {
			if (map.getLayer(MARKER_LINE_LAYER)) map.removeLayer(MARKER_LINE_LAYER);
			if (map.getLayer(MARKER_POINT_LAYER)) map.removeLayer(MARKER_POINT_LAYER);
			if (map.getLayer(BUFFER_LINE_LAYER)) map.removeLayer(BUFFER_LINE_LAYER);
			if (map.getLayer(BUFFER_FILL_LAYER)) map.removeLayer(BUFFER_FILL_LAYER);
			if (map.getSource(MARKER_SOURCE)) map.removeSource(MARKER_SOURCE);
			if (map.getSource(BUFFER_SOURCE)) map.removeSource(BUFFER_SOURCE);
		} catch (_) {}
	});
</script>
