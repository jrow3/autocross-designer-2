import type { CourseData } from '$lib/types/course';

const SCHEMA_VERSION = 1;
const MAX_ITEMS = 5000;

const ARRAY_FIELDS = [
	'cones',
	'drivingLine',
	'measurements',
	'notes',
	'obstacles',
	'workers',
	'courseOutline',
	'sketches',
	'stagingAreas',
	'workerZones',
	'hazardMarkers'
] as const;

export function emptyCourse(): CourseData {
	return {
		schemaVersion: SCHEMA_VERSION,
		cones: [],
		drivingLine: [],
		measurements: [],
		notes: [],
		obstacles: [],
		workers: [],
		courseOutline: [],
		sketches: [],
		stagingAreas: [],
		workerZones: [],
		hazardMarkers: [],
		coneNumbers: {},
		mapCenter: [-96.7694672, 40.8446702],
		mapZoom: 18
	};
}

export function migrate(data: Record<string, unknown>): Record<string, unknown> {
	if (!data || typeof data !== 'object') return data;
	if (!data.schemaVersion) {
		data.schemaVersion = 1;
	}
	return data;
}

export function validate(data: Record<string, unknown>): Record<string, unknown> {
	if (data == null || typeof data !== 'object') return data;

	sanitizePrototypeKeys(data, 0);

	for (const f of ARRAY_FIELDS) {
		if (data[f] != null && !Array.isArray(data[f])) {
			console.warn('validate: dropping non-array field', f);
			delete data[f];
		}
	}

	for (const f of ARRAY_FIELDS) {
		const arr = data[f];
		if (Array.isArray(arr) && arr.length > MAX_ITEMS) {
			console.warn('validate: truncating field', f, 'from', arr.length, 'to', MAX_ITEMS);
			data[f] = arr.slice(0, MAX_ITEMS);
		}
	}

	if (data.coneNumbers != null && (typeof data.coneNumbers !== 'object' || Array.isArray(data.coneNumbers))) {
		data.coneNumbers = {};
	}

	return data;
}

function sanitizePrototypeKeys(obj: Record<string, unknown>, depth: number): void {
	if (depth > 10 || obj == null || typeof obj !== 'object') return;
	for (const key of Object.keys(obj)) {
		if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
			delete obj[key];
			continue;
		}
		sanitizePrototypeKeys(obj[key] as Record<string, unknown>, depth + 1);
	}
}

export function deserialize(raw: unknown): CourseData {
	const data = validate(migrate(raw as Record<string, unknown>));
	const empty = emptyCourse();
	return {
		...empty,
		...(data as Partial<CourseData>),
		schemaVersion: SCHEMA_VERSION
	};
}
