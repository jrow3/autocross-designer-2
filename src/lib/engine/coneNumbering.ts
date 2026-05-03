import type { LngLat, ConeData, WaypointData, WorkerZoneData, ConeNumberMap } from '$lib/types/course';
import { pointInPolygon } from '$lib/engine/polygonEngine';

function projectOntoPolyline(point: LngLat, line: LngLat[]): number {
	let bestT = 0;
	let bestDist = Infinity;

	for (let i = 0; i < line.length - 1; i++) {
		const ax = line[i][0], ay = line[i][1];
		const bx = line[i + 1][0], by = line[i + 1][1];
		const dx = bx - ax, dy = by - ay;
		const lenSq = dx * dx + dy * dy;
		if (lenSq === 0) continue;

		const px = point[0] - ax, py = point[1] - ay;
		const frac = Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
		const nx = ax + frac * dx - point[0];
		const ny = ay + frac * dy - point[1];
		const dist = nx * nx + ny * ny;

		if (dist < bestDist) {
			bestDist = dist;
			bestT = i + frac;
		}
	}

	return bestT;
}

function nearestNeighborOrder(cones: ConeData[]): ConeData[] {
	if (cones.length === 0) return [];

	const sorted = [...cones].sort((a, b) => (a.lngLat[0] + a.lngLat[1]) - (b.lngLat[0] + b.lngLat[1]));
	const result: ConeData[] = [sorted[0]];
	const remaining = new Set(sorted.slice(1).map(c => c.id));
	const byId = new Map(cones.map(c => [c.id, c]));

	while (remaining.size > 0) {
		const last = result[result.length - 1];
		let closestId = '';
		let closestDist = Infinity;

		for (const id of remaining) {
			const c = byId.get(id)!;
			const dx = c.lngLat[0] - last.lngLat[0];
			const dy = c.lngLat[1] - last.lngLat[1];
			const d = dx * dx + dy * dy;
			if (d < closestDist) {
				closestDist = d;
				closestId = id;
			}
		}

		result.push(byId.get(closestId)!);
		remaining.delete(closestId);
	}

	return result;
}

function segmentsIntersect(a1: LngLat, a2: LngLat, b1: LngLat, b2: LngLat): boolean {
	const d1x = a2[0] - a1[0], d1y = a2[1] - a1[1];
	const d2x = b2[0] - b1[0], d2y = b2[1] - b1[1];
	const cross = d1x * d2y - d1y * d2x;
	if (Math.abs(cross) < 1e-12) return false;
	const dx = b1[0] - a1[0], dy = b1[1] - a1[1];
	const t = (dx * d2y - dy * d2x) / cross;
	const u = (dx * d1y - dy * d1x) / cross;
	return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function linePassesThroughZone(line: LngLat[], zone: WorkerZoneData): boolean {
	// Check if any waypoint is inside the zone
	if (line.some(pt => pointInPolygon(pt, zone.vertices))) return true;

	// Check if any line segment intersects any zone boundary edge
	const verts = zone.vertices;
	for (let i = 0; i < line.length - 1; i++) {
		for (let j = 0; j < verts.length; j++) {
			const k = (j + 1) % verts.length;
			if (segmentsIntersect(line[i], line[i + 1], verts[j], verts[k])) return true;
		}
	}
	return false;
}

export function numberCones(
	cones: ConeData[],
	workerZones: WorkerZoneData[],
	drivingLine: WaypointData[]
): ConeNumberMap {
	const result: ConeNumberMap = {};
	const linePoints = drivingLine.map(w => w.lngLat);
	const hasLine = linePoints.length >= 2;

	for (const zone of workerZones) {
		const zoneCones = cones.filter(c => pointInPolygon(c.lngLat, zone.vertices));
		if (zoneCones.length === 0) continue;

		let ordered: ConeData[];

		if (hasLine && linePassesThroughZone(linePoints, zone)) {
			const withT = zoneCones.map(c => ({ cone: c, t: projectOntoPolyline(c.lngLat, linePoints) }));
			withT.sort((a, b) => a.t - b.t);
			ordered = withT.map(x => x.cone);
		} else {
			ordered = nearestNeighborOrder(zoneCones);
		}

		ordered.forEach((cone, idx) => {
			result[cone.id] = String(zone.stationNumber * 100 + (idx + 1));
		});
	}

	return result;
}
