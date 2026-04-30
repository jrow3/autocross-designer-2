<script lang="ts">
	import { onMount } from 'svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { layerStore } from '$lib/stores/layerStore.svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import VenueList from './VenueList.svelte';
	import { haversineFeet } from '$lib/engine/distance';
	import { listMyCourses, loadCourse, deleteCourse, type SavedCourse } from '$lib/services/courseService';
	import { deserialize } from '$lib/engine/courseSerializer';
	import { isSupabaseConfigured } from '$lib/services/supabase';
	import type { LayerKey } from '$lib/stores/layerStore.svelte';
	import type { CourseData } from '$lib/types/course';

	let { onfitcourse }: { onfitcourse?: (data: CourseData) => void } = $props();

	let collapsed = $state(false);
	let myCourses = $state<SavedCourse[]>([]);
	let loadingCourses = $state(false);

	onMount(async () => {
		if (isSupabaseConfigured()) {
			loadingCourses = true;
			myCourses = await listMyCourses();
			loadingCourses = false;
		}
	});

	function coneCount(): number {
		return courseStore.course.cones.length;
	}

	function lineLength(): string {
		const wps = courseStore.course.drivingLine;
		if (wps.length < 2) return '-- ft';
		let total = 0;
		for (let i = 1; i < wps.length; i++) {
			total += haversineFeet(wps[i - 1].lngLat, wps[i].lngLat);
		}
		return `${total.toFixed(0)} ft`;
	}

	function toggleLayer(key: LayerKey) {
		layerStore.toggle(key);
	}

	function flyToNote(lngLat: [number, number]) {
		mapStore.map?.flyTo({ center: lngLat, speed: 2 });
	}

	function flyToWorker(lngLat: [number, number]) {
		mapStore.map?.flyTo({ center: lngLat, speed: 2 });
	}

	function truncate(text: string, max: number): string {
		return text.length > max ? text.substring(0, max) + '...' : text;
	}

	async function openCourse(id: string) {
		const saved = await loadCourse(id);
		if (saved) {
			const data = deserialize(saved.data);
			courseStore.load(data);
			onfitcourse?.(data);
		}
	}

	async function handleDeleteCourse(id: string, title: string) {
		if (!confirm(`Delete "${title}"?`)) return;
		const ok = await deleteCourse(id);
		if (ok) {
			myCourses = myCourses.filter((c) => c.id !== id);
		}
	}
</script>

