<script lang="ts">
	import type { LngLat } from '$lib/types/course';
	import { distanceFeet } from '$lib/engine/distance';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { toolStore } from '$lib/stores/toolStore.svelte';
	import BaseDialog from './BaseDialog.svelte';

	let {
		start,
		end,
		onconfirm,
		oncancel
	}: {
		start: LngLat;
		end: LngLat;
		onconfirm: (count: number, spacingFeet: number) => void;
		oncancel: () => void;
	} = $props();

	const initialFeet = $derived.by(() => distanceFeet(start, end, mapStore.mode) ?? 0);

	let lengthValue = $state('');
	let spacingValue = $state(String(toolStore.slalomSpacingFeet));
	let countValue = $state('5');
	let preview = $state('');

	$effect(() => {
		if (lengthValue === '' && initialFeet > 0) {
			lengthValue = initialFeet.toFixed(1);
			updateFromSpacing();
		}
	});

	function getLength(): number { return parseFloat(lengthValue) || 0; }
	function getSpacing(): number { return parseFloat(spacingValue) || 0; }
	function getCount(): number { return parseInt(countValue) || 0; }

	function updateFromLength() {
		const len = getLength();
		const spacing = getSpacing();
		if (len > 0 && spacing > 0) {
			countValue = String(Math.floor(len / spacing) + 1);
		} else {
			const count = getCount();
			if (count >= 2 && len > 0) spacingValue = (len / (count - 1)).toFixed(1);
		}
		updatePreview();
	}

	function updateFromSpacing() {
		const spacing = getSpacing();
		const len = getLength();
		if (spacing > 0 && len > 0) countValue = String(Math.floor(len / spacing) + 1);
		updatePreview();
	}

	function updateFromCount() {
		const count = getCount();
		const len = getLength();
		if (count >= 2 && len > 0) spacingValue = (len / (count - 1)).toFixed(1);
		updatePreview();
	}

	function updatePreview() {
		const count = getCount();
		const spacing = getSpacing();
		if (count >= 2 && spacing > 0) preview = `Will place ${count} cones, ${spacing.toFixed(1)} ft apart`;
		else if (count >= 2) preview = `Will place ${count} cones`;
		else preview = '';
	}

	function handleConfirm() {
		const count = getCount();
		if (count < 2) return;
		onconfirm(count, getSpacing());
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleConfirm();
	}

	updateFromCount();
</script>

<BaseDialog title="Slalom Configuration" onclose={oncancel}>
	{#snippet children()}
		<div class="dialog-field">
			<label for="slalom-length">Total Length (ft)</label>
			<input id="slalom-length" type="number" bind:value={lengthValue} oninput={updateFromLength} onkeydown={handleKeydown} min="0" step="0.1" />
		</div>
		<div class="dialog-field">
			<label for="slalom-spacing">Spacing (ft)</label>
			<input id="slalom-spacing" type="number" bind:value={spacingValue} oninput={updateFromSpacing} onkeydown={handleKeydown} min="0" step="0.1" />
		</div>
		<div class="dialog-field">
			<label for="slalom-count">Cone Count</label>
			<input id="slalom-count" type="number" bind:value={countValue} oninput={updateFromCount} onkeydown={handleKeydown} min="2" step="1" />
		</div>
		{#if preview}
			<p class="dialog-desc" style="text-align:center">{preview}</p>
		{/if}
	{/snippet}
	{#snippet actions()}
		<button class="dialog-btn dialog-btn-cancel" onclick={oncancel}>Cancel</button>
		<button class="dialog-btn dialog-btn-confirm" onclick={handleConfirm}>Place Cones</button>
	{/snippet}
</BaseDialog>
