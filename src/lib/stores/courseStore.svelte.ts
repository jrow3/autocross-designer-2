import { type CourseData, type ConeData, type ObstacleData, type WorkerData, type NoteData, type WaypointData, type MeasurementData, type OutlineSegmentData, type SketchData, type LngLat, type StagingAreaData, type WorkerZoneData, type HazardMarkerData, type ConeNumberMap } from '$lib/types/course';
import { emptyCourse } from '$lib/engine/courseSerializer';

const MAX_SNAPSHOTS = 50;

let course = $state<CourseData>(emptyCourse());
let undoStack = $state<string[]>([]);
let redoStack = $state<string[]>([]);

function snapshot(): string {
	return JSON.stringify(course);
}

function restore(json: string): void {
	const data = JSON.parse(json) as CourseData;
	course.cones = data.cones;
	course.drivingLine = data.drivingLine;
	course.measurements = data.measurements;
	course.notes = data.notes;
	course.obstacles = data.obstacles;
	course.workers = data.workers;
	course.courseOutline = data.courseOutline;
	course.sketches = data.sketches;
	course.stagingAreas = data.stagingAreas;
	course.workerZones = data.workerZones;
	course.hazardMarkers = data.hazardMarkers;
	course.coneNumbers = data.coneNumbers;
}

