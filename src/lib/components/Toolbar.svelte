<script lang="ts">
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { toolStore } from '$lib/stores/toolStore.svelte';
	import { OBSTACLE_TYPES } from '$lib/engine/obstacleTypes';
	import type { ObstacleTypeId } from '$lib/types/course';
	import ToolButton from './ToolButton.svelte';

	let collapsed: Record<string, boolean> = $state({});

	function toggle(section: string) {
		collapsed[section] = !collapsed[section];
	}
</script>

<aside class="toolbar">
	<div class="toolbar-section">
		<button class="section-header" onclick={() => toggle('cones')}>
			<span class="chevron" class:open={!collapsed['cones']}>&#9656;</span>
			<span>Cones</span>
		</button>
		{#if !collapsed['cones']}
			<div class="section-body">
				<ToolButton tool="regular" label="Regular" title="Regular Cone" />
				<ToolButton tool="pointer" label="Pointer" title="Pointer Cone" />
				<ToolButton tool="start-cone" label="Start" title="Start Cone" />
				<ToolButton tool="finish-cone" label="Finish" title="Finish Cone" />
			</div>
		{/if}
	</div>

	<div class="toolbar-section">
		<button class="section-header" onclick={() => toggle('layout')}>
			<span class="chevron" class:open={!collapsed['layout']}>&#9656;</span>
			<span>Course Elements</span>
		</button>
		{#if !collapsed['layout']}
			<div class="section-body">
				<ToolButton tool="gate" label="Gate" title="Place gate (2-click)" />
				{#if toolStore.activeTool === 'gate'}
					<div class="inline-settings">
						<label>
							<span>Width</span>
							<div class="inline-input-row">
								<input
									type="number"
									min="1"
									max="100"
									step="1"
									value={toolStore.gateWidthFeet}
									onchange={(e) => { const v = parseFloat((e.target as HTMLInputElement).value); if (v > 0) toolStore.setGateWidth(v); }}
								/>
								<span class="inline-unit">ft</span>
							</div>
						</label>
						<label class="inline-checkbox">
							<input
								type="checkbox"
								checked={toolStore.gateDirectionalCones}
								onchange={(e) => toolStore.setGateDirectionalCones((e.target as HTMLInputElement).checked)}
							/>
							<span>Directional</span>
						</label>
					</div>
				{/if}
				<ToolButton tool="slalom" label="Slalom" title="Place slalom (2-click)" />
				{#if toolStore.activeTool === 'slalom'}
					<div class="inline-settings">
						<label>
							<span>Spacing</span>
							<div class="inline-input-row">
								<input
									type="number"
									min="1"
									max="500"
									step="1"
									value={toolStore.slalomSpacingFeet}
									onchange={(e) => { const v = parseFloat((e.target as HTMLInputElement).value); if (v > 0) toolStore.setSlalomSpacing(v); }}
								/>
								<span class="inline-unit">ft</span>
							</div>
						</label>
					</div>
				{/if}
				<ToolButton tool="drivingline" label="Driving Line" title="Draw driving line" />
				<ToolButton tool="courseoutline" label="Outline" title="Draw course outline" />
				<ToolButton tool="sketch" label="Sketch" title="Freehand sketch line" />
			</div>
		{/if}
	</div>

	<div class="toolbar-section">
		<button class="section-header" onclick={() => toggle('lot')}>
			<span class="chevron" class:open={!collapsed['lot']}>&#9656;</span>
			<span>Lot Features</span>
		</button>
		{#if !collapsed['lot']}
			<div class="section-body">
				<ToolButton tool="obstacle" label="Obstacle" title="Place obstacle" />
				{#if toolStore.activeTool === 'obstacle'}
					<div class="inline-settings">
						<select
							class="inline-select"
							value={toolStore.selectedObstacleType}
							onchange={(e) => toolStore.setObstacleType((e.target as HTMLSelectElement).value as ObstacleTypeId)}
						>
							{#each OBSTACLE_TYPES as ot}
								<option value={ot.id}>{ot.symbol} {ot.label}</option>
							{/each}
						</select>
					</div>
				{/if}
				<ToolButton tool="trailer" label="Trailer" title="Place trailer" />
				<ToolButton tool="staging-grid" label="Staging Grid" title="Place staging grid" />
				<ToolButton tool="staging-area" label="Staging Area" title="Draw staging area polygon" />
			</div>
		{/if}
	</div>

	<div class="toolbar-section">
		<button class="section-header" onclick={() => toggle('annotations')}>
			<span class="chevron" class:open={!collapsed['annotations']}>&#9656;</span>
			<span>Annotations</span>
		</button>
		{#if !collapsed['annotations']}
			<div class="section-body">
				<ToolButton tool="worker" label="Worker Station" title="Place worker station" />
				<ToolButton tool="worker-zone" label="Worker Zone" title="Draw worker station zone" />
				<ToolButton tool="note" label="Note" title="Add text note" />
				<ToolButton tool="measure" label="Measure" title="Measure distance" />
			</div>
		{/if}
	</div>

	<div class="toolbar-section">
		<button class="section-header" onclick={() => toggle('edit')}>
			<span class="chevron" class:open={!collapsed['edit']}>&#9656;</span>
			<span>Edit</span>
		</button>
		{#if !collapsed['edit']}
			<div class="section-body">
				<ToolButton tool="select" label="Select" title="Select / move elements" />
				{#if mapStore.mode === 'image'}
					<ToolButton tool="scale" label="Set Scale" title="Calibrate image scale" />
				{/if}
			</div>
		{/if}
	</div>
</aside>

<style>
	.toolbar {
		width: 180px;
		background: var(--bg-base);
		border-right: 1px solid var(--bg-surface);
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		overflow-y: auto;
	}

	.toolbar-section {
		display: flex;
		flex-direction: column;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px 4px;
		background: none;
		border: none;
		color: var(--text-dim);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: pointer;
		user-select: none;
	}

	.section-header:hover {
		color: var(--text-muted);
	}

	.chevron {
		font-size: 10px;
		transition: transform 0.15s;
		display: inline-block;
	}

	.chevron.open {
		transform: rotate(90deg);
	}

	.section-body {
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding-left: 4px;
		margin-bottom: 4px;
	}

	.inline-settings {
		padding: 4px 8px;
		background: var(--bg-surface);
		border-radius: 4px;
		margin-left: 4px;
	}

	.inline-settings label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		font-size: 12px;
		color: var(--text-muted);
	}

	.inline-input-row {
		display: flex;
		align-items: center;
		gap: 3px;
	}

	.inline-input-row input {
		width: 50px;
		padding: 2px 4px;
		background: var(--bg-base);
		border: 1px solid var(--border);
		border-radius: 3px;
		color: var(--text-secondary);
		font-size: 12px;
		text-align: center;
	}

	.inline-unit {
		font-size: 11px;
		color: var(--text-dim);
	}

	.inline-checkbox {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 4px;
	}

	.inline-checkbox input {
		accent-color: var(--accent);
	}

	.inline-select {
		width: 100%;
		padding: 4px 6px;
		background: var(--bg-base);
		border: 1px solid var(--border);
		border-radius: 3px;
		color: var(--text-secondary);
		font-size: 12px;
		cursor: pointer;
	}
</style>
