type EventCallback = (e: unknown) => void;

interface ImageMapMarkerOptions {
	element: HTMLElement;
	draggable?: boolean;
}

interface LngLatLike {
	lng: number;
	lat: number;
	toArray?: () => [number, number];
}

interface PointLike {
	x: number;
	y: number;
}

export class ImageMarker {
	private _element: HTMLElement;
	private _container: HTMLDivElement;
	private _draggable: boolean;
	private _pos = { lng: 0, lat: 0 };
	private _map: ImageMap | null = null;
	private _listeners: Record<string, EventCallback[]> = {};

	constructor(opts: ImageMapMarkerOptions) {
		this._element = opts.element;
		this._draggable = opts.draggable ?? false;

		this._container = document.createElement('div');
		this._container.style.cssText = 'position:absolute;transform:translate(-50%,-50%);pointer-events:auto;';
		this._container.appendChild(this._element);

		if (this._draggable) this._initDrag();
	}

	setLngLat(coords: [number, number] | LngLatLike): this {
		if (Array.isArray(coords)) {
			this._pos = { lng: coords[0], lat: coords[1] };
		} else {
			this._pos = { lng: coords.lng, lat: coords.lat };
		}
		this._updatePosition();
		return this;
	}

	getLngLat(): LngLatLike {
		return {
			lng: this._pos.lng,
			lat: this._pos.lat,
			toArray: () => [this._pos.lng, this._pos.lat]
		};
	}

	addTo(map: ImageMap): this {
		this._map = map;
		map._addMarker(this);
		this._updatePosition();
		this._updateScale();
		return this;
	}

	remove(): void {
		this._container.remove();
		this._map?._removeMarker(this);
		this._map = null;
	}

	getElement(): HTMLElement {
		return this._element;
	}

	getContainer(): HTMLDivElement {
		return this._container;
	}

	on(event: string, cb: EventCallback): this {
		(this._listeners[event] ??= []).push(cb);
		return this;
	}

	_fire(event: string, data?: unknown): void {
		for (const cb of this._listeners[event] ?? []) cb(data);
	}

	_updatePosition(): void {
		this._container.style.left = `${this._pos.lng}px`;
		this._container.style.top = `${this._pos.lat}px`;
	}

	_updateScale(): void {
		const scale = this._map?._scale ?? 1;
		this._container.style.transform = `translate(-50%,-50%) scale(${1 / scale})`;
	}

	private _initDrag(): void {
		let dragging = false;
		let startX = 0;
		let startY = 0;
		let startLng = 0;
		let startLat = 0;

		const onDown = (e: MouseEvent) => {
			if (e.button !== 0) return;
			e.stopPropagation();
			e.preventDefault();
			dragging = true;
			startX = e.clientX;
			startY = e.clientY;
			startLng = this._pos.lng;
			startLat = this._pos.lat;
			document.addEventListener('mousemove', onMove);
			document.addEventListener('mouseup', onUp);
			this._fire('dragstart');
		};

		const onMove = (e: MouseEvent) => {
			if (!dragging) return;
			const scale = this._map?._scale ?? 1;
			this._pos.lng = startLng + (e.clientX - startX) / scale;
			this._pos.lat = startLat + (e.clientY - startY) / scale;
			this._updatePosition();
			this._fire('drag');
		};

		const onUp = () => {
			dragging = false;
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
			this._fire('dragend');
		};

		this._container.addEventListener('mousedown', onDown);
	}
}

export class ImageMap {
	private _container: HTMLElement;
	private _wrapper: HTMLDivElement;
	private _markerContainer: HTMLDivElement;
	private _img: HTMLImageElement;
	private _listeners: Record<string, EventCallback[]> = {};
	private _markers: ImageMarker[] = [];
	private _sources: Record<string, unknown> = {};
	private _layers: Record<string, unknown> = {};
	private _loaded = false;

	_scale = 1;
	private _offsetX = 0;
	private _offsetY = 0;
	private _feetPerPixel = 0;

	constructor(container: HTMLElement, imageSrc: string) {
		this._container = container;
		this._container.style.cssText += ';overflow:hidden;background:#111;';

		this._wrapper = document.createElement('div');
		this._wrapper.style.cssText = 'position:absolute;top:0;left:0;transform-origin:0 0;';
		this._container.appendChild(this._wrapper);

		this._markerContainer = document.createElement('div');
		this._markerContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
		this._wrapper.appendChild(this._markerContainer);

		this._img = document.createElement('img');
		this._img.style.cssText = 'display:block;user-select:none;-webkit-user-drag:none;';
		this._img.onload = () => {
			this._fitToView();
			this._loaded = true;
			this._fire('load');
		};
		this._img.src = imageSrc;
		this._wrapper.insertBefore(this._img, this._markerContainer);

		this._initPan();
		this._initZoom();
		this._initEvents();
	}

	// Mapbox-compatible API

	project(coords: [number, number] | LngLatLike): PointLike {
		const x = Array.isArray(coords) ? coords[0] : coords.lng;
		const y = Array.isArray(coords) ? coords[1] : coords.lat;
		return {
			x: x * this._scale + this._offsetX,
			y: y * this._scale + this._offsetY
		};
	}

	unproject(point: PointLike): LngLatLike {
		return {
			lng: (point.x - this._offsetX) / this._scale,
			lat: (point.y - this._offsetY) / this._scale
		};
	}

	getCenter(): LngLatLike & { toArray(): [number, number] } {
		const rect = this._container.getBoundingClientRect();
		const center = this.unproject({ x: rect.width / 2, y: rect.height / 2 });
		return { ...center, toArray: () => [center.lng, center.lat] };
	}

