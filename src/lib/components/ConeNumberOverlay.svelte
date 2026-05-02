<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';

	const SOURCE_ID = 'cone-numbers-source';
	const LAYER_ID = 'cone-numbers-label';

	function buildGeoJSON() {
		const numbers = courseStore.course.coneNumbers;
		const coneMap = new Map(courseStore.course.cones.map(c => [c.id, c]));

		return {
			type: 'FeatureCollection' as const,
			features: Object.entries(numbers)
				.filter(([id]) => coneMap.has(id))
				.map(([id, label]) => {
					const cone = coneMap.get(id)!;
					return {
						type: 'Feature' as const,
						geometry: {
							type: 'Point' as const,
							coordinates: cone.lngLat
						},
						properties: { label }
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
		const _numbers = courseStore.course.coneNumbers;
		const _cones = courseStore.course.cones.length;
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
			id: LAYER_ID,
			type: 'symbol',
			source: SOURCE_ID,
			layout: {
				'text-field': ['get', 'label'],
				'text-size': 12,
				'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
				'text-offset': [0, 1.5],
				'text-anchor': 'top'
			},
			paint: {
				'text-color': '#ffffff',
				'text-halo-color': '#000000',
				'text-halo-width': 1.5
			}
		});
	});

	onDestroy(() => {
		const map = mapStore.map;
		if (!map) return;
		try {
			if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
			if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
		} catch (_) {}
	});
</script>
