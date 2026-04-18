// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapInstance = any;

let map = $state<MapInstance | null>(null);
let mode = $state<'map' | 'image'>('map');
let zoom = $state(17);
let markerSize = $state(1.0);
let mapFade = $state(0);

let gridActive = $state(false);
let gridSpacingFt = $state(10);
let gridRotation = $state(0);
let gridLineMode = $state<'light' | 'dark'>('light');

export const mapStore = {
	get map(): MapInstance | null {
		return map;
	},

	get mode() {
		return mode;
	},

	get zoom() {
		return zoom;
	},

	get markerSize() {
		return markerSize;
	},

	get mapFade() {
		return mapFade;
	},

	get gridActive() {
		return gridActive;
	},

	get gridSpacingFt() {
		return gridSpacingFt;
	},

	get gridRotation() {
		return gridRotation;
	},

	get gridLineMode() {
		return gridLineMode;
	},

	setMap(instance: MapInstance): void {
		map = instance;
	},

	setMode(m: 'map' | 'image'): void {
		mode = m;
	},

	setZoom(z: number): void {
		zoom = z;
	},

	setMarkerSize(s: number): void {
		markerSize = s;
	},

	setMapFade(f: number): void {
		mapFade = f;
	},

	setGridActive(a: boolean): void {
		gridActive = a;
	},

	setGridSpacingFt(ft: number): void {
		gridSpacingFt = ft;
	},

	setGridRotation(deg: number): void {
		gridRotation = deg;
	},

	setGridLineMode(m: 'light' | 'dark'): void {
		gridLineMode = m;
	}
};
