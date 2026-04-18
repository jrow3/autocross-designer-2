<script lang="ts">
	import BaseDialog from './BaseDialog.svelte';

	let {
		onconfirm,
		oncancel
	}: {
		onconfirm: (text: string) => void;
		oncancel: () => void;
	} = $props();

	let text = $state('');

	function handleConfirm() {
		const trimmed = text.trim();
		if (trimmed) onconfirm(trimmed);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleConfirm();
	}
</script>

<BaseDialog title="Add Note" onclose={oncancel}>
	{#snippet children()}
		<div class="dialog-field">
			<input
				type="text"
				bind:value={text}
				placeholder="Note text..."
				onkeydown={handleKeydown}
			/>
		</div>
	{/snippet}
	{#snippet actions()}
		<button class="dialog-btn dialog-btn-cancel" onclick={oncancel}>Cancel</button>
		<button class="dialog-btn dialog-btn-confirm" onclick={handleConfirm}>Add</button>
	{/snippet}
</BaseDialog>
