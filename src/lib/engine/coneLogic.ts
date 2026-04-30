import type { LngLat, ConeData } from '$lib/types/course';
import { feetToLngLatOffset, feetToPixelOffset } from './distance';

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

const POINTER_OFFSET_FEET = 5;

export function offsetPointerPosition(
	clickLngLat: LngLat,
	cones: ConeData[],
	mode: 'map' | 'image',
	feetPerPixel?: number
): LngLat {
	const nearest = findNearestRegularCone(clickLngLat, cones);
	if (!nearest) return clickLngLat;

	const dx = clickLngLat[0] - nearest.lngLat[0];
	const dy = clickLngLat[1] - nearest.lngLat[1];

	if (dx === 0 && dy === 0) return clickLngLat;

	let angleDeg: number;
	if (mode === 'image') {
		angleDeg = Math.atan2(dx, -dy) * (180 / Math.PI);
		if (feetPerPixel == null) return clickLngLat;
		return feetToPixelOffset(nearest.lngLat, angleDeg, POINTER_OFFSET_FEET, feetPerPixel);
	}

	const cosLat = Math.cos(nearest.lngLat[1] * Math.PI / 180);
	const correctedDx = dx * cosLat;
	angleDeg = Math.atan2(correctedDx, dy) * (180 / Math.PI);
	return feetToLngLatOffset(nearest.lngLat, angleDeg, POINTER_OFFSET_FEET);
}
