<script lang="ts">
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import type { LngLat } from '$lib/types/course';

	let { from, to }: { from: LngLat; to: LngLat } = $props();

	let x1 = $state(0);
	let y1 = $state(0);
	let x2 = $state(0);
	let y2 = $state(0);

	$effect(() => {
		const map = mapStore.map;
		if (!map) return;
		const p1 = map.project(from as [number, number]);
		const p2 = map.project(to as [number, number]);
		const containerEl = map.getContainer?.();
		const rect = containerEl?.getBoundingClientRect();
		const offsetX = rect?.left ?? 0;
		const offsetY = rect?.top ?? 0;
		x1 = p1.x + offsetX;
		y1 = p1.y + offsetY;
		x2 = p2.x + offsetX;
		y2 = p2.y + offsetY;
	});
</script>

<svg class="preview-line-svg">
	<line {x1} {y1} {x2} {y2} stroke="#3b82f6" stroke-width="2" stroke-dasharray="6,4" />
</svg>

<style>
	.preview-line-svg {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 15;
		pointer-events: none;
	}
</style>
