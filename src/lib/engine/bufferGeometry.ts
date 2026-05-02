import type { LngLat } from '$lib/types/course';

const EARTH_RADIUS_M = 6371000;
const FT_PER_M = 0.3048;

function feetToDegreesLat(feet: number): number {
	const meters = feet * FT_PER_M;
	return (meters / EARTH_RADIUS_M) * (180 / Math.PI);
}

function feetToDegreesLng(feet: number, lat: number): number {
	const meters = feet * FT_PER_M;
	const latRad = (lat * Math.PI) / 180;
	return (meters / (EARTH_RADIUS_M * Math.cos(latRad))) * (180 / Math.PI);
}

export function pointBuffer(center: LngLat, bufferFeet: number, segments = 32): LngLat[] {
	const dlat = feetToDegreesLat(bufferFeet);
	const dlng = feetToDegreesLng(bufferFeet, center[1]);
	const points: LngLat[] = [];
	for (let i = 0; i < segments; i++) {
		const angle = (2 * Math.PI * i) / segments;
		points.push([center[0] + dlng * Math.cos(angle), center[1] + dlat * Math.sin(angle)]);
	}
	return points;
}

export function lineBuffer(points: LngLat[], bufferFeet: number, segments = 16): LngLat[] {
	if (points.length < 2) return pointBuffer(points[0], bufferFeet, segments);

	const left: LngLat[] = [];
	const right: LngLat[] = [];

	for (let i = 0; i < points.length - 1; i++) {
		const p1 = points[i];
		const p2 = points[i + 1];
		const dx = p2[0] - p1[0];
		const dy = p2[1] - p1[1];
		const len = Math.sqrt(dx * dx + dy * dy);
		const nx = -dy / len;
		const ny = dx / len;

		const dlat = feetToDegreesLat(bufferFeet);
		const dlng = feetToDegreesLng(bufferFeet, p1[1]);
		const ox = nx * dlng;
		const oy = ny * dlat;

		if (i === 0) {
			left.push([p1[0] + ox, p1[1] + oy]);
			right.push([p1[0] - ox, p1[1] - oy]);
		}
		left.push([p2[0] + ox, p2[1] + oy]);
		right.push([p2[0] - ox, p2[1] - oy]);
	}

	const endPt = points[points.length - 1];
	const endDlng = feetToDegreesLng(bufferFeet, endPt[1]);
	const endDlat = feetToDegreesLat(bufferFeet);

	const lastSeg = points[points.length - 2];
	const endDx = endPt[0] - lastSeg[0];
	const endDy = endPt[1] - lastSeg[1];
	const endLen = Math.sqrt(endDx * endDx + endDy * endDy);
	const endAngle = Math.atan2(endDy / endDlat, endDx / endDlng);

	const endCap: LngLat[] = [];
	for (let i = 0; i <= segments; i++) {
		const a = endAngle - Math.PI / 2 + (Math.PI * i) / segments;
		endCap.push([endPt[0] + endDlng * Math.cos(a), endPt[1] + endDlat * Math.sin(a)]);
	}

	const startPt = points[0];
	const startDlng = feetToDegreesLng(bufferFeet, startPt[1]);
	const startDlat = feetToDegreesLat(bufferFeet);

	const nextSeg = points[1];
	const startDx = startPt[0] - nextSeg[0];
	const startDy = startPt[1] - nextSeg[1];
	const startLen = Math.sqrt(startDx * startDx + startDy * startDy);
	const startAngle = Math.atan2(startDy / startDlat, startDx / startDlng);

	const startCap: LngLat[] = [];
	for (let i = 0; i <= segments; i++) {
		const a = startAngle - Math.PI / 2 + (Math.PI * i) / segments;
		startCap.push([startPt[0] + startDlng * Math.cos(a), startPt[1] + startDlat * Math.sin(a)]);
	}

	return [...left, ...endCap, ...[...right].reverse(), ...startCap];
}