	getZoom(): number {
		return Math.log2(this._scale) + 17;
	}

	getBearing(): number {
		return 0;
	}

	loaded(): boolean {
		return this._loaded;
	}

	flyTo(opts: { center?: [number, number]; speed?: number }): void {
		if (opts.center) {
			const rect = this._container.getBoundingClientRect();
			this._offsetX = rect.width / 2 - opts.center[0] * this._scale;
			this._offsetY = rect.height / 2 - opts.center[1] * this._scale;
			this._applyTransform();
			this._fire('move');
		}
	}

	getContainer(): HTMLElement {
		return this._container;
	}

	addControl(): void {}
	removeControl(): void {}

	addSource(id: string, config: unknown): void {
		this._sources[id] = config;
	}

	getSource(id: string): { setData: (data: unknown) => void } | undefined {
		if (!(id in this._sources)) return undefined;
		return {
			setData: (data: unknown) => {
				this._sources[id] = data;
			}
		};
	}

	addLayer(config: { id: string }): void {
		this._layers[config.id] = config;
	}

	getLayer(id: string): unknown {
		return this._layers[id];
	}

	removeLayer(id: string): void {
		delete this._layers[id];
	}

	removeSource(id: string): void {
		delete this._sources[id];
	}

	setPaintProperty(): void {}

	// Scale calibration

	setScale(feetPerPixel: number): void {
		this._feetPerPixel = feetPerPixel;
	}

	getScale(): number {
		return this._feetPerPixel;
	}

	hasScale(): boolean {
		return this._feetPerPixel > 0;
	}

	// Event system

	on(event: string, cb: EventCallback): void {
		(this._listeners[event] ??= []).push(cb);
	}

	off(event: string, cb: EventCallback): void {
		const list = this._listeners[event];
		if (list) {
			const idx = list.indexOf(cb);
			if (idx !== -1) list.splice(idx, 1);
		}
	}

	_fire(event: string, data?: unknown): void {
		for (const cb of this._listeners[event] ?? []) cb(data);
	}

	// Marker management

	_addMarker(marker: ImageMarker): void {
		this._markers.push(marker);
		this._markerContainer.appendChild(marker.getContainer());
	}

	_removeMarker(marker: ImageMarker): void {
		const idx = this._markers.indexOf(marker);
		if (idx !== -1) this._markers.splice(idx, 1);
	}

	// Cleanup

	remove(): void {
		this._wrapper.remove();
		this._listeners = {};
		this._markers = [];
	}

	// Private

	private _fitToView(): void {
		const rect = this._container.getBoundingClientRect();
		const scaleX = rect.width / this._img.naturalWidth;
		const scaleY = rect.height / this._img.naturalHeight;
		this._scale = Math.min(scaleX, scaleY) * 0.9;
		this._offsetX = (rect.width - this._img.naturalWidth * this._scale) / 2;
		this._offsetY = (rect.height - this._img.naturalHeight * this._scale) / 2;
		this._applyTransform();
	}

	private _applyTransform(): void {
		this._wrapper.style.transform = `translate(${this._offsetX}px, ${this._offsetY}px) scale(${this._scale})`;
		for (const m of this._markers) m._updateScale();
	}

	private _initPan(): void {
		let panning = false;
		let startX = 0;
		let startY = 0;
		let startOX = 0;
		let startOY = 0;

		this._container.addEventListener('mousedown', (e) => {
			if (e.button !== 0) return;
			panning = true;
			startX = e.clientX;
			startY = e.clientY;
			startOX = this._offsetX;
			startOY = this._offsetY;
			this._container.style.cursor = 'grabbing';
		});

		document.addEventListener('mousemove', (e) => {
			if (!panning) return;
			this._offsetX = startOX + (e.clientX - startX);
			this._offsetY = startOY + (e.clientY - startY);
			this._applyTransform();
			this._fire('move');
		});

		document.addEventListener('mouseup', () => {
			if (panning) {
				panning = false;
				this._container.style.cursor = '';
				this._fire('moveend');
			}
		});
	}

	private _initZoom(): void {
		this._container.addEventListener('wheel', (e) => {
			e.preventDefault();
			const rect = this._container.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;

			const factor = e.deltaY < 0 ? 1.1 : 0.9;
			const newScale = Math.max(0.05, Math.min(20, this._scale * factor));

			this._offsetX = mx - (mx - this._offsetX) * (newScale / this._scale);
			this._offsetY = my - (my - this._offsetY) * (newScale / this._scale);
			this._scale = newScale;

			this._applyTransform();
			this._fire('zoom');
			this._fire('move');
		}, { passive: false });
	}

	private _initEvents(): void {
		this._container.addEventListener('click', (e) => {
			const target = e.target as HTMLElement;
			if (target.closest('.cone-marker,.waypoint-marker,.note-marker,.obstacle-marker,.worker-marker,.measurement-endpoint,.outline-endpoint,.outline-control')) return;
			const rect = this._container.getBoundingClientRect();
			const imgCoords = this.unproject({ x: e.clientX - rect.left, y: e.clientY - rect.top });
			this._fire('click', { lngLat: imgCoords, point: { x: e.clientX, y: e.clientY } });
		});

		this._container.addEventListener('mousemove', (e) => {
			const rect = this._container.getBoundingClientRect();
			const imgCoords = this.unproject({ x: e.clientX - rect.left, y: e.clientY - rect.top });
			this._fire('mousemove', { lngLat: imgCoords, point: { x: e.clientX, y: e.clientY } });
		});
	}
}
