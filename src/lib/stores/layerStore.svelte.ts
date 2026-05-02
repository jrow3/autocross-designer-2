export type LayerKey =
	| 'cones'
	| 'obstacles'
	| 'workers'
	| 'drivingLine'
	| 'measurements'
	| 'notes'
	| 'courseOutline'
	| 'sketches'
	| 'grid'
	| 'stagingAreas'
	| 'workerZones'
	| 'safetyZones'
	| 'coneNumbers';

export interface Layer {
	key: LayerKey;
	label: string;
	visible: boolean;
}

const layers = $state<Layer[]>([
	{ key: 'cones', label: 'Cones', visible: true },
	{ key: 'obstacles', label: 'Obstacles', visible: true },
	{ key: 'workers', label: 'Workers', visible: true },
	{ key: 'drivingLine', label: 'Driving Line', visible: true },
	{ key: 'measurements', label: 'Measurements', visible: true },
	{ key: 'notes', label: 'Notes', visible: true },
	{ key: 'courseOutline', label: 'Course Outline', visible: true },
	{ key: 'sketches', label: 'Sketches', visible: true },
	{ key: 'grid', label: 'Grid', visible: true },
	{ key: 'stagingAreas' as LayerKey, label: 'Staging Areas', visible: true },
	{ key: 'workerZones' as LayerKey, label: 'Worker Zones', visible: true },
	{ key: 'safetyZones' as LayerKey, label: 'Safety Zones', visible: true },
	{ key: 'coneNumbers' as LayerKey, label: 'Cone Numbers', visible: false }
]);

export const layerStore = {
	get layers() {
		return layers;
	},

	isVisible(key: LayerKey): boolean {
		return layers.find((l) => l.key === key)?.visible ?? true;
	},

	toggle(key: LayerKey): void {
		const layer = layers.find((l) => l.key === key);
		if (layer) layer.visible = !layer.visible;
	},

	setVisible(key: LayerKey, visible: boolean): void {
		const layer = layers.find((l) => l.key === key);
		if (layer) layer.visible = visible;
	}
};