export const courseStore = {
	get course() {
		return course;
	},

	get canUndo() {
		return undoStack.length > 0;
	},

	get canRedo() {
		return redoStack.length > 0;
	},

	pushUndo(): void {
		undoStack.push(snapshot());
		if (undoStack.length > MAX_SNAPSHOTS) {
			undoStack.shift();
		}
		redoStack.length = 0;
	},

	undo(): void {
		if (undoStack.length === 0) return;
		redoStack.push(snapshot());
		restore(undoStack.pop()!);
	},

	redo(): void {
		if (redoStack.length === 0) return;
		undoStack.push(snapshot());
		restore(redoStack.pop()!);
	},

	addCone(cone: ConeData): void {
		course.cones.push(cone);
	},

	removeCone(id: string): void {
		const idx = course.cones.findIndex((c) => c.id === id);
		if (idx !== -1) course.cones.splice(idx, 1);
	},

	updateConePosition(id: string, lngLat: LngLat): void {
		const cone = course.cones.find((c) => c.id === id);
		if (cone) cone.lngLat = lngLat;
	},

	updateConeDimensions(id: string, width: number, height: number): void {
		const cone = course.cones.find((c) => c.id === id);
		if (cone) {
			cone.width = width;
			cone.height = height;
		}
	},

	updateConeRotation(id: string, rotation: number): void {
		const cone = course.cones.find((c) => c.id === id);
		if (cone) cone.rotation = rotation;
	},

	addObstacle(obstacle: ObstacleData): void {
		course.obstacles.push(obstacle);
	},

	removeObstacle(id: string): void {
		const idx = course.obstacles.findIndex((o) => o.id === id);
		if (idx !== -1) course.obstacles.splice(idx, 1);
	},

	updateObstaclePosition(id: string, lngLat: LngLat): void {
		const obs = course.obstacles.find((o) => o.id === id);
		if (obs) obs.lngLat = lngLat;
	},

	addWorker(worker: WorkerData): void {
		course.workers.push(worker);
	},

	removeWorker(id: string): void {
		const idx = course.workers.findIndex((w) => w.id === id);
		if (idx !== -1) {
			course.workers.splice(idx, 1);
			course.workers.forEach((w, i) => (w.number = i + 1));
		}
	},

	updateWorkerPosition(id: string, lngLat: LngLat): void {
		const w = course.workers.find((w) => w.id === id);
		if (w) w.lngLat = lngLat;
	},

	updateWorkerName(id: string, name: string): void {
		const w = course.workers.find((w) => w.id === id);
		if (w) w.name = name || undefined;
	},

	addNote(note: NoteData): void {
		course.notes.push(note);
	},

	removeNote(id: string): void {
		const idx = course.notes.findIndex((n) => n.id === id);
		if (idx !== -1) course.notes.splice(idx, 1);
	},

	updateNotePosition(id: string, lngLat: LngLat): void {
		const n = course.notes.find((n) => n.id === id);
		if (n) n.lngLat = lngLat;
	},

	addWaypoint(wp: WaypointData): void {
		course.drivingLine.push(wp);
	},

	removeWaypoint(index: number): void {
		course.drivingLine.splice(index, 1);
	},

	updateWaypointPosition(index: number, lngLat: LngLat): void {
		if (course.drivingLine[index]) course.drivingLine[index].lngLat = lngLat;
	},

	clearDrivingLine(): void {
		course.drivingLine.length = 0;
	},

	addMeasurement(m: MeasurementData): void {
		course.measurements.push(m);
	},

	removeMeasurement(index: number): void {
		course.measurements.splice(index, 1);
	},

	updateMeasurementEndpoint(index: number, endpoint: 0 | 1, lngLat: LngLat): void {
		const m = course.measurements[index];
		if (!m) return;
		if (endpoint === 0) {
			m.p1 = lngLat;
			m.coneId1 = null;
		} else {
			m.p2 = lngLat;
			m.coneId2 = null;
		}
	},

	addOutlineSegment(seg: OutlineSegmentData): void {
		course.courseOutline.push(seg);
	},

	removeOutlineSegment(index: number): void {
		course.courseOutline.splice(index, 1);
	},

	updateOutlineEndpoint(index: number, endpoint: 0 | 1, lngLat: LngLat): void {
		const seg = course.courseOutline[index];
		if (!seg) return;
		if (endpoint === 0) seg.p1 = lngLat;
		else seg.p2 = lngLat;
	},

	updateOutlineControlPoint(index: number, lngLat: LngLat): void {
		const seg = course.courseOutline[index];
		if (seg) seg.cp = lngLat;
	},

	addSketch(sketch: SketchData): void {
		course.sketches.push(sketch);
	},

	removeSketch(id: string): void {
		const idx = course.sketches.findIndex((s) => s.id === id);
		if (idx !== -1) course.sketches.splice(idx, 1);
	},

	addStagingArea(area: StagingAreaData): void {
		this.pushUndo();
		course.stagingAreas.push(area);
	},

	removeStagingArea(id: string): void {
		this.pushUndo();
		course.stagingAreas = course.stagingAreas.filter((a) => a.id !== id);
	},

	updateStagingAreaVertices(id: string, vertices: LngLat[]): void {
		this.pushUndo();
		course.stagingAreas = course.stagingAreas.map((a) => a.id === id ? { ...a, vertices } : a);
	},

	addWorkerZone(zone: WorkerZoneData): void {
		this.pushUndo();
		course.workerZones.push(zone);
	},

	removeWorkerZone(id: string): void {
		this.pushUndo();
		course.workerZones = course.workerZones.filter((z) => z.id !== id);
	},

	updateWorkerZoneVertices(id: string, vertices: LngLat[]): void {
		this.pushUndo();
		course.workerZones = course.workerZones.map((z) => z.id === id ? { ...z, vertices } : z);
	},

	updateWorkerZoneStation(id: string, stationNumber: number): void {
		this.pushUndo();
		course.workerZones = course.workerZones.map((z) => z.id === id ? { ...z, stationNumber } : z);
	},

	addHazardMarker(marker: HazardMarkerData): void {
		this.pushUndo();
		course.hazardMarkers = [...course.hazardMarkers, marker];
	},

	removeHazardMarker(id: string): void {
		this.pushUndo();
		course.hazardMarkers = course.hazardMarkers.filter((m) => m.id !== id);
	},

	updateHazardBuffer(id: string, bufferFeet: number): void {
		this.pushUndo();
		course.hazardMarkers = course.hazardMarkers.map((m) => m.id === id ? { ...m, bufferFeet } : m);
	},

	setConeNumbers(numbers: ConeNumberMap): void {
		this.pushUndo();
		course.coneNumbers = { ...numbers };
	},

	clearConeNumbers(): void {
		this.pushUndo();
		course.coneNumbers = {};
	},

	setMapView(center: LngLat, zoom: number): void {
		course.mapCenter = center;
		course.mapZoom = zoom;
	},

	load(data: CourseData): void {
		// Deduplicate IDs to prevent keyed {#each} crashes
		const seen = new Set<string>();
		let nextDedup = Date.now();
		for (const arr of [data.cones, data.obstacles, data.workers, data.notes, data.sketches ?? []]) {
			for (const item of arr) {
				if (seen.has(item.id)) {
					item.id = String(nextDedup++);
				}
				seen.add(item.id);
			}
		}
		Object.assign(course, data);
		undoStack.length = 0;
		redoStack.length = 0;
	}
};
