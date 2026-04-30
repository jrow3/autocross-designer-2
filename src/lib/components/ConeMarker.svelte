<script lang="ts">
	import { onMount } from 'svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { computePointerRotation } from '$lib/engine/coneLogic';
	import { createMarker, wrapForMapbox, type AnyMarker } from '$lib/engine/markerFactory';
	import { selectionStore } from '$lib/stores/selectionStore.svelte';
	import type { ConeData, LngLat } from '$lib/types/course';

	let { cone }: { cone: ConeData } = $props();

	let marker: AnyMarker | null = null;
	let innerEl: HTMLDivElement | null = null;
	let isResizing = false;
	let isRotating = false;

	const MARKER_CLASSES: Record<string, string> = {
		regular: 'marker-regular',
		pointer: 'marker-pointer',
		'start-cone': 'marker-start',
		'finish-cone': 'marker-finish',
		trailer: 'marker-trailer',
		'staging-grid': 'marker-staging-grid'
	};

	const isResizable = cone.type === 'trailer' || cone.type === 'staging-grid';
	const defaultW = cone.type === 'trailer' ? 40 : 60;
	const defaultH = cone.type === 'trailer' ? 20 : 40;
	const LABELS: Record<string, string> = { trailer: 'TRAILER', 'staging-grid': 'GRID' };

	function createElement(type: string): { wrapper: HTMLDivElement; inner: HTMLDivElement } {
		const inner = document.createElement('div');
		inner.className = `cone-marker ${MARKER_CLASSES[type] || 'marker-regular'}`;

		const label = LABELS[type];
		if (label) inner.textContent = label;

		if (isResizable) {
			const w = cone.width ?? defaultW;
			const h = cone.height ?? defaultH;
			inner.style.width = `${w}px`;
			inner.style.height = `${h}px`;
			inner.style.fontSize = `${Math.max(6, Math.min(w, h) * 0.25)}px`;
		}

		innerEl = inner;
		return { wrapper: wrapForMapbox(inner), inner };
	}

	function applyTransform() {
		if (!innerEl) return;
		if (cone.type === 'pointer') {
			const angle = computePointerRotation(cone, courseStore.course.cones, mapStore.mode);
			innerEl.style.transform = `scale(var(--marker-scale, 1)) rotate(${angle}deg)`;
		} else if (isResizable) {
			const rot = cone.rotation ?? 0;
			innerEl.style.transform = `scale(var(--marker-scale, 1)) rotate(${rot}deg)`;
		}
	}

	function attachHandles(el: HTMLElement) {
		if (!isResizable) return;

		// Resize handles
		for (const corner of ['nw', 'ne', 'se', 'sw']) {
			const handle = document.createElement('div');
			handle.className = `resize-handle resize-${corner}`;
			el.appendChild(handle);
			handle.addEventListener('mousedown', (e) => {
				e.stopPropagation();
				e.preventDefault();
				startResize(e, corner, el);
			}, { capture: true });
		}

		// Rotation handle
		const rotHandle = document.createElement('div');
		rotHandle.className = 'rotate-handle';
		el.appendChild(rotHandle);
		rotHandle.addEventListener('mousedown', (e) => {
			e.stopPropagation();
			e.preventDefault();
			startRotate(e, el);
		}, { capture: true });
	}

	function startResize(e: MouseEvent, corner: string, el: HTMLElement) {
		isResizing = true;
		courseStore.pushUndo();
		const startX = e.clientX;
		const startY = e.clientY;
		const startW = cone.width ?? defaultW;
		const startH = cone.height ?? defaultH;
		const mapContainer = document.querySelector('.map-container');
		const scaleStr = mapContainer ? getComputedStyle(mapContainer).getPropertyValue('--marker-scale') : '1';
		const scale = parseFloat(scaleStr) || 1;

		const onMove = (ev: MouseEvent) => {
			const dx = (ev.clientX - startX) / scale;
			const dy = (ev.clientY - startY) / scale;
			let newW = startW;
			let newH = startH;
			if (corner.includes('e')) newW = Math.max(20, startW + dx);
			if (corner.includes('w')) newW = Math.max(20, startW - dx);
			if (corner.includes('s')) newH = Math.max(10, startH + dy);
			if (corner.includes('n')) newH = Math.max(10, startH - dy);
			el.style.width = `${newW}px`;
			el.style.height = `${newH}px`;
			el.style.fontSize = `${Math.max(6, Math.min(newW, newH) * 0.25)}px`;
			courseStore.updateConeDimensions(cone.id, newW, newH);
		};

		const onUp = () => {
			isResizing = false;
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
		};
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
	}

	function startRotate(e: MouseEvent, el: HTMLElement) {
		isRotating = true;
		courseStore.pushUndo();
		const rect = el.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;

		const onMove = (ev: MouseEvent) => {
			const angle = Math.atan2(ev.clientX - cx, -(ev.clientY - cy)) * (180 / Math.PI);
			courseStore.updateConeRotation(cone.id, Math.round(angle));
			applyTransform();
		};

		const onUp = () => {
			isRotating = false;
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
		};
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
	}

	onMount(() => {
		const map = mapStore.map;
		if (!map) return;

		const { wrapper, inner } = createElement(cone.type);

		marker = createMarker({ element: wrapper, draggable: true })
			.setLngLat(cone.lngLat as [number, number])
			.addTo(map);

		let dragStartPos: LngLat | null = null;
		let groupOffsets: { type: string; id: string; offset: LngLat }[] = [];

		marker.on('dragstart', () => {
			if (isResizing || isRotating) return;
			courseStore.pushUndo();
			dragStartPos = [...cone.lngLat] as LngLat;

			if (selectionStore.isSelected('cone', cone.id) && selectionStore.count > 1) {
				groupOffsets = [];
				for (const item of selectionStore.selected) {
					if (item.type === 'cone' && item.id !== cone.id) {
						const c = courseStore.course.cones.find(c => c.id === item.id);
						if (c) groupOffsets.push({ type: 'cone', id: item.id, offset: [c.lngLat[0] - dragStartPos[0], c.lngLat[1] - dragStartPos[1]] });
					} else if (item.type === 'obstacle') {
						const o = courseStore.course.obstacles.find(o => o.id === item.id);
						if (o) groupOffsets.push({ type: 'obstacle', id: item.id, offset: [o.lngLat[0] - dragStartPos[0], o.lngLat[1] - dragStartPos[1]] });
					} else if (item.type === 'worker') {
						const w = courseStore.course.workers.find(w => w.id === item.id);
						if (w) groupOffsets.push({ type: 'worker', id: item.id, offset: [w.lngLat[0] - dragStartPos[0], w.lngLat[1] - dragStartPos[1]] });
					}
				}
			} else {
				groupOffsets = [];
			}
		});

		marker.on('drag', () => {
			if (isResizing || isRotating) return;
			const pos = marker!.getLngLat();
			const newPos: LngLat = [pos.lng, pos.lat];
			courseStore.updateConePosition(cone.id, newPos);

			for (const g of groupOffsets) {
				const moved: LngLat = [newPos[0] + g.offset[0], newPos[1] + g.offset[1]];
				if (g.type === 'cone') courseStore.updateConePosition(g.id, moved);
				else if (g.type === 'obstacle') courseStore.updateObstaclePosition(g.id, moved);
				else if (g.type === 'worker') courseStore.updateWorkerPosition(g.id, moved);
			}
		});

		marker.on('dragend', () => {
			if (isResizing || isRotating) return;
			const pos = marker!.getLngLat();
			courseStore.updateConePosition(cone.id, [pos.lng, pos.lat]);
			groupOffsets = [];
			dragStartPos = null;
			applyTransform();
		});

		wrapper.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			courseStore.pushUndo();
			courseStore.removeCone(cone.id);
		});

		if (isResizable) attachHandles(inner);
		applyTransform();

		return () => {
			marker?.remove();
		};
	});

	$effect(() => {
		if (marker) {
			const [lng, lat] = cone.lngLat;
			const current = marker.getLngLat();
			if (Math.abs(current.lng - lng) > 1e-8 || Math.abs(current.lat - lat) > 1e-8) {
				marker.setLngLat([lng, lat]);
			}
			applyTransform();

			if (isResizable && innerEl) {
				const w = cone.width ?? defaultW;
				const h = cone.height ?? defaultH;
				innerEl.style.width = `${w}px`;
				innerEl.style.height = `${h}px`;
				innerEl.style.fontSize = `${Math.max(6, Math.min(w, h) * 0.25)}px`;
			}
		}
	});

	$effect(() => {
		if (innerEl) {
			const selected = selectionStore.isSelected('cone', cone.id);
			innerEl.classList.toggle('multi-selected', selected);
		}
	});
