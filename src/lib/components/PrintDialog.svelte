<script lang="ts">
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { haversineFeet } from '$lib/engine/distance';
	import { captureMapCanvas, renderPrintCanvas, type PrintLayout } from '$lib/engine/printCapture';
	import { jsPDF } from 'jspdf';
	import BaseDialog from './BaseDialog.svelte';

	let { onclose }: { onclose: () => void } = $props();

	let title = $state('Autocross Course');
	let showConeCount = $state(true);
	let showLegend = $state(true);
	let showScaleBar = $state(true);
	let exporting = $state(false);

	function coneCount(): number { return courseStore.course.cones.length; }

	function lineLength(): string {
		const wps = courseStore.course.drivingLine;
		if (wps.length < 2) return '-- ft';
		let total = 0;
		for (let i = 1; i < wps.length; i++) total += haversineFeet(wps[i - 1].lngLat, wps[i].lngLat);
		return `${total.toFixed(0)} ft`;
	}

	async function exportImage() {
		exporting = true;
		const mapCanvas = await captureMapCanvas();
		if (!mapCanvas) { exporting = false; return; }
		const layout: PrintLayout = { title, showConeCount, showLegend, showScaleBar };
		const result = renderPrintCanvas(mapCanvas, layout, coneCount(), lineLength());
		const link = document.createElement('a');
		link.download = `${title || 'course'}.png`;
		link.href = result.toDataURL('image/png');
		link.click();
		exporting = false;
	}

	async function exportPDF() {
		exporting = true;
		const mapCanvas = await captureMapCanvas();
		if (!mapCanvas) { exporting = false; return; }
		const layout: PrintLayout = { title, showConeCount, showLegend, showScaleBar };
		const result = renderPrintCanvas(mapCanvas, layout, coneCount(), lineLength());
		const imgData = result.toDataURL('image/png');
		const pdf = new jsPDF({
			orientation: result.width > result.height ? 'landscape' : 'portrait',
			unit: 'px',
			format: [result.width, result.height]
		});
		pdf.addImage(imgData, 'PNG', 0, 0, result.width, result.height);
		pdf.save(`${title || 'course'}.pdf`);
		exporting = false;
	}
</script>

<BaseDialog title="Print / Export" onclose={onclose}>
	{#snippet children()}
		<div class="dialog-field">
			<label for="print-title">Course Title</label>
			<input id="print-title" type="text" bind:value={title} />
		</div>
		<div class="checkboxes">
			<label><input type="checkbox" bind:checked={showConeCount} /> Cone count & line length</label>
			<label><input type="checkbox" bind:checked={showLegend} /> Element legend</label>
			<label><input type="checkbox" bind:checked={showScaleBar} /> Branding</label>
		</div>
	{/snippet}
	{#snippet actions()}
		<button class="dialog-btn dialog-btn-cancel" onclick={onclose}>Cancel</button>
		<button class="dialog-btn dialog-btn-confirm" onclick={exportImage} disabled={exporting}>
			{exporting ? 'Exporting...' : 'Save PNG'}
		</button>
		<button class="dialog-btn dialog-btn-confirm" onclick={exportPDF} disabled={exporting}>
			{exporting ? 'Exporting...' : 'Save PDF'}
		</button>
	{/snippet}
</BaseDialog>

<style>
	.checkboxes {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.checkboxes label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.checkboxes input {
		accent-color: var(--accent-light);
	}
</style>
