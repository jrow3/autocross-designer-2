import { mapStore } from '$lib/stores/mapStore.svelte';
import { courseStore } from '$lib/stores/courseStore.svelte';
import { layerStore } from '$lib/stores/layerStore.svelte';

function coneColor(type: string): string {
	switch (type) {
		case 'pointer': return '#ef4444';
		case 'start-cone': return '#22c55e';
		case 'finish-cone': return '#ffffff';
		case 'trailer': return '#6b7280';
		default: return '#f97316';
	}
}

export async function captureMapCanvas(): Promise<HTMLCanvasElement | null> {
	const map = mapStore.map;
	if (!map) return null;

	if (mapStore.mode !== 'map') {
		if ('getCanvas' in map) return map.getCanvas();
		return null;
	}

	const mapCanvas = map.getCanvas?.() as HTMLCanvasElement | undefined;
	if (!mapCanvas) return null;

	const copy = document.createElement('canvas');
	copy.width = mapCanvas.width;
	copy.height = mapCanvas.height;
	const ctx = copy.getContext('2d')!;

	// Draw map tiles
	ctx.drawImage(mapCanvas, 0, 0);

	// Apply map fade as a filter overlay
	const fade = mapStore.mapFade;
	if (fade > 0) {
		const alpha = fade / 100 * 0.8;
		ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
		ctx.fillRect(0, 0, copy.width, copy.height);
	}

	const ratio = copy.width / mapCanvas.clientWidth;
	const markerScale = mapStore.markerSize;

	// Draw cones
	if (layerStore.isVisible('cones')) {
		for (const cone of courseStore.course.cones) {
			const px = map.project(cone.lngLat as [number, number]);
			const x = px.x * ratio;
			const y = px.y * ratio;

			if (cone.type === 'trailer') {
				const w = (cone.width ?? 80) * markerScale * ratio * 0.15;
				const h = (cone.height ?? 40) * markerScale * ratio * 0.15;
				ctx.save();
				ctx.translate(x, y);
				if (cone.rotation) ctx.rotate(cone.rotation * Math.PI / 180);
				ctx.fillStyle = '#6b7280';
				ctx.fillRect(-w / 2, -h / 2, w, h);
				ctx.strokeStyle = '#ffffff';
				ctx.lineWidth = ratio;
				ctx.strokeRect(-w / 2, -h / 2, w, h);
				ctx.restore();
			} else {
				const r = 5 * markerScale * ratio;
				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				ctx.fillStyle = coneColor(cone.type);
				ctx.fill();
				ctx.strokeStyle = '#000000';
				ctx.lineWidth = 1.5 * ratio;
				ctx.stroke();
				// Glow effect
				ctx.shadowColor = coneColor(cone.type);
				ctx.shadowBlur = 4 * ratio;
				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				ctx.fill();
				ctx.shadowBlur = 0;
			}
		}
	}

	// Draw workers
	if (layerStore.isVisible('workers')) {
		for (const w of courseStore.course.workers) {
			const px = map.project(w.lngLat as [number, number]);
			const x = px.x * ratio;
			const y = px.y * ratio;
			const r = 8 * markerScale * ratio;

			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fillStyle = '#7c3aed';
			ctx.fill();
			ctx.strokeStyle = '#ffffff';
			ctx.lineWidth = 1.5 * ratio;
			ctx.stroke();

			ctx.fillStyle = '#ffffff';
			ctx.font = `bold ${8 * markerScale * ratio}px sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(String(w.number), x, y);
		}
	}

	// Draw notes
	if (layerStore.isVisible('notes')) {
		for (const n of courseStore.course.notes) {
			const px = map.project(n.lngLat as [number, number]);
			const x = px.x * ratio;
			const y = px.y * ratio;
			const r = 8 * markerScale * ratio;

			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fillStyle = '#0ea5e9';
			ctx.fill();
			ctx.strokeStyle = '#ffffff';
			ctx.lineWidth = 1.5 * ratio;
			ctx.stroke();

			ctx.fillStyle = '#ffffff';
			ctx.font = `bold ${8 * markerScale * ratio}px sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(String(n.number), x, y);
		}
	}

	return copy;
}

export interface PrintLayout {
	title: string;
	showConeCount: boolean;
	showLegend: boolean;
	showScaleBar: boolean;
}

export function renderPrintCanvas(
	mapCanvas: HTMLCanvasElement,
	layout: PrintLayout,
	coneCount: number,
	lineLength: string
): HTMLCanvasElement {
	const padding = 40;
	const headerHeight = layout.title ? 60 : 20;
	const footerHeight = (layout.showConeCount || layout.showLegend || layout.showScaleBar) ? 80 : 20;

	const width = mapCanvas.width + padding * 2;
	const height = mapCanvas.height + headerHeight + footerHeight;

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d')!;

	ctx.fillStyle = '#fff';
	ctx.fillRect(0, 0, width, height);

	if (layout.title) {
		ctx.fillStyle = '#1e293b';
		ctx.font = 'bold 24px -apple-system, sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(layout.title, width / 2, 36);
	}

	ctx.drawImage(mapCanvas, padding, headerHeight);

	const footerY = headerHeight + mapCanvas.height + 24;
	ctx.fillStyle = '#475569';
	ctx.font = '14px -apple-system, sans-serif';
	ctx.textAlign = 'left';

	let x = padding;

	if (layout.showConeCount) {
		ctx.fillText(`Cones: ${coneCount}`, x, footerY);
		x += 120;
		ctx.fillText(`Line: ${lineLength}`, x, footerY);
		x += 140;
	}

	if (layout.showLegend) {
		const legends = [
			{ color: '#f97316', label: 'Regular' },
			{ color: '#22c55e', label: 'Start' },
			{ color: '#ef4444', label: 'Pointer' }
		];
		for (const leg of legends) {
			ctx.fillStyle = leg.color;
			ctx.beginPath();
			ctx.arc(x + 6, footerY - 4, 5, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = '#475569';
			ctx.fillText(leg.label, x + 16, footerY);
			x += 80;
		}
	}

	if (layout.showScaleBar) {
		ctx.fillStyle = '#475569';
		ctx.textAlign = 'right';
		ctx.fillText('Autocross Course Designer', width - padding, footerY);
	}

	return canvas;
}
