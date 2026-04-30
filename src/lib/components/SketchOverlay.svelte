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
