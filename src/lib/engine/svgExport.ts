import type { CourseData, LngLat } from '$lib/types/course';
import { getObstacleType } from './obstacleTypes';
import { catmullRomSpline } from './catmullRom';

interface Bounds {
	minX: number; minY: number; maxX: number; maxY: number;
}

function allPoints(data: CourseData): LngLat[] {
	const pts: LngLat[] = [];
	for (const c of data.cones) pts.push(c.lngLat);
	for (const o of data.obstacles) pts.push(o.lngLat);
	for (const w of data.workers) pts.push(w.lngLat);
	for (const n of data.notes) pts.push(n.lngLat);
	for (const wp of data.drivingLine) pts.push(wp.lngLat);
	for (const m of data.measurements) { pts.push(m.p1); pts.push(m.p2); }
	for (const s of data.courseOutline) { pts.push(s.p1); pts.push(s.p2); pts.push(s.cp); }
	return pts;
}

function getBounds(pts: LngLat[], padding = 20): Bounds {
	if (pts.length === 0) return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (const [x, y] of pts) {
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
	}
	return { minX: minX - padding, minY: minY - padding, maxX: maxX + padding, maxY: maxY + padding };
}

function tx(x: number, b: Bounds): number { return x - b.minX; }
function ty(y: number, b: Bounds): number { return y - b.minY; }

export function exportSVG(data: CourseData, title = ''): string {
	const pts = allPoints(data);
	const b = getBounds(pts);
	const w = b.maxX - b.minX;
	const h = b.maxY - b.minY;

	const lines: string[] = [];
	lines.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}">`);
	lines.push(`<rect width="100%" height="100%" fill="#1a1a2e"/>`);

	if (title) {
		lines.push(`<text x="${w / 2}" y="16" text-anchor="middle" fill="#e2e8f0" font-size="14" font-family="sans-serif" font-weight="bold">${esc(title)}</text>`);
	}

	// Driving line
	if (data.drivingLine.length >= 2) {
		const coords = data.drivingLine.map((wp) => wp.lngLat);
		const smooth = catmullRomSpline(coords, 20);
		const d = smooth.map((p, i) => `${i === 0 ? 'M' : 'L'}${tx(p[0], b).toFixed(2)},${ty(p[1], b).toFixed(2)}`).join(' ');
		lines.push(`<path d="${d}" fill="none" stroke="#60a5fa" stroke-width="2" stroke-dasharray="4,4"/>`);
	}

	// Measurements
	for (const m of data.measurements) {
		lines.push(`<line x1="${tx(m.p1[0], b).toFixed(2)}" y1="${ty(m.p1[1], b).toFixed(2)}" x2="${tx(m.p2[0], b).toFixed(2)}" y2="${ty(m.p2[1], b).toFixed(2)}" stroke="#f472b6" stroke-width="1.5" stroke-dasharray="4,3"/>`);
	}

	// Course outline
	for (const s of data.courseOutline) {
		lines.push(`<path d="M${tx(s.p1[0], b).toFixed(2)},${ty(s.p1[1], b).toFixed(2)} Q${tx(s.cp[0], b).toFixed(2)},${ty(s.cp[1], b).toFixed(2)} ${tx(s.p2[0], b).toFixed(2)},${ty(s.p2[1], b).toFixed(2)}" fill="none" stroke="#fff" stroke-width="2"/>`);
	}

	// Cones
	for (const c of data.cones) {
		const cx = tx(c.lngLat[0], b).toFixed(2);
		const cy = ty(c.lngLat[1], b).toFixed(2);
		let fill = '#f97316';
		if (c.type === 'pointer') fill = '#ef4444';
		else if (c.type === 'start-cone') fill = '#22c55e';
		else if (c.type === 'finish-cone') fill = '#ffffff';
		lines.push(`<circle cx="${cx}" cy="${cy}" r="4" fill="${fill}" stroke="#fff" stroke-width="1"/>`);
	}

	// Obstacles
	for (const o of data.obstacles) {
		const config = getObstacleType(o.type);
		const ox = tx(o.lngLat[0], b).toFixed(2);
		const oy = ty(o.lngLat[1], b).toFixed(2);
		lines.push(`<text x="${ox}" y="${oy}" text-anchor="middle" dominant-baseline="central" fill="${config?.color ?? '#ef4444'}" font-size="12">${esc(config?.symbol ?? '?')}</text>`);
	}

	// Workers
	for (const w of data.workers) {
		const wx = tx(w.lngLat[0], b).toFixed(2);
		const wy = ty(w.lngLat[1], b).toFixed(2);
		lines.push(`<circle cx="${wx}" cy="${wy}" r="8" fill="#7c3aed" stroke="#fff" stroke-width="1.5"/>`);
		lines.push(`<text x="${wx}" y="${wy}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="8" font-weight="bold">${w.number}</text>`);
	}

	// Notes
	for (const n of data.notes) {
		const nx = tx(n.lngLat[0], b).toFixed(2);
		const ny = ty(n.lngLat[1], b).toFixed(2);
		lines.push(`<circle cx="${nx}" cy="${ny}" r="8" fill="#0ea5e9" stroke="#fff" stroke-width="1.5"/>`);
		lines.push(`<text x="${nx}" y="${ny}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="8" font-weight="bold">${n.number}</text>`);
	}

	lines.push('</svg>');
	return lines.join('\n');
}

function esc(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function downloadSVG(data: CourseData, title = '', filename = 'autocross-course.svg'): void {
	const svg = exportSVG(data, title);
	const blob = new Blob([svg], { type: 'image/svg+xml' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
