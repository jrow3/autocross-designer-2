<script lang="ts">
	import BaseDialog from './BaseDialog.svelte';

	let {
		pixelDistance,
		onconfirm,
		oncancel
	}: {
		pixelDistance: number;
		onconfirm: (feetPerPixel: number) => void;
		oncancel: () => void;
	} = $props();

	let distFeet = $state('');

	function handleConfirm() {
		const feet = parseFloat(distFeet);
		if (!feet || feet <= 0) return;
		onconfirm(feet / pixelDistance);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleConfirm();
	}
</script>

<BaseDialog title="Set Scale" onclose={oncancel}>
	{#snippet children()}
		<p class="dialog-desc">
			You clicked two points {pixelDistance.toFixed(0)} pixels apart.<br />
			How far is that in real life?
		</p>
		<div class="dialog-field">
			<label for="scale-feet">Distance (feet)</label>
			<input
				id="scale-feet"
				type="number"
				bind:value={distFeet}
				onkeydown={handleKeydown}
				placeholder="e.g. 100"
				min="0.1"
				step="0.1"
			/>
		</div>
	{/snippet}
	{#snippet actions()}
		<button class="dialog-btn dialog-btn-cancel" onclick={oncancel}>Cancel</button>
		<button class="dialog-btn dialog-btn-confirm" onclick={handleConfirm}>Calibrate</button>
	{/snippet}
</BaseDialog>
