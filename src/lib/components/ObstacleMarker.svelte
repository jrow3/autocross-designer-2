<script lang="ts">
	import { onMount } from 'svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { getObstacleType } from '$lib/engine/obstacleTypes';
	import { createMarker, wrapForMapbox, type AnyMarker } from '$lib/engine/markerFactory';
	import { selectionStore } from '$lib/stores/selectionStore.svelte';
	import type { ObstacleData } from '$lib/types/course';

	let { obstacle }: { obstacle: ObstacleData } = $props();

	let marker: AnyMarker | null = null;
	let innerEl: HTMLDivElement | null = null;

	function createElement(type: string): HTMLDivElement {
		const config = getObstacleType(type);
		const el = document.createElement('div');
		el.className = 'obstacle-marker';
		el.title = config?.label ?? type;

		const symbol = document.createElement('span');
		symbol.className = 'obstacle-symbol';
		symbol.textContent = config?.symbol ?? '?';
		symbol.style.color = config?.color ?? '#ef4444';
		el.appendChild(symbol);

		return el;
	}

	onMount(() => {
		const map = mapStore.map;
		if (!map) return;

		const inner = createElement(obstacle.type);
		innerEl = inner;
		const wrapper = wrapForMapbox(inner);

		marker = createMarker({ element: wrapper, draggable: true })
			.setLngLat(obstacle.lngLat as [number, number])
			.addTo(map);

		marker.on('dragstart', () => {
			courseStore.pushUndo();
		});

		marker.on('dragend', () => {
			const pos = marker!.getLngLat();
			courseStore.updateObstaclePosition(obstacle.id, [pos.lng, pos.lat]);
		});

		wrapper.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			courseStore.pushUndo();
			courseStore.removeObstacle(obstacle.id);
		});

		return () => {
			marker?.remove();
		};
	});

	$effect(() => {
		if (marker) {
			const [lng, lat] = obstacle.lngLat;
			const current = marker.getLngLat();
			if (Math.abs(current.lng - lng) > 1e-8 || Math.abs(current.lat - lat) > 1e-8) {
				marker.setLngLat([lng, lat]);
			}
		}
	});

	$effect(() => {
		if (innerEl) {
			innerEl.classList.toggle('multi-selected', selectionStore.isSelected('obstacle', obstacle.id));
		}
	});
</script>

<style>
	:global(.obstacle-marker) {
		width: 22px;
		height: 22px;
		background: rgba(0, 0, 0, 0.7);
		border: 1px solid #475569;
		border-radius: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transform: scale(var(--marker-scale, 1));
	}

	:global(.obstacle-symbol) {
		font-size: 14px;
		line-height: 1;
	}
</style>
