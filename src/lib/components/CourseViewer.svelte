<script lang="ts">
	import mapboxgl from 'mapbox-gl';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { layerStore } from '$lib/stores/layerStore.svelte';
	import { saveLocal } from '$lib/services/courseService';
	import ConeMarker from './ConeMarker.svelte';
	import WorkerMarker from './WorkerMarker.svelte';
	import NoteMarker from './NoteMarker.svelte';
	import DrivingLine from './DrivingLine.svelte';
	import MeasurementOverlay from './MeasurementOverlay.svelte';
	import OutlineOverlay from './OutlineOverlay.svelte';
	import StagingOverlay from './StagingOverlay.svelte';
	import WorkerZoneOverlay from './WorkerZoneOverlay.svelte';
	import HazardOverlay from './HazardOverlay.svelte';

	let { title }: { title: string } = $props();

	let container: HTMLDivElement;

	const toggleableLayers = [
		{ key: 'cones' as const, label: 'Cones' },
		{ key: 'workers' as const, label: 'Workers' },
		{ key: 'notes' as const, label: 'Notes' },
		{ key: 'drivingLine' as const, label: 'Driving Line' },
		{ key: 'measurements' as const, label: 'Measurements' },
		{ key: 'courseOutline' as const, label: 'Course Outline' },
		{ key: 'stagingAreas' as const, label: 'Staging Areas' },
		{ key: 'workerZones' as const, label: 'Worker Zones' },
		{ key: 'safetyZones' as const, label: 'Safety Zones' }
	];

	function editCopy() {
		const name = `${title} (copy)`;
		saveLocal(name, courseStore.course);
		sessionStorage.setItem('fitCourseOnLoad', 'true');
		goto('/');
	}

	onMount(() => {
		const token = import.meta.env.VITE_MAPBOX_TOKEN;
		mapboxgl.accessToken = token;
		mapboxgl.workerUrl = '/mapbox-gl-csp-worker.js';

		const map = new mapboxgl.Map({
			container,
			style: 'mapbox://styles/mapbox/satellite-streets-v12',
			center: [0, 0],
			zoom: 2,
			minZoom: 10,
			maxZoom: 22,
			preserveDrawingBuffer: true,
			dragRotate: false,
			pitchWithRotate: false,
			touchPitch: false
		});

		map.addControl(new mapboxgl.NavigationControl(), 'top-left');

		map.on('load', () => {
			mapStore.setMap(map);
			mapStore.setMode('map');

			// Read course data here to guarantee it's loaded
			const course = courseStore.course;
			const pts: [number, number][] = [];
			for (const c of course.cones) pts.push(c.lngLat as [number, number]);
			for (const wp of course.drivingLine) pts.push(wp.lngLat as [number, number]);
			for (const w of course.workers) pts.push(w.lngLat as [number, number]);
			for (const n of course.notes) pts.push(n.lngLat as [number, number]);
			for (const m of course.measurements) { pts.push(m.p1 as [number, number]); pts.push(m.p2 as [number, number]); }

			if (pts.length > 0) {
				let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
				for (const [lng, lat] of pts) {
					if (lng < minLng) minLng = lng;
					if (lng > maxLng) maxLng = lng;
					if (lat < minLat) minLat = lat;
					if (lat > maxLat) maxLat = lat;
				}
				map.fitBounds(
					[[minLng, minLat], [maxLng, maxLat]],
					{ padding: 80, maxZoom: 19, animate: false }
				);
			} else {
				// No course elements, use saved map center
				map.jumpTo({ center: course.mapCenter as [number, number], zoom: course.mapZoom });
			}

			layerStore.setVisible('sketches', false);
		});

		return () => {
			map?.remove();
		};
	});
</script>

<div class="viewer">
	<div class="map-container" bind:this={container}></div>

	<div class="course-title">{title}</div>

	<div class="layer-toggles">
		{#each toggleableLayers as layer}
			<label>
				<input
					type="checkbox"
					checked={layerStore.isVisible(layer.key)}
					onchange={() => layerStore.toggle(layer.key)}
				/>
				{layer.label}
			</label>
		{/each}
	</div>

	<button class="edit-copy-btn" onclick={editCopy}>Edit a Copy</button>

	{#if mapStore.map}
		{#if layerStore.isVisible('cones')}
			{#each courseStore.course.cones as cone (cone.id)}
				<ConeMarker {cone} readonly={true} />
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
			<MeasurementOverlay />
		{/if}
		{#if layerStore.isVisible('courseOutline')}
			<OutlineOverlay />
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
	{/if}
</div>

<style>
	.viewer {
		width: 100%;
		height: 100vh;
		position: relative;
	}

	.map-container {
		width: 100%;
		height: 100%;
	}

	.course-title {
		position: absolute;
		top: 10px;
		left: 50px;
		background: rgba(0, 0, 0, 0.7);
		color: #eee;
		border-radius: 6px;
		padding: 6px 12px;
		z-index: 1;
	}

	.layer-toggles {
		position: absolute;
		top: 10px;
		right: 10px;
		background: rgba(0, 0, 0, 0.7);
		border-radius: 6px;
		padding: 8px 12px;
		font-size: 12px;
		color: #eee;
		display: flex;
		flex-direction: column;
		gap: 4px;
		z-index: 1;
	}

	.layer-toggles label {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
	}

	.edit-copy-btn {
		position: absolute;
		bottom: 20px;
		right: 20px;
		background: #e94560;
		color: white;
		border: none;
		padding: 10px 20px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: bold;
		cursor: pointer;
		z-index: 1;
	}

	.edit-copy-btn:hover {
		background: #d63851;
	}
</style>