</script>

<style>
	:global(.cone-marker) {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		transform: scale(var(--marker-scale, 1));
		filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.7));
		border: 1px solid rgba(0, 0, 0, 0.6);
	}

	:global(.marker-regular) {
		background: #f97316;
	}

	:global(.marker-pointer) {
		background: #84cc16;
		width: 14px;
		height: 14px;
		clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
		border-radius: 0;
	}

	:global(.marker-start) {
		background: #22c55e;
	}

	:global(.marker-finish) {
		background: #fff;
		background-image: repeating-conic-gradient(#000 0% 25%, #fff 0% 50%);
		background-size: 7px 7px;
	}

	:global(.marker-trailer) {
		width: 40px;
		height: 20px;
		background: #64748b;
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 3px;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		font-weight: bold;
		font-size: 8px;
		overflow: hidden;
	}

	:global(.marker-staging-grid) {
		width: 60px;
		height: 40px;
		background: rgba(100, 116, 139, 0.5);
		border: 2px dashed rgba(255, 255, 255, 0.5);
		border-radius: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		font-size: 10px;
		font-weight: bold;
		position: relative;
		overflow: hidden;
	}

	:global(.resize-handle) {
		position: absolute;
		width: 8px;
		height: 8px;
		background: #3b82f6;
		border: 1px solid #fff;
		border-radius: 50%;
		z-index: 10;
	}

	:global(.resize-nw) { top: -4px; left: -4px; cursor: nw-resize; }
	:global(.resize-ne) { top: -4px; right: -4px; cursor: ne-resize; }
	:global(.resize-se) { bottom: -4px; right: -4px; cursor: se-resize; }
	:global(.resize-sw) { bottom: -4px; left: -4px; cursor: sw-resize; }

	:global(.rotate-handle) {
		position: absolute;
		top: -16px;
		left: 50%;
		transform: translateX(-50%);
		width: 10px;
		height: 10px;
		background: #f59e0b;
		border: 1px solid #fff;
		border-radius: 50%;
		cursor: grab;
		z-index: 10;
	}

	:global(.rotate-handle:active) {
		cursor: grabbing;
	}
</style>
