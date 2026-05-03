import { courseStore } from './courseStore.svelte';

export type SelectableType = 'cone' | 'worker' | 'measurement' | 'outline' | 'hazard' | 'staging-area' | 'worker-zone' | 'sketch';

export interface SelectedItem {
	type: SelectableType;
	id: string;
}

let selected = $state<SelectedItem[]>([]);
let boxActive = $state(false);
let boxStart = $state({ x: 0, y: 0 });
let boxEnd = $state({ x: 0, y: 0 });

export const selectionStore = {
	get selected() {
		return selected;
	},

	get count() {
		return selected.length;
	},

	get boxActive() {
		return boxActive;
	},

	get boxRect() {
		const x1 = Math.min(boxStart.x, boxEnd.x);
		const y1 = Math.min(boxStart.y, boxEnd.y);
		const x2 = Math.max(boxStart.x, boxEnd.x);
		const y2 = Math.max(boxStart.y, boxEnd.y);
		return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
	},

	isSelected(type: SelectableType, id: string): boolean {
		return selected.some((s) => s.type === type && s.id === id);
	},

	select(type: SelectableType, id: string): void {
		if (!this.isSelected(type, id)) {
			selected.push({ type, id });
		}
	},

	toggle(type: SelectableType, id: string): void {
		const idx = selected.findIndex((s) => s.type === type && s.id === id);
		if (idx !== -1) {
			selected.splice(idx, 1);
		} else {
			selected.push({ type, id });
		}
	},

	clear(): void {
		selected.length = 0;
	},

	selectAll(): void {
		selected.length = 0;
		for (const c of courseStore.course.cones) {
			selected.push({ type: 'cone', id: c.id });
		}
		for (const w of courseStore.course.workers) {
			selected.push({ type: 'worker', id: w.id });
		}
		courseStore.course.measurements.forEach((_, i) => {
			selected.push({ type: 'measurement', id: String(i) });
		});
		courseStore.course.courseOutline.forEach((_, i) => {
			selected.push({ type: 'outline', id: String(i) });
		});
	},

	deleteSelected(): void {
		if (selected.length === 0) return;
		courseStore.pushUndo();
		// Delete in reverse index order for measurements/outlines to avoid index shifting
		const measurements = selected.filter(s => s.type === 'measurement').map(s => parseInt(s.id)).sort((a, b) => b - a);
		const outlines = selected.filter(s => s.type === 'outline').map(s => parseInt(s.id)).sort((a, b) => b - a);
		for (const item of selected) {
			switch (item.type) {
				case 'cone':
					courseStore.removeCone(item.id);
					break;
				case 'worker':
					courseStore.removeWorker(item.id);
					break;
				case 'hazard':
					courseStore.removeHazardMarker(item.id);
					break;
				case 'staging-area':
					courseStore.removeStagingArea(item.id);
					break;
				case 'worker-zone':
					courseStore.removeWorkerZone(item.id);
					break;
				case 'sketch':
					courseStore.removeSketch(item.id);
					break;
			}
		}
		for (const idx of measurements) {
			courseStore.removeMeasurement(idx);
		}
		for (const idx of outlines) {
			courseStore.removeOutlineSegment(idx);
		}
		selected.length = 0;
	},

	startBox(x: number, y: number): void {
		boxActive = true;
		boxStart = { x, y };
		boxEnd = { x, y };
	},

	updateBox(x: number, y: number): void {
		boxEnd = { x, y };
	},

	endBox(): void {
		boxActive = false;
	}
};
