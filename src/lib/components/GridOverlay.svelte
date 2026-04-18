<script lang="ts">
	import { onMount } from 'svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { drawGrid, metersPerPixel } from '$lib/engine/gridRenderer';

	let anchorLngLat: [number, number] | null = null;
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;

	function resize() {
		if (!canvas) return;
		const parent = canvas.parentElement;
		if (parent) {
			canvas.width = parent.clientWidth;
			canvas.height = parent.clientHeight;
		}
		redraw();
	}

	function redraw() {
		if (!mapStore.gridActive || !ctx) return;
		const map = mapStore.map;
		if (!map) return;

		if (!anchorLngLat) {
			const center = map.getCenter();
			anchorLngLat = [center.lng, center.lat];
		}

		const anchor = map.project(anchorLngLat);
		const bearing = map.getBearing?.() ?? 0;
		const lat = anchorLngLat[1];
		const zoom = map.getZoom();

		drawGrid(ctx, {
			anchorX: anchor.x,
			anchorY: anchor.y,
			rotationDeg: mapStore.gridRotation - bearing,
			canvasWidth: canvas.width,
			canvasHeight: canvas.height,
			metersPerPixel: metersPerPixel(lat, zoom),
			lineMode: mapStore.gridLineMode,
			cellSizeM: mapStore.gridSpacingFt * 0.3048
		});
	}

	$effect(() => {
		const _active = mapStore.gridActive;
		const _spacing = mapStore.gridSpacingFt;
		const _rotation = mapStore.gridRotation;
		const _mode = mapStore.gridLineMode;
		if (_active && !anchorLngLat) {
			const map = mapStore.map;
			if (map) {
				const center = map.getCenter();
				anchorLngLat = [center.lng, center.lat];
			}
		}
		redraw();
	});

	onMount(() => {
		const map = mapStore.map;
		if (!map || !canvas) return;

		ctx = canvas.getContext('2d');
		resize();

		map.on('move', redraw);
		map.on('zoom', redraw);
		window.addEventListener('resize', resize);

		return () => {
			map.off('move', redraw);
			map.off('zoom', redraw);
			window.removeEventListener('resize', resize);
		};
	});
</script>

<canvas
	class="grid-canvas"
	class:hidden={!mapStore.gridActive}
	bind:this={canvas}
></canvas>

<style>
	.grid-canvas {
		position: absolute;
		inset: 0;
		z-index: 1;
		pointer-events: none;
	}

	.hidden {
		display: none;
	}
</style>
