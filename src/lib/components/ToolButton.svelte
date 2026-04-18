<script lang="ts">
	import { toolStore, type Tool } from '$lib/stores/toolStore.svelte';
	import { TOOL_SHORTCUTS } from '$lib/config/shortcuts';
	import ToolIcon from './ToolIcon.svelte';

	let {
		tool,
		label,
		title
	}: {
		tool: Tool;
		label: string;
		title: string;
	} = $props();

	const shortcut = TOOL_SHORTCUTS[tool];

	function handleClick() {
		toolStore.setTool(tool);
	}
</script>

<button
	class="tool-btn"
	class:active={toolStore.activeTool === tool}
	{title}
	onclick={handleClick}
>
	<ToolIcon {tool} />
	<span class="tool-label">{label}</span>
	{#if shortcut}
		<span class="shortcut-hint">{shortcut}</span>
	{/if}
</button>

<style>
	.tool-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 5px 8px;
		background: var(--bg-surface);
		color: var(--text-secondary);
		border: 1px solid var(--border);
		border-radius: 4px;
		cursor: pointer;
		font-size: 13px;
		text-align: left;
		transition: background 0.15s, border-color 0.15s;
	}

	.tool-btn:hover {
		background: var(--bg-hover);
	}

	.tool-btn.active {
		background: var(--accent);
		border-color: var(--accent-light);
		color: #fff;
	}

	.tool-label {
		flex: 1;
	}

	.shortcut-hint {
		font-size: 10px;
		color: var(--text-dim);
		background: var(--bg-base);
		padding: 1px 4px;
		border-radius: 2px;
		min-width: 16px;
		text-align: center;
		font-family: monospace;
	}

	.tool-btn.active .shortcut-hint {
		background: rgba(0, 0, 0, 0.2);
		color: rgba(255, 255, 255, 0.7);
	}
</style>
