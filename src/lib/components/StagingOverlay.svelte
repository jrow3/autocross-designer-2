<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';

	const SOURCE_ID = 'staging-areas-source';
	const FILL_LAYER = 'staging-areas-fill';
	const LINE_LAYER = 'staging-areas-line';
	const LABEL_LAYER = 'staging-areas-label';

	function buildGeoJSON() {
		return {
			type: 'FeatureCollection' as const,
			features: courseStore.course.stagingAreas.map((area) => {
				const coords = [...area.vertices, area.vertices[0]];
				return {
					type: 'Feature' as const,
					geometry: {
						type: 'Polygon' as const,
						coordinates: [coords]
					},
					properties: { label: area.label }
				};
			})
		};
	}

	function updateSource() {
		const map = mapStore.map;
		if (!map) return;
		const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
		if (source) source.setData(buildGeoJSON());
	}

	$effect(() => {
		const _len = courseStore.course.stagingAreas.length;
		updateSource();
	});

	onMount(() => {
		const map = mapStore.map;
		if (!map) return;

		map.addSource(SOURCE_ID, {
			type: 'geojson',
			data: buildGeoJSON()
		});

		map.addLayer({
			id: FILL_LAYER,
			type: 'fill',
			source: SOURCE_ID,
			paint: {
				'fill-color': '#6495ED',
				'fill-opacity': 0.25
			}
		});

		map.addLayer({
			id: LINE_LAYER,
			type: 'line',
			source: SOURCE_ID,
			paint: {
				'line-color': '#6495ED',
				'line-width': 2
			}
		});

		map.addLayer({
			id: LABEL_LAYER,
			type: 'symbol',
			source: SOURCE_ID,
			layout: {
				'text-field': ['get', 'label'],
				'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
				'text-size': 14
			},
			paint: {
				'text-color': '#6495ED',
				'text-halo-color': '#000000',
				'text-halo-width': 1.5
			}
		});
	});

	onDestroy(() => {
		const map = mapStore.map;
		if (!map) return;
		try {
			if (map.getLayer(LABEL_LAYER)) map.removeLayer(LABEL_LAYER);
			if (map.getLayer(LINE_LAYER)) map.removeLayer(LINE_LAYER);
			if (map.getLayer(FILL_LAYER)) map.removeLayer(FILL_LAYER);
			if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
		} catch (_) {}
	});
</script>
