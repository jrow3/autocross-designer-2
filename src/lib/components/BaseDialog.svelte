<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		onclose,
		children,
		actions
	}: {
		title: string;
		onclose: () => void;
		children: Snippet;
		actions?: Snippet;
	} = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	let dialogEl: HTMLDivElement;

	$effect(() => {
		const first = dialogEl?.querySelector('input, select, button:not(.dialog-close)') as HTMLElement;
		first?.focus();
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="overlay" onclick={onclose} role="presentation">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="dialog" bind:this={dialogEl} onclick={(e) => e.stopPropagation()}>
		<div class="dialog-header">
			<span class="dialog-title">{title}</span>
		</div>
		<div class="dialog-body">
			{@render children()}
		</div>
		{#if actions}
			<div class="dialog-actions">
				{@render actions()}
			</div>
		{/if}
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(2px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.dialog {
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 20px;
		width: 360px;
		max-height: 80vh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.dialog-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.dialog-body {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.dialog-actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
		padding-top: 4px;
	}

	/* Shared field styles for children */
	:global(.dialog-field) {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	:global(.dialog-field label) {
		font-size: 12px;
		color: var(--text-muted);
	}

	:global(.dialog-field input),
	:global(.dialog-field select) {
		padding: 8px;
		background: var(--bg-base);
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--text-primary);
		font-size: 14px;
		outline: none;
	}

	:global(.dialog-field input:focus),
	:global(.dialog-field select:focus) {
		border-color: var(--border-focus);
	}

	:global(.dialog-btn) {
		padding: 6px 14px;
		border-radius: 4px;
		border: 1px solid var(--border);
		font-size: 13px;
		cursor: pointer;
	}

	:global(.dialog-btn:disabled) {
		opacity: 0.5;
		cursor: not-allowed;
	}

	:global(.dialog-btn-cancel) {
		background: var(--bg-surface);
		color: var(--text-muted);
	}

	:global(.dialog-btn-confirm) {
		background: var(--accent);
		border-color: var(--accent-light);
		color: #fff;
	}

	:global(.dialog-desc) {
		font-size: 13px;
		color: var(--text-muted);
		line-height: 1.4;
	}
</style>
