import type { LngLat } from '$lib/types/course';

export function catmullRomSpline(points: LngLat[], segmentsPerSpan = 16): LngLat[] {
	if (points.length < 2) return points.slice();

	const result: LngLat[] = [];

	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[i === 0 ? 0 : i - 1];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

		for (let t = 0; t < segmentsPerSpan; t++) {
			const s = t / segmentsPerSpan;
			const s2 = s * s;
			const s3 = s2 * s;

			const x =
				0.5 *
				(2 * p1[0] +
					(-p0[0] + p2[0]) * s +
					(2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 +
					(-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3);

			const y =
				0.5 *
				(2 * p1[1] +
					(-p0[1] + p2[1]) * s +
					(2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 +
					(-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3);

			result.push([x, y]);
		}
	}

	result.push(points[points.length - 1]);
	return result;
}
