export type LngLat = [number, number];

export type ConeType = 'regular' | 'pointer' | 'start-cone' | 'finish-cone' | 'trailer' | 'staging-grid';

export interface ConeData {
	id: string;
	type: ConeType;
	lngLat: LngLat;
	lockedTargetId: string | null;
	width?: number;
	height?: number;
	rotation?: number;
}

export interface WaypointData {
	lngLat: LngLat;
}

export interface MeasurementData {
	p1: LngLat;
	p2: LngLat;
	coneId1: string | null;
	coneId2: string | null;
}

export interface NoteData {
	id: string;
	number: number;
	text: string;
	lngLat: LngLat;
}

export type ObstacleTypeId = 'pole' | 'drain' | 'curb' | 'building' | 'pothole' | 'hazard';

export interface ObstacleData {
	id: string;
	type: ObstacleTypeId;
	lngLat: LngLat;
}

export interface WorkerData {
	id: string;
	number: number;
	name?: string;
	lngLat: LngLat;
}

export interface OutlineSegmentData {
	p1: LngLat;
	p2: LngLat;
	cp: LngLat;
}

export interface SketchData {
	id: string;
	points: LngLat[];
}

export interface StagingAreaData {
	id: string;
	vertices: LngLat[];
	label: string;
}

export interface WorkerZoneData {
	id: string;
	vertices: LngLat[];
	stationNumber: number;
}

export interface HazardMarkerData {
	id: string;
	type: 'point' | 'line';
	coordinates: LngLat[];
	bufferFeet: number;
}

export type ConeNumberMap = Record<string, string>;

export interface CourseData {
	schemaVersion: number;
	cones: ConeData[];
	drivingLine: WaypointData[];
	measurements: MeasurementData[];
	notes: NoteData[];
	obstacles: ObstacleData[];
	workers: WorkerData[];
	courseOutline: OutlineSegmentData[];
	sketches: SketchData[];
	stagingAreas: StagingAreaData[];
	workerZones: WorkerZoneData[];
	hazardMarkers: HazardMarkerData[];
	coneNumbers: ConeNumberMap;
	mapCenter: LngLat;
	mapZoom: number;
	imageMode?: boolean;
	imageFileName?: string;
	imageScale?: number;
}

export interface VenueData {
	obstacles: ObstacleData[];
	mapCenter: LngLat;
	mapZoom: number;
	mode: 'map' | 'image';
	imageFileName: string | null;
}

export interface ObstacleTypeConfig {
	id: ObstacleTypeId;
	label: string;
	symbol: string;
	color: string;
}
