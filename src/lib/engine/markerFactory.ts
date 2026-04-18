import mapboxgl from 'mapbox-gl';
import { ImageMarker } from './imageMap';
import { mapStore } from '$lib/stores/mapStore.svelte';

interface MarkerOptions {
	element: HTMLElement;
	draggable?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMarker = any;

export function createMarker(opts: MarkerOptions): AnyMarker {
	if (mapStore.mode === 'image') {
		return new ImageMarker(opts);
	}
	return new mapboxgl.Marker(opts);
}

/**
 * Wraps a visual element in a plain div so Mapbox can control the wrapper's
 * transform for positioning, while the inner element keeps its own CSS transform
 * (e.g. scale) without conflict.
 */
export function wrapForMapbox(inner: HTMLElement): HTMLDivElement {
	if (mapStore.mode === 'image') return inner as HTMLDivElement;
	const wrapper = document.createElement('div');
	wrapper.style.cssText = 'cursor:pointer;';
	wrapper.appendChild(inner);
	return wrapper;
}
