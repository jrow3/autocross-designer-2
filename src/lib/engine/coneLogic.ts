import type { LngLat, ConeData } from '$lib/types/course';

export function findNearestRegularCone(lngLat: LngLat, cones: ConeData[]): ConeData | null {
	let nearest: ConeData | null = null;
	let minDist = Infinity;
	for (const c of cones) {
		if (c.type === 'pointer') continue;
		const dx = c.lngLat[0] - lngLat[0];
		const dy = c.lngLat[1] - lngLat[1];
		const dist = dx * dx + dy * dy;
		if (dist < minDist) {
			minDist = dist;
			nearest = c;
		}
	}
	return nearest;
}

export function computePointerRotation(
	cone: ConeData,
	cones: ConeData[],
	mode: 'map' | 'image'
): number {
	let target: ConeData | null = null;

	if (cone.lockedTargetId != null) {
		target = cones.find((c) => c.id === cone.lockedTargetId && c.type !== 'pointer') ?? null;
		if (!target) {
			cone.lockedTargetId = null;
		}
	}

	if (!target) {
		target = findNearestRegularCone(cone.lngLat, cones);
	}

	if (!target) return 0;

	const dx = target.lngLat[0] - cone.lngLat[0];
	const dy = target.lngLat[1] - cone.lngLat[1];

	if (mode === 'image') {
		return Math.atan2(dx, -dy) * (180 / Math.PI);
	}

	const cosLat = Math.cos(cone.lngLat[1] * Math.PI / 180);
	const correctedDx = dx * cosLat;
	return Math.atan2(correctedDx, dy) * (180 / Math.PI);
}
