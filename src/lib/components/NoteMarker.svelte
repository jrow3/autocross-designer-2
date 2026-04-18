<script lang="ts">
	import { createMarker, wrapForMapbox, type AnyMarker } from '$lib/engine/markerFactory';
	import { onMount } from 'svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import type { NoteData } from '$lib/types/course';

	let { note }: { note: NoteData } = $props();

	let marker: AnyMarker | null = null;
	let numberSpan: HTMLSpanElement | null = null;
	let innerEl: HTMLDivElement | null = null;

	onMount(() => {
		const map = mapStore.map;
		if (!map) return;

		const el = document.createElement('div');
		el.className = 'note-marker';
		el.title = note.text;
		innerEl = el;

		numberSpan = document.createElement('span');
		numberSpan.className = 'note-number';
		numberSpan.textContent = String(note.number);
		el.appendChild(numberSpan);

		const wrapper = wrapForMapbox(el);

		marker = createMarker({ element: wrapper, draggable: true })
			.setLngLat(note.lngLat as [number, number])
			.addTo(map);

		marker.on('dragstart', () => {
			courseStore.pushUndo();
		});

		marker.on('dragend', () => {
			const pos = marker!.getLngLat();
			courseStore.updateNotePosition(note.id, [pos.lng, pos.lat]);
		});

		wrapper.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			courseStore.pushUndo();
			courseStore.removeNote(note.id);
		});

		return () => {
			marker?.remove();
		};
	});

	$effect(() => {
		if (marker) {
			const [lng, lat] = note.lngLat;
			const current = marker.getLngLat();
			if (Math.abs(current.lng - lng) > 1e-8 || Math.abs(current.lat - lat) > 1e-8) {
				marker.setLngLat([lng, lat]);
			}
			if (innerEl) innerEl.title = note.text;
		}
	});
</script>

<style>
	:global(.note-marker) {
		width: 22px;
		height: 22px;
		background: #0ea5e9;
		border: 2px solid #fff;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transform: scale(var(--marker-scale, 1));
	}

	:global(.note-number) {
		color: #fff;
		font-size: 11px;
		font-weight: bold;
		line-height: 1;
	}
</style>
