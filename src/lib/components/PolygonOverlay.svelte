<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { toolStore } from '$lib/stores/toolStore.svelte';
	import type { LngLat } from '$lib/types/course';
	import type mapboxgl from 'mapbox-gl';
	import { polygonToGeoJSON, lineToGeoJSON, verticesCollection } from '$lib/engine/polygonEngine';

	const {
		activeTools,
		fillColor,
		fillOpacity,
		strokeColor,
		strokeDasharray,
		onComplete
	}: {
		activeTools: string[];
		fillColor: string;
		fillOpacity: number;
		strokeColor: string;
		strokeDasharray?: number[];
		onComplete: (vertices: LngLat[]) => void;
	} = $props();

	const prefix = crypto.randomUUID().slice(0, 8);
	const FILL_SOURCE = `${prefix}-fill-source`;
	const FILL_LAYER = `${prefix}-fill-layer`;
	const LINE_SOURCE = `${prefix}-line-source`;
	const LINE_LAYER = `${prefix}-line-layer`;
	const DOT_SOURCE = `${prefix}-dot-source`;
	const DOT_LAYER = `${prefix}-dot-layer`;

	let vertices = $state<LngLat[]>([]);
	let mousePos = $state<LngLat | null>(null);

	function isNearFirst(point: LngLat, e?: { point?: { x: number; y: number } }): boolean {
		if (vertices.length < 3) return false;

		// Method 1: query the rendered first-vertex dot on the map
		const map = mapStore.map;
		if (map && typeof map.queryRenderedFeatures === 'function' && e?.point) {
			try {
				const bbox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
					[e.point.x - 12, e.point.y - 12],
					[e.point.x + 12, e.point.y + 12]
				];
				const hits = map.queryRenderedFeatures(bbox, { layers: [DOT_LAYER] });
				if (hits.some((f: { properties?: { index?: number } }) => f.properties?.index === 0)) return true;
			} catch {}
		}

		// Method 2: coordinate distance fallback
		const [fx, fy] = vertices[0];
		const [px, py] = point;
		return Math.abs(px - fx) < 0.0005 && Math.abs(py - fy) < 0.0005;
	}

	function closePolygon() {
		if (vertices.length < 3) return;
		onComplete([...vertices]);
		vertices = [];
		mousePos = null;
		updateSources();
	}

	function updateSources() {
		const map = mapStore.map as mapboxgl.Map | null;
		if (!map) return;

		const previewVerts = mousePos ? [...vertices, mousePos] : [...vertices];

		const fillSource = map.getSource(FILL_SOURCE) as mapboxgl.GeoJSONSource | undefined;
		if (fillSource) {
			if (previewVerts.length >= 3) {
				fillSource.setData(polygonToGeoJSON(previewVerts));
			} else {
				fillSource.setData({ type: 'FeatureCollection', features: [] });
			}
		}

		const lineSource = map.getSource(LINE_SOURCE) as mapboxgl.GeoJSONSource | undefined;
		if (lineSource) {
			if (previewVerts.length >= 2) {
				lineSource.setData(lineToGeoJSON(previewVerts));
			} else {
				lineSource.setData({ type: 'FeatureCollection', features: [] });
			}
		}

		const dotSource = map.getSource(DOT_SOURCE) as mapboxgl.GeoJSONSource | undefined;
		if (dotSource) {
			dotSource.setData(verticesCollection(vertices));
		}
	}

	export function handleClick(e: { lngLat: { lng: number; lat: number }; point?: { x: number; y: number } }) {
		if (!activeTools.includes(toolStore.activeTool)) return;
		const point: LngLat = [e.lngLat.lng, e.lngLat.lat];

		if (isNearFirst(point, e)) {
			closePolygon();
			return;
		}

		vertices = [...vertices, point];
		updateSources();
	}

	export function handleDoubleClick(e: { lngLat: { lng: number; lat: number } }) {
		if (!activeTools.includes(toolStore.activeTool)) return;
		if (vertices.length >= 3) {
			closePolygon();
		}
	}

	export function handleMouseMove(e: { lngLat: { lng: number; lat: number } }) {
		if (!activeTools.includes(toolStore.activeTool)) return;
		mousePos = [e.lngLat.lng, e.lngLat.lat];
		updateSources();
	}

	onMount(() => {
		const map = mapStore.map as mapboxgl.Map | null;
		if (!map) return;

		const emptyCollection: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

		map.addSource(FILL_SOURCE, { type: 'geojson', data: emptyCollection });
		map.addSource(LINE_SOURCE, { type: 'geojson', data: emptyCollection });
		map.addSource(DOT_SOURCE, { type: 'geojson', data: emptyCollection });

		map.addLayer({
			id: FILL_LAYER,
			type: 'fill',
			source: FILL_SOURCE,
			paint: {
				'fill-color': fillColor,
				'fill-opacity': fillOpacity
			}
		});

		const linePaint: mapboxgl.LinePaint = {
			'line-color': strokeColor,
			'line-width': 2
		};
		if (strokeDasharray) {
			linePaint['line-dasharray'] = strokeDasharray;
		}

		map.addLayer({
			id: LINE_LAYER,
			type: 'line',
			source: LINE_SOURCE,
			paint: linePaint
		});

		map.addLayer({
			id: DOT_LAYER,
			type: 'circle',
			source: DOT_SOURCE,
			paint: {
				'circle-radius': ['case', ['==', ['get', 'index'], 0], 8, 5],
				'circle-color': ['case', ['==', ['get', 'index'], 0], '#ffffff', strokeColor],
				'circle-stroke-color': ['case', ['==', ['get', 'index'], 0], strokeColor, '#ffffff'],
				'circle-stroke-width': 2
			}
		});
	});

	onDestroy(() => {
		const map = mapStore.map as mapboxgl.Map | null;
		if (!map) return;

		for (const layer of [FILL_LAYER, LINE_LAYER, DOT_LAYER]) {
			if (map.getLayer(layer)) map.removeLayer(layer);
		}
		for (const source of [FILL_SOURCE, LINE_SOURCE, DOT_SOURCE]) {
			if (map.getSource(source)) map.removeSource(source);
		}
	});
</script>
