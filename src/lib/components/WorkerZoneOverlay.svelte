<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';

	const SOURCE_ID = 'worker-zones-source';
	const FILL_LAYER = 'worker-zones-fill';
	const LINE_LAYER = 'worker-zones-line';
	const LABEL_LAYER = 'worker-zones-label';

	const ZONE_COLORS = [
		'#ff6b6b', '#4ecdc4', '#a882ff', '#ffd93d', '#6bcb77',
		'#ff8fab', '#4cc9f0', '#f4a261', '#90be6d', '#c77dff'
	];

	function colorForStation(n: number): string {
		return ZONE_COLORS[(n - 1) % ZONE_COLORS.length];
	}

	function buildGeoJSON() {
		return {
			type: 'FeatureCollection' as const,
			features: courseStore.course.workerZones.map((zone) => {
				const coords = [...zone.vertices, zone.vertices[0]];
				return {
					type: 'Feature' as const,
					geometry: {
						type: 'Polygon' as const,
						coordinates: [coords]
					},
					properties: {
						label: `Station ${zone.stationNumber}`,
						color: colorForStation(zone.stationNumber)
					}
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
		const _len = courseStore.course.workerZones.length;
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
				'fill-color': ['get', 'color'],
				'fill-opacity': 0.1
			}
		});

		map.addLayer({
			id: LINE_LAYER,
			type: 'line',
			source: SOURCE_ID,
			paint: {
				'line-color': ['get', 'color'],
				'line-width': 2,
				'line-dasharray': [6, 3]
			}
		});

		map.addLayer({
			id: LABEL_LAYER,
			type: 'symbol',
			source: SOURCE_ID,
			layout: {
				'text-field': ['get', 'label'],
				'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
				'text-size': 13
			},
			paint: {
				'text-color': ['get', 'color'],
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
