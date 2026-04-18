<script lang="ts">
	import { toolStore } from '$lib/stores/toolStore.svelte';
	import { OBSTACLE_TYPES } from '$lib/engine/obstacleTypes';
	import type { ObstacleTypeId } from '$lib/types/course';

	function onGateWidthChange(e: Event) {
		const val = parseFloat((e.target as HTMLInputElement).value);
		if (val > 0) toolStore.setGateWidth(val);
	}

	function onObstacleTypeChange(e: Event) {
		toolStore.setObstacleType((e.target as HTMLSelectElement).value as ObstacleTypeId);
	}
</script>

{#if toolStore.activeTool === 'gate'}
	<div class="settings-panel">
		<div class="settings-header">Gate Settings</div>
		<div class="settings-field">
			<label for="gate-width-setting">Width</label>
			<div class="input-row">
				<input
					type="number"
					id="gate-width-setting"
					min="1"
					max="100"
					step="1"
					value={toolStore.gateWidthFeet}
					onchange={onGateWidthChange}
				/>
				<span class="unit">ft</span>
			</div>
		</div>
	</div>
{:else if toolStore.activeTool === 'obstacle'}
	<div class="settings-panel">
		<div class="settings-header">Obstacle Type</div>
		<select
			class="type-select"
			value={toolStore.selectedObstacleType}
			onchange={onObstacleTypeChange}
		>
			{#each OBSTACLE_TYPES as ot}
				<option value={ot.id}>{ot.symbol} {ot.label}</option>
			{/each}
		</select>
	</div>
{/if}

<style>
	.settings-panel {
		padding: 8px;
		border-top: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.settings-header {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--text-dim);
		letter-spacing: 0.05em;
	}

	.settings-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.settings-field label {
		font-size: 12px;
		color: var(--text-muted);
	}

	.input-row {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.input-row input {
		width: 60px;
		padding: 4px 6px;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: 3px;
		color: var(--text-secondary);
		font-size: 13px;
		text-align: center;
	}

	.unit {
		font-size: 12px;
		color: var(--text-dim);
	}

	.type-select {
		padding: 6px 8px;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--text-secondary);
		font-size: 13px;
		cursor: pointer;
	}
</style>
