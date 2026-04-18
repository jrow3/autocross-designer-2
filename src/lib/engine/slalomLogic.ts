import type { LngLat } from '$lib/types/course';
import { distanceFeet } from './distance';

export interface SlalomConfig {
	count: number;
	spacingFeet?: number;
	totalLengthFeet?: number;
}

export function computeSlalomPositions(
	start: LngLat,
	end: LngLat,
	config: SlalomConfig,
	mode: 'map' | 'image',
	feetPerPixel?: number
): LngLat[] {
	const { count } = config;
	if (count < 2) return [start];

	const dLng = end[0] - start[0];
	const dLat = end[1] - start[1];
	const lineLenCoord = Math.sqrt(dLng * dLng + dLat * dLat);
	const uLng = lineLenCoord > 0 ? dLng / lineLenCoord : 1;
	const uLat = lineLenCoord > 0 ? dLat / lineLenCoord : 0;

	const clickedFeet = distanceFeet(start, end, mode, feetPerPixel);
	const coordPerFoot =
		clickedFeet != null && clickedFeet > 0 ? lineLenCoord / clickedFeet : 0;

	let stepCoord: number;
	if (config.spacingFeet != null && config.spacingFeet > 0 && coordPerFoot > 0) {
		stepCoord = config.spacingFeet * coordPerFoot;
	} else if (config.totalLengthFeet != null && config.totalLengthFeet > 0 && coordPerFoot > 0) {
		stepCoord = (config.totalLengthFeet / (count - 1)) * coordPerFoot;
	} else {
		stepCoord = count > 1 ? lineLenCoord / (count - 1) : 0;
	}

	const positions: LngLat[] = [];
	for (let i = 0; i < count; i++) {
		positions.push([start[0] + uLng * stepCoord * i, start[1] + uLat * stepCoord * i]);
	}
	return positions;
}
