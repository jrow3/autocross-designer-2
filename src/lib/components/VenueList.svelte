<script lang="ts">
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import type { VenueData } from '$lib/types/course';

	const STORAGE_KEY = 'autocross-venues';

	let venues = $state<Record<string, VenueData>>(loadVenues());
	let newName = $state('');

	function loadVenues(): Record<string, VenueData> {
		try {
			return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
		} catch {
			return {};
		}
	}

	function saveVenues() {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(venues));
	}

	function saveCurrentVenue() {
		const name = newName.trim();
		if (!name) return;
		venues[name] = {
			obstacles: [...courseStore.course.obstacles],
			mapCenter: courseStore.course.mapCenter,
			mapZoom: courseStore.course.mapZoom,
			mode: 'map',
			imageFileName: courseStore.course.imageFileName ?? null
		};
		saveVenues();
		newName = '';
	}

	function loadVenue(name: string) {
		const v = venues[name];
		if (!v) return;
		courseStore.pushUndo();
		for (const obs of v.obstacles) {
			courseStore.addObstacle({ ...obs, id: String(Date.now() + Math.random()) });
		}
	}

	function deleteVenue(name: string) {
		delete venues[name];
		venues = { ...venues };
		saveVenues();
	}
</script>

<section>
	<h3>Venues</h3>
	<div class="venue-save">
		<input
			type="text"
			bind:value={newName}
			placeholder="Venue name..."
			onkeydown={(e) => e.key === 'Enter' && saveCurrentVenue()}
		/>
		<button class="venue-save-btn" onclick={saveCurrentVenue} disabled={!newName.trim()} title="Save venue">
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
				<polyline points="17 21 17 13 7 13 7 21"/>
				<polyline points="7 3 7 8 15 8"/>
			</svg>
		</button>
	</div>
	{#if Object.keys(venues).length === 0}
		<div class="empty-text">No saved venues</div>
	{:else}
		<div class="venue-list">
			{#each Object.keys(venues) as name}
				<div class="venue-item">
					<button class="venue-load" onclick={() => loadVenue(name)}>{name}</button>
					<button class="venue-delete" onclick={() => deleteVenue(name)} title="Delete">&times;</button>
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	h3 {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		color: #64748b;
		letter-spacing: 0.05em;
		margin-bottom: 6px;
	}

	.venue-save {
		display: flex;
		gap: 4px;
		margin-bottom: 8px;
	}

	.venue-save input {
		flex: 1;
		padding: 3px 6px;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 3px;
		color: #e2e8f0;
		font-size: 12px;
		outline: none;
		height: 24px;
	}

	.venue-save input:focus {
		border-color: #3b82f6;
	}

	.venue-save-btn {
		padding: 3px 6px;
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 3px;
		color: #cbd5e1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		flex-shrink: 0;
	}

	.venue-save-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.empty-text {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.4);
	}

	.venue-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.venue-item {
		display: flex;
		gap: 4px;
	}

	.venue-load {
		flex: 1;
		padding: 6px 8px;
		background: rgba(255, 255, 255, 0.08);
		border: none;
		border-radius: 4px;
		color: #cbd5e1;
		font-size: 13px;
		cursor: pointer;
		text-align: left;
	}

	.venue-load:hover {
		background: rgba(59, 130, 246, 0.2);
	}

	.venue-delete {
		padding: 4px 8px;
		background: none;
		border: none;
		color: #64748b;
		cursor: pointer;
		font-size: 16px;
	}

	.venue-delete:hover {
		color: #ef4444;
	}
</style>
