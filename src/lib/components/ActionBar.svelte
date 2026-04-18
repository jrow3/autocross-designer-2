<script lang="ts">
	import { courseStore } from '$lib/stores/courseStore.svelte';

	let {
		onsave,
		onexport,
		onimport,
		onprint,
		onexportsvg,
		onhelp
	}: {
		onsave: () => void;
		onexport: () => void;
		onimport: () => void;
		onprint: () => void;
		onexportsvg: () => void;
		onhelp: () => void;
	} = $props();
</script>

<div class="action-bar">
	<div class="action-group">
		<button
			class="action-btn icon-btn"
			onclick={() => courseStore.undo()}
			disabled={!courseStore.canUndo}
			title="Undo (Ctrl+Z)"
		>&#x21A9;</button>
		<button
			class="action-btn icon-btn"
			onclick={() => courseStore.redo()}
			disabled={!courseStore.canRedo}
			title="Redo (Ctrl+Y)"
		>&#x21AA;</button>
		<div class="separator"></div>
		<button class="action-btn help-btn" onclick={onhelp} title="Help">?</button>
	</div>
	<div class="action-group">
		<button class="action-btn save-btn" onclick={onsave}>Save & Share</button>
		<button class="action-btn" onclick={onexport}>Export</button>
		<button class="action-btn" onclick={onimport}>Import</button>
		<button class="action-btn" onclick={onexportsvg}>SVG</button>
		<button class="action-btn" onclick={onprint}>PDF</button>
	</div>
</div>

<style>
	.action-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 4px 8px;
		background: var(--bg-surface);
		border-bottom: 1px solid var(--border);
		gap: 8px;
		flex-shrink: 0;
	}

	.action-group {
		display: flex;
		gap: 4px;
		align-items: center;
	}

	.separator {
		width: 1px;
		height: 20px;
		background: var(--border);
		margin: 0 4px;
	}

	.action-btn {
		padding: 4px 10px;
		background: var(--bg-base);
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--text-secondary);
		font-size: 12px;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.15s;
	}

	.action-btn:hover {
		background: var(--bg-hover);
	}

	.action-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.save-btn {
		background: var(--success);
		border-color: #10b981;
		color: #fff;
		font-weight: 600;
	}

	.save-btn:hover {
		background: var(--success-hover);
	}

	.icon-btn {
		padding: 4px 6px;
		font-size: 14px;
	}

	.help-btn {
		font-weight: 700;
		font-size: 13px;
		width: 24px;
		text-align: center;
		padding: 4px;
	}
</style>
