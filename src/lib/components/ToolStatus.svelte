<script lang="ts">
	import { toolStore } from '$lib/stores/toolStore.svelte';

	const MULTI_STEP_TOOLS = ['gate', 'slalom', 'measure', 'courseoutline', 'scale'];

	let isMultiStep = $derived(MULTI_STEP_TOOLS.includes(toolStore.activeTool));
</script>

{#if toolStore.statusMessage}
	<div class="tool-status">
		{#if isMultiStep}
			<span class="pulse-dot"></span>
		{/if}
		{toolStore.statusMessage}
	</div>
{/if}

<style>
	.tool-status {
		position: absolute;
		top: 12px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.85);
		color: #fff;
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 13px;
		pointer-events: none;
		z-index: 10;
		white-space: nowrap;
		display: flex;
		align-items: center;
		gap: 8px;
		backdrop-filter: blur(4px);
	}

	.pulse-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent-light, #3b82f6);
		animation: pulse 1.5s ease-in-out infinite;
		flex-shrink: 0;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.4; transform: scale(0.7); }
	}
</style>
