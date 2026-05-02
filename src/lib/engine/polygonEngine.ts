import type { LngLat } from '$lib/types/course';

export function pointInPolygon(point: LngLat, polygon: LngLat[]): boolean {
	const [x, y] = point;
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const [xi, yi] = polygon[i];
		const [xj, yj] = polygon[j];
		const intersect = ((yi > y) !== (yj > y)) &&
			(x < (xj - xi) * (y - yi) / (yj - yi) + xi);
		if (intersect) inside = !inside;
	}
	return inside;
}

export function polygonToGeoJSON(vertices: LngLat[]): GeoJSON.Feature<GeoJSON.Polygon> {
	const closed = [...vertices, vertices[0]];
	return {
		type: 'Feature',
		properties: {},
		geometry: {
			type: 'Polygon',
			coordinates: [closed]
		}
	};
}

export function lineToGeoJSON(points: LngLat[]): GeoJSON.Feature<GeoJSON.LineString> {
	return {
		type: 'Feature',
		properties: {},
		geometry: {
			type: 'LineString',
			coordinates: points
		}
	};
}

export function verticesCollection(vertices: LngLat[]): GeoJSON.FeatureCollection {
	return {
		type: 'FeatureCollection',
		features: vertices.map((v, i) => ({
			type: 'Feature' as const,
			properties: { index: i },
			geometry: { type: 'Point' as const, coordinates: v }
		}))
	};
}
