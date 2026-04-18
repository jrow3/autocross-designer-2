import type { LngLat } from '$lib/types/course';

const EARTH_RADIUS_M = 6371000;
const METERS_TO_FEET = 3.28084;

function toRad(deg: number): number {
	return deg * Math.PI / 180;
}

export function haversineMeters(a: LngLat, b: LngLat): number {
	const [lon1, lat1] = a;
	const [lon2, lat2] = b;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function haversineFeet(a: LngLat, b: LngLat): number {
	return haversineMeters(a, b) * METERS_TO_FEET;
}

export function pixelDistFeet(a: LngLat, b: LngLat, feetPerPixel: number): number {
	const dx = a[0] - b[0];
	const dy = a[1] - b[1];
	return Math.sqrt(dx * dx + dy * dy) * feetPerPixel;
}

export function distanceFeet(
	a: LngLat,
	b: LngLat,
	mode: 'map' | 'image',
	feetPerPixel?: number
): number | null {
	if (mode === 'image') {
		if (feetPerPixel == null) return null;
		return pixelDistFeet(a, b, feetPerPixel);
	}
	return haversineFeet(a, b);
}