<aside class="sidebar" class:collapsed>
	<button class="sidebar-toggle" onclick={() => (collapsed = !collapsed)}>
		{collapsed ? '▶' : '◀'}
	</button>

	{#if !collapsed}
		<div class="sidebar-content">
			<section>
				<h3>Course Info</h3>
				<div class="info-row">Cones: {coneCount()}</div>
				<div class="info-row">Line: {lineLength()}</div>
			</section>

			<section>
				<h3>Layers</h3>
				<div class="layers-list">
					{#each layerStore.layers as layer}
						<label class="layer-toggle">
							<input
								type="checkbox"
								checked={layer.visible}
								onchange={() => toggleLayer(layer.key)}
							/>
							<span>{layer.label}</span>
						</label>
					{/each}
				</div>
			</section>

			<section>
				<h3>Marker Size</h3>
				<div class="size-slider">
					<input
						type="range"
						min="0.5"
						max="2"
						step="0.05"
						value={mapStore.markerSize}
						oninput={(e) => mapStore.setMarkerSize(parseFloat((e.target as HTMLInputElement).value))}
					/>
					<span class="size-label">{(mapStore.markerSize * 100).toFixed(0)}%</span>
				</div>
			</section>

			<section>
				<h3>Grid Overlay</h3>
				<label class="layer-toggle">
					<input
						type="checkbox"
						checked={mapStore.gridActive}
						onchange={() => mapStore.setGridActive(!mapStore.gridActive)}
					/>
					<span>Show Grid</span>
				</label>
				{#if mapStore.gridActive}
					<div class="control-row">
						<label>Spacing</label>
						<div class="input-row">
							<input
								type="number"
								min="1"
								max="500"
								step="1"
								value={mapStore.gridSpacingFt}
								onchange={(e) => mapStore.setGridSpacingFt(parseFloat((e.target as HTMLInputElement).value) || 10)}
							/>
							<span class="unit">ft</span>
						</div>
					</div>
					<div class="control-row">
						<label>Rotation</label>
						<div class="input-row">
							<input
								type="number"
								min="-180"
								max="180"
								step="1"
								value={mapStore.gridRotation}
								onchange={(e) => mapStore.setGridRotation(parseFloat((e.target as HTMLInputElement).value) || 0)}
							/>
							<span class="unit">°</span>
						</div>
					</div>
					<div class="control-row">
						<label>Lines</label>
						<div class="toggle-btns">
							<button
								class="toggle-btn"
								class:active={mapStore.gridLineMode === 'light'}
								onclick={() => mapStore.setGridLineMode('light')}
							>Light</button>
							<button
								class="toggle-btn"
								class:active={mapStore.gridLineMode === 'dark'}
								onclick={() => mapStore.setGridLineMode('dark')}
							>Dark</button>
						</div>
					</div>
				{/if}
			</section>

			<section>
				<h3>Map Fade</h3>
				<div class="size-slider">
					<input
						type="range"
						min="0"
						max="100"
						step="5"
						value={mapStore.mapFade}
						oninput={(e) => mapStore.setMapFade(parseFloat((e.target as HTMLInputElement).value))}
					/>
					<span class="size-label">{mapStore.mapFade}%</span>
				</div>
			</section>

			<section>
				<h3>Notes</h3>
				{#if courseStore.course.notes.length === 0}
					<div class="empty-text">No notes</div>
				{:else}
					<div class="item-list">
						{#each courseStore.course.notes as note}
							<button
								class="list-item"
								onclick={() => flyToNote(note.lngLat as [number, number])}
							>
								<span class="item-badge badge-note">{note.number}</span>
								<span class="item-text">{truncate(note.text, 30)}</span>
							</button>
						{/each}
					</div>
				{/if}
			</section>

			<section>
				<h3>Workers</h3>
				{#if courseStore.course.workers.length === 0}
					<div class="empty-text">No worker stations</div>
				{:else}
					<div class="item-list">
						{#each courseStore.course.workers as worker}
							<button
								class="list-item"
								onclick={() => flyToWorker(worker.lngLat as [number, number])}
							>
								<span class="item-badge badge-worker">{worker.number}</span>
								<span class="item-text">{worker.name ?? `Station ${worker.number}`}</span>
							</button>
						{/each}
					</div>
				{/if}
			</section>

				{#if isSupabaseConfigured()}
					<section>
						<h3>My Courses</h3>
						{#if loadingCourses}
							<div class="empty-text">Loading...</div>
						{:else if myCourses.length === 0}
							<div class="empty-text">No saved courses</div>
						{:else}
							<div class="item-list">
								{#each myCourses as c}
									<div class="course-item">
										<button class="list-item" onclick={() => openCourse(c.id)}>
											<span class="item-text">{c.title}</span>
										</button>
										<button class="course-delete" onclick={() => handleDeleteCourse(c.id, c.title)} title="Delete">&times;</button>
									</div>
								{/each}
							</div>
						{/if}
					</section>
				{/if}

				<VenueList />
			</div>
		{/if}
</aside>

<style>
	.sidebar {
		width: 200px;
		background: var(--bg-base);
		border-left: 1px solid var(--bg-surface);
		display: flex;
		flex-direction: column;
		position: relative;
		transition: width 0.2s;
	}

	.sidebar.collapsed {
		width: 32px;
	}

	.sidebar-toggle {
		position: absolute;
		top: 8px;
		left: 4px;
		width: 24px;
		height: 24px;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
	}

	.sidebar-content {
		padding: 40px 12px 12px;
		overflow-y: auto;
		flex: 1;
	}

	section {
		margin-bottom: 16px;
	}

	h3 {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		color: #64748b;
		letter-spacing: 0.05em;
		margin-bottom: 6px;
	}

	.info-row {
		font-size: 13px;
		color: #cbd5e1;
		padding: 2px 0;
	}

	.layers-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.layer-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0;
		font-size: 13px;
		color: #cbd5e1;
		cursor: pointer;
	}

	.layer-toggle input {
		width: 14px;
		height: 14px;
		accent-color: #3b82f6;
	}

	.size-slider {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.size-slider input[type="range"] {
		flex: 1;
		accent-color: #3b82f6;
		height: 4px;
	}

	.size-label {
		font-size: 11px;
		color: #94a3b8;
		min-width: 32px;
		text-align: right;
	}

	.control-row {
		display: flex;
		flex-direction: column;
		gap: 3px;
		margin-top: 6px;
	}

	.control-row label {
		font-size: 12px;
		color: #94a3b8;
	}

	.input-row {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.input-row input {
		width: 60px;
		padding: 3px 6px;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 3px;
		color: #e2e8f0;
		font-size: 12px;
		text-align: center;
	}

	.input-row input:focus {
		border-color: #3b82f6;
		outline: none;
	}

	.unit {
		font-size: 11px;
		color: #64748b;
	}

	.toggle-btns {
		display: flex;
		gap: 4px;
	}

	.toggle-btn {
		flex: 1;
		padding: 3px 8px;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 3px;
		color: #94a3b8;
		font-size: 11px;
		cursor: pointer;
	}

	.toggle-btn.active {
		background: #1e3a5f;
		border-color: #3b82f6;
		color: #e2e8f0;
	}

	.empty-text {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.4);
	}

	.item-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.list-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		background: rgba(255, 255, 255, 0.08);
		border: none;
		border-radius: 4px;
		font-size: 13px;
		color: #cbd5e1;
		cursor: pointer;
		text-align: left;
		width: 100%;
	}

	.list-item:hover {
		background: rgba(59, 130, 246, 0.2);
	}

	.item-badge {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		font-weight: bold;
		color: #fff;
		flex-shrink: 0;
	}

	.badge-note {
		background: #8b5cf6;
	}

	.badge-worker {
		background: #3b82f6;
	}

	.item-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.course-item {
		display: flex;
		gap: 4px;
	}

	.course-delete {
		padding: 4px 8px;
		background: none;
		border: none;
		color: #64748b;
		cursor: pointer;
		font-size: 16px;
	}

	.course-delete:hover {
		color: #ef4444;
	}
</style>
