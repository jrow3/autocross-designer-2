<script lang="ts">
	import { createMarker, wrapForMapbox, type AnyMarker } from '$lib/engine/markerFactory';
	import { onMount } from 'svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { selectionStore } from '$lib/stores/selectionStore.svelte';
	import type { WorkerData } from '$lib/types/course';

	let { worker }: { worker: WorkerData } = $props();

	let marker: AnyMarker | null = null;
	let numberSpan: HTMLSpanElement | null = null;
	let markerEl: HTMLDivElement | null = null;

	function showContextMenu(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();

		const existing = document.querySelector('.worker-context-menu');
		existing?.remove();

		const menu = document.createElement('div');
		menu.className = 'worker-context-menu';
		menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;z-index:1000;`;

		const renameBtn = document.createElement('button');
		renameBtn.textContent = 'Rename';
		renameBtn.onclick = () => { menu.remove(); showRenameInput(e.clientX, e.clientY); };

		const deleteBtn = document.createElement('button');
		deleteBtn.textContent = 'Delete';
		deleteBtn.onclick = () => {
			menu.remove();
			courseStore.pushUndo();
			courseStore.removeWorker(worker.id);
		};

		menu.appendChild(renameBtn);
		menu.appendChild(deleteBtn);
		document.body.appendChild(menu);

		const dismiss = (ev: MouseEvent) => {
			if (!menu.contains(ev.target as Node)) {
				menu.remove();
				document.removeEventListener('mousedown', dismiss);
			}
		};
		setTimeout(() => document.addEventListener('mousedown', dismiss), 0);
	}

	function showRenameInput(x: number, y: number) {
		const popup = document.createElement('div');
		popup.className = 'worker-rename-popup';
		popup.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:1000;`;

		const input = document.createElement('input');
		input.type = 'text';
		input.value = worker.name ?? String(worker.number);
		input.onkeydown = (e) => {
			if (e.key === 'Enter') {
				courseStore.pushUndo();
				courseStore.updateWorkerName(worker.id, input.value.trim());
				popup.remove();
			}
			if (e.key === 'Escape') popup.remove();
		};

		popup.appendChild(input);
		document.body.appendChild(popup);
		input.focus();
		input.select();

		const dismiss = (ev: MouseEvent) => {
			if (!popup.contains(ev.target as Node)) {
				popup.remove();
				document.removeEventListener('mousedown', dismiss);
			}
		};
		setTimeout(() => document.addEventListener('mousedown', dismiss), 0);
	}

	onMount(() => {
		const map = mapStore.map;
		if (!map) return;

		const el = document.createElement('div');
		el.className = 'worker-marker';
		markerEl = el;

		numberSpan = document.createElement('span');
		numberSpan.className = 'worker-number';
		numberSpan.textContent = worker.name ?? String(worker.number);
		el.appendChild(numberSpan);

		const wrapper = wrapForMapbox(el);

		marker = createMarker({ element: wrapper, draggable: true })
			.setLngLat(worker.lngLat as [number, number])
			.addTo(map);

		marker.on('dragstart', () => {
			courseStore.pushUndo();
		});

		marker.on('dragend', () => {
			const pos = marker!.getLngLat();
			courseStore.updateWorkerPosition(worker.id, [pos.lng, pos.lat]);
		});

		wrapper.addEventListener('contextmenu', showContextMenu);

		return () => {
			marker?.remove();
		};
	});

	$effect(() => {
		if (marker) {
			const [lng, lat] = worker.lngLat;
			const current = marker.getLngLat();
			if (Math.abs(current.lng - lng) > 1e-8 || Math.abs(current.lat - lat) > 1e-8) {
				marker.setLngLat([lng, lat]);
			}
		}
		if (numberSpan) {
			numberSpan.textContent = worker.name ?? String(worker.number);
		}
	});

	$effect(() => {
		if (markerEl) {
			markerEl.classList.toggle('multi-selected', selectionStore.isSelected('worker', worker.id));
		}
	});
</script>

<style>
	:global(.worker-marker) {
		width: 24px;
		height: 24px;
		background: #7c3aed;
		border: 2px solid #fff;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transform: scale(var(--marker-scale, 1));
	}

	:global(.worker-number) {
		color: #fff;
		font-size: 11px;
		font-weight: bold;
		line-height: 1;
	}

	:global(.worker-context-menu) {
		background: var(--bg-surface, #1e293b);
		border: 1px solid var(--border, #334155);
		border-radius: 6px;
		padding: 4px;
		display: flex;
		flex-direction: column;
		min-width: 100px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
	}

	:global(.worker-context-menu button) {
		padding: 6px 12px;
		background: none;
		border: none;
		color: var(--text-secondary, #cbd5e1);
		font-size: 13px;
		cursor: pointer;
		text-align: left;
		border-radius: 4px;
	}

	:global(.worker-context-menu button:hover) {
		background: var(--bg-hover, #334155);
	}

	:global(.worker-rename-popup) {
		background: var(--bg-surface, #1e293b);
		border: 1px solid var(--border, #334155);
		border-radius: 6px;
		padding: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
	}

	:global(.worker-rename-popup input) {
		padding: 4px 8px;
		background: var(--bg-base, #0f172a);
		border: 1px solid var(--border-focus, #3b82f6);
		border-radius: 4px;
		color: var(--text-primary, #e2e8f0);
		font-size: 13px;
		outline: none;
		width: 120px;
	}
</style>
