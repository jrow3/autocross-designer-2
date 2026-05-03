<script lang="ts">
	import { toolStore } from '$lib/stores/toolStore.svelte';

	function onGateWidthChange(e: Event) {
		const val = parseFloat((e.target as HTMLInputElement).value);
		if (val > 0) toolStore.setGateWidth(val);
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
</style>
