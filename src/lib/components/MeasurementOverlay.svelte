<script lang="ts">
	import { onMount } from 'svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { haversineFeet } from '$lib/engine/distance';
	import { createMarker, type AnyMarker } from '$lib/engine/markerFactory';
	import type { LngLat } from '$lib/types/course';

	interface MeasurementVisual {
		index: number;
		markers: [AnyMarker, AnyMarker];
		svgEl: SVGSVGElement;
		labelEl: HTMLDivElement;
	}

	let visuals: MeasurementVisual[] = [];
	let svgContainer: HTMLDivElement;
	let dragging = $state(false);

	// Pending first-click state
	let pendingPoint: LngLat | null = $state(null);
	let pendingConeId: string | null = null;
	let pendingMarker: AnyMarker | null = null;

	const SNAP_THRESHOLD_PX = 15;

	function findNearbyCone(lngLat: LngLat): { id: string; lngLat: LngLat } | null {
		const map = mapStore.map;
		if (!map) return null;
		const clickScreen = map.project(lngLat as [number, number]);
		let closest: { id: string; lngLat: LngLat; dist: number } | null = null;

		for (const cone of courseStore.course.cones) {
			const coneScreen = map.project(cone.lngLat as [number, number]);
			const dx = clickScreen.x - coneScreen.x;
			const dy = clickScreen.y - coneScreen.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist < SNAP_THRESHOLD_PX && (!closest || dist < closest.dist)) {
				closest = { id: cone.id, lngLat: cone.lngLat, dist };
			}
		}
		return closest;
	}

	export function handleClick(lngLat: LngLat) {
		if (dragging) return;

		const snap = findNearbyCone(lngLat);
		const effectiveLngLat = snap?.lngLat ?? lngLat;
		const coneId = snap?.id ?? null;

		if (!pendingPoint) {
			pendingPoint = effectiveLngLat;
			pendingConeId = coneId;
			const map = mapStore.map!;
			const el = document.createElement('div');
			el.className = 'measurement-endpoint';
			pendingMarker = createMarker({ element: el })
				.setLngLat(effectiveLngLat as [number, number])
				.addTo(map);
		} else {
			courseStore.pushUndo();
			courseStore.addMeasurement({
				p1: pendingPoint, p2: effectiveLngLat,
				coneId1: pendingConeId, coneId2: coneId
			});
			pendingMarker?.remove();
			pendingMarker = null;
			pendingPoint = null;
			pendingConeId = null;
			rebuildVisuals();
		}
	}

	export function cancelPending() {
		pendingMarker?.remove();
		pendingMarker = null;
		pendingPoint = null;
	}

	function distanceLabel(p1: LngLat, p2: LngLat): string {
		const feet = haversineFeet(p1, p2);
		return `${feet.toFixed(1)} ft`;
	}

	function createMeasurementVisual(index: number): MeasurementVisual {
		const map = mapStore.map!;
		const m = courseStore.course.measurements[index];

		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
		svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;';
		const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line.setAttribute('stroke', '#f472b6');
		line.setAttribute('stroke-width', '2.5');
		line.setAttribute('stroke-dasharray', '6,4');
		svg.appendChild(line);
		svgContainer.appendChild(svg);

		const label = document.createElement('div');
		label.className = 'measurement-label';
		svgContainer.appendChild(label);

		function createEndpoint(endpoint: 0 | 1): mapboxgl.Marker {
			const coneId = endpoint === 0 ? m.coneId1 : m.coneId2;
			const isSnapped = coneId != null;
			const el = document.createElement('div');
			el.className = isSnapped ? 'measurement-endpoint measurement-endpoint-snapped' : 'measurement-endpoint';
			const pos = endpoint === 0 ? m.p1 : m.p2;
			const marker = createMarker({ element: el, draggable: !isSnapped })
				.setLngLat(pos as [number, number])
				.addTo(map);

			if (!isSnapped) {
				marker.on('dragstart', () => {
					dragging = true;
					courseStore.pushUndo();
				});

				marker.on('drag', () => {
					const p = marker.getLngLat();
					const lngLat: LngLat = [p.lng, p.lat];
					const snap = findNearbyCone(lngLat);
					if (snap) {
						el.classList.add('measurement-endpoint-snapping');
					} else {
						el.classList.remove('measurement-endpoint-snapping');
					}
					courseStore.updateMeasurementEndpoint(index, endpoint, lngLat);
					updateVisualPositions(visual);
				});

				marker.on('dragend', () => {
					const p = marker.getLngLat();
					const lngLat: LngLat = [p.lng, p.lat];
					const snap = findNearbyCone(lngLat);
					if (snap) {
						const mData = courseStore.course.measurements[index];
						if (mData) {
							if (endpoint === 0) { mData.p1 = snap.lngLat; mData.coneId1 = snap.id; }
							else { mData.p2 = snap.lngLat; mData.coneId2 = snap.id; }
						}
						requestAnimationFrame(() => { dragging = false; rebuildVisuals(); });
					} else {
						el.classList.remove('measurement-endpoint-snapping');
						requestAnimationFrame(() => { dragging = false; });
					}
				});
			}

			el.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				courseStore.pushUndo();
				courseStore.removeMeasurement(index);
				rebuildVisuals();
			});

			return marker;
		}

		const markers: [mapboxgl.Marker, mapboxgl.Marker] = [createEndpoint(0), createEndpoint(1)];
		const visual: MeasurementVisual = { index, markers, svgEl: svg, labelEl: label };
		updateVisualPositions(visual);
		return visual;
	}

	function updateVisualPositions(v: MeasurementVisual) {
		const map = mapStore.map;
		if (!map) return;
		const m = courseStore.course.measurements[v.index];
		if (!m) return;

		const sp1 = map.project(m.p1 as [number, number]);
		const sp2 = map.project(m.p2 as [number, number]);
		const line = v.svgEl.querySelector('line');
		if (line) {
			line.setAttribute('x1', String(sp1.x));
			line.setAttribute('y1', String(sp1.y));
			line.setAttribute('x2', String(sp2.x));
			line.setAttribute('y2', String(sp2.y));
		}

		const mx = (sp1.x + sp2.x) / 2;
		const my = (sp1.y + sp2.y) / 2;
		v.labelEl.style.left = `${mx}px`;
		v.labelEl.style.top = `${my - 16}px`;
		v.labelEl.textContent = distanceLabel(m.p1, m.p2);
	}

	function rebuildVisuals() {
		for (const v of visuals) {
			v.markers[0].remove();
			v.markers[1].remove();
			v.svgEl.remove();
			v.labelEl.remove();
		}
		visuals = [];

		courseStore.course.measurements.forEach((_, i) => {
			visuals.push(createMeasurementVisual(i));
		});
	}

	function updateAllPositions() {
		for (const v of visuals) updateVisualPositions(v);
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
				v.markers[0].remove();
				v.markers[1].remove();
				v.svgEl.remove();
				v.labelEl.remove();
			}
		};
	});

	$effect(() => {
		const _len = courseStore.course.measurements.length;
		if (dragging) return;
		rebuildVisuals();
	});

	$effect(() => {
		const cones = courseStore.course.cones;
		const measurements = courseStore.course.measurements;
		let changed = false;
		for (const m of measurements) {
			if (m.coneId1) {
				const cone = cones.find(c => c.id === m.coneId1);
				if (cone && (cone.lngLat[0] !== m.p1[0] || cone.lngLat[1] !== m.p1[1])) {
					m.p1 = cone.lngLat;
					changed = true;
				}
			}
			if (m.coneId2) {
				const cone = cones.find(c => c.id === m.coneId2);
				if (cone && (cone.lngLat[0] !== m.p2[0] || cone.lngLat[1] !== m.p2[1])) {
					m.p2 = cone.lngLat;
					changed = true;
				}
			}
		}
		if (changed) {
			for (const v of visuals) {
				updateVisualPositions(v);
				const m = measurements[v.index];
				if (m) {
					if (m.coneId1) v.markers[0].setLngLat(m.p1 as [number, number]);
					if (m.coneId2) v.markers[1].setLngLat(m.p2 as [number, number]);
				}
			}
		}
	});
</script>

<div class="measurement-container" bind:this={svgContainer}></div>

<style>
	.measurement-container {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 5;
	}

	:global(.measurement-endpoint) {
		width: 10px;
		height: 10px;
		background: #f472b6;
		border: 2px solid #fff;
		border-radius: 50%;
		cursor: pointer;
		pointer-events: auto;
	}

	:global(.measurement-endpoint-snapped) {
		width: 0;
		height: 0;
		opacity: 0;
		pointer-events: none;
		border: none;
	}

	:global(.measurement-endpoint-snapping) {
		background: #22c55e;
		border-color: #22c55e;
		box-shadow: 0 0 6px rgba(34, 197, 94, 0.8);
	}

	:global(.measurement-label) {
		position: absolute;
		transform: translate(-50%, -100%);
		background: rgba(0, 0, 0, 0.75);
		color: #f472b6;
		padding: 2px 6px;
		border-radius: 3px;
		font-size: 11px;
		font-weight: bold;
		white-space: nowrap;
		pointer-events: none;
	}
</style>
