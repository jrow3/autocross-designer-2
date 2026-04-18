<script lang="ts">
	import { onMount } from 'svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { createMarker, type AnyMarker } from '$lib/engine/markerFactory';
	import type { LngLat } from '$lib/types/course';

	interface SegmentVisual {
		index: number;
		markers: [AnyMarker, AnyMarker, AnyMarker];
		svgEl: SVGSVGElement;
	}

	let visuals: SegmentVisual[] = [];
	let svgContainer: HTMLDivElement;
	let dragging = $state(false);

	let pendingPoint: LngLat | null = $state(null);
	let pendingMarker: AnyMarker | null = null;

	export function handleClick(lngLat: LngLat) {
		if (dragging) return;

		if (!pendingPoint) {
			pendingPoint = lngLat;
			const map = mapStore.map!;
			const el = document.createElement('div');
			el.className = 'outline-endpoint';
			pendingMarker = createMarker({ element: el })
				.setLngLat(lngLat as [number, number])
				.addTo(map);
		} else {
			const cp: LngLat = [
				(pendingPoint[0] + lngLat[0]) / 2,
				(pendingPoint[1] + lngLat[1]) / 2
			];
			courseStore.pushUndo();
			courseStore.addOutlineSegment({ p1: pendingPoint, p2: lngLat, cp });
			pendingMarker?.remove();
			pendingMarker = null;
			pendingPoint = null;
			rebuildVisuals();
		}
	}

	export function cancelPending() {
		pendingMarker?.remove();
		pendingMarker = null;
		pendingPoint = null;
	}

	function createSegmentVisual(index: number): SegmentVisual {
		const map = mapStore.map!;

		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
		svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;';
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('stroke', '#ffffff');
		path.setAttribute('stroke-width', '3');
		path.setAttribute('fill', 'none');
		svg.appendChild(path);
		svgContainer.appendChild(svg);

		function createEndpoint(endpoint: 0 | 1): mapboxgl.Marker {
			const seg = courseStore.course.courseOutline[index];
			const pos = endpoint === 0 ? seg.p1 : seg.p2;
			const el = document.createElement('div');
			el.className = 'outline-endpoint';
			const marker = createMarker({ element: el, draggable: true })
				.setLngLat(pos as [number, number])
				.addTo(map);

			marker.on('dragstart', () => { dragging = true; courseStore.pushUndo(); });
			marker.on('drag', () => {
				const p = marker.getLngLat();
				courseStore.updateOutlineEndpoint(index, endpoint, [p.lng, p.lat]);
				updateVisualPath(visual);
			});
			marker.on('dragend', () => { requestAnimationFrame(() => { dragging = false; }); });

			el.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				courseStore.pushUndo();
				courseStore.removeOutlineSegment(index);
				rebuildVisuals();
			});

			return marker;
		}

		function createControlMarker(): mapboxgl.Marker {
			const seg = courseStore.course.courseOutline[index];
			const el = document.createElement('div');
			el.className = 'outline-control';
			const marker = createMarker({ element: el, draggable: true })
				.setLngLat(seg.cp as [number, number])
				.addTo(map);

			marker.on('dragstart', () => { dragging = true; courseStore.pushUndo(); });
			marker.on('drag', () => {
				const p = marker.getLngLat();
				courseStore.updateOutlineControlPoint(index, [p.lng, p.lat]);
				updateVisualPath(visual);
			});
			marker.on('dragend', () => { requestAnimationFrame(() => { dragging = false; }); });

			return marker;
		}

		const markers: [mapboxgl.Marker, mapboxgl.Marker, mapboxgl.Marker] = [
			createEndpoint(0),
			createEndpoint(1),
			createControlMarker()
		];

		const visual: SegmentVisual = { index, markers, svgEl: svg };
		updateVisualPath(visual);
		return visual;
	}

	function updateVisualPath(v: SegmentVisual) {
		const map = mapStore.map;
		if (!map) return;
		const seg = courseStore.course.courseOutline[v.index];
		if (!seg) return;

		const sp1 = map.project(seg.p1 as [number, number]);
		const sp2 = map.project(seg.p2 as [number, number]);
		const scp = map.project(seg.cp as [number, number]);

		const path = v.svgEl.querySelector('path');
		if (path) {
			path.setAttribute('d', `M ${sp1.x} ${sp1.y} Q ${scp.x} ${scp.y} ${sp2.x} ${sp2.y}`);
		}
	}

	function rebuildVisuals() {
		for (const v of visuals) {
			v.markers.forEach((m) => m.remove());
			v.svgEl.remove();
		}
		visuals = [];
		courseStore.course.courseOutline.forEach((_, i) => {
			visuals.push(createSegmentVisual(i));
		});
	}

	function updateAllPositions() {
		for (const v of visuals) updateVisualPath(v);
	}

	onMount(() => {
		const map = mapStore.map;
		if (!map) return;

		rebuildVisuals();
		map.on('move', updateAllPositions);

		return () => {
			map.off('move', updateAllPositions);
			cancelPending();
			for (const v of visuals) {
				v.markers.forEach((m) => m.remove());
				v.svgEl.remove();
			}
		};
	});

	$effect(() => {
		const _len = courseStore.course.courseOutline.length;
		if (dragging) return;
		rebuildVisuals();
	});
</script>

<div class="outline-container" bind:this={svgContainer}></div>

<style>
	.outline-container {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 5;
	}

	:global(.outline-endpoint) {
		width: 10px;
		height: 10px;
		background: #fff;
		border: 2px solid #94a3b8;
		border-radius: 50%;
		cursor: pointer;
		pointer-events: auto;
	}

	:global(.outline-control) {
		width: 8px;
		height: 8px;
		background: #fbbf24;
		border: 1.5px solid #fff;
		border-radius: 50%;
		cursor: pointer;
		pointer-events: auto;
	}
</style>
