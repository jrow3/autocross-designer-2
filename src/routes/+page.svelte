<script lang="ts">
	import Toolbar from '$lib/components/Toolbar.svelte';
	import ActionBar from '$lib/components/ActionBar.svelte';
	import MapContainer from '$lib/components/MapContainer.svelte';
	import ToolStatus from '$lib/components/ToolStatus.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import SaveShareDialog from '$lib/components/SaveShareDialog.svelte';
	import PrintDialog from '$lib/components/PrintDialog.svelte';
	import HelpDialog from '$lib/components/HelpDialog.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { deserialize } from '$lib/engine/courseSerializer';
	import { exportJSON, importJSON } from '$lib/services/jsonExport';
	import { downloadSVG } from '$lib/engine/svgExport';

	let mapContainer = $state<MapContainer>();

	let showSaveDialog = $state(false);
	let showPrintDialog = $state(false);
	let showHelpDialog = $state(false);
	let fileInput: HTMLInputElement;

	async function handleImport(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const data = await importJSON(file);
		courseStore.load(deserialize(data));
		(e.target as HTMLInputElement).value = '';
	}
</script>

<div class="app-shell">
	<Toolbar />
	<main class="map-area">
		<ActionBar
			onsave={() => (showSaveDialog = true)}
			onexport={() => exportJSON(courseStore.course)}
			onimport={() => fileInput.click()}
			onprint={() => (showPrintDialog = true)}
			onexportsvg={() => downloadSVG(courseStore.course)}
			onhelp={() => (showHelpDialog = true)}
		/>
		<div class="map-wrapper">
			<MapContainer bind:this={mapContainer} />
			<ToolStatus />
		</div>
	</main>
	<Sidebar onfitcourse={() => mapContainer?.fitBoundsToCourse()} />
</div>

{#if showSaveDialog}
	<SaveShareDialog onclose={() => (showSaveDialog = false)} />
{/if}

{#if showPrintDialog}
	<PrintDialog onclose={() => (showPrintDialog = false)} />
{/if}

{#if showHelpDialog}
	<HelpDialog onclose={() => (showHelpDialog = false)} />
{/if}

<input type="file" accept=".json" bind:this={fileInput} onchange={handleImport} style="display:none" />

<style>
	:global(:root) {
		--bg-base: #0f172a;
		--bg-surface: #1e293b;
		--bg-elevated: #334155;
		--bg-hover: #334155;
		--border: #334155;
		--border-focus: #3b82f6;
		--text-primary: #e2e8f0;
		--text-secondary: #cbd5e1;
		--text-muted: #94a3b8;
		--text-dim: #64748b;
		--accent: #2563eb;
		--accent-hover: #1d4ed8;
		--accent-light: #3b82f6;
		--success: #059669;
		--success-hover: #047857;
		--danger: #ef4444;
		--cone-regular: #f97316;
		--cone-pointer: #84cc16;
		--cone-start: #22c55e;
		--cone-finish: #fff;
		--worker: #7c3aed;
		--note: #0ea5e9;
		--measure: #f472b6;
		--driving-line: #60a5fa;
	}

	:global(*, *::before, *::after) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(html, body) {
		height: 100%;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		background: var(--bg-base);
		color: var(--text-primary);
	}

	.app-shell {
		display: flex;
		height: 100vh;
		overflow: hidden;
	}

	.map-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.map-wrapper {
		flex: 1;
		position: relative;
		display: flex;
	}

	:global(.multi-selected) {
		filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.9));
		outline: 2px solid var(--accent-light);
		outline-offset: 2px;
	}

	:global(.selection-box) {
		position: fixed;
		border: 2px dashed var(--accent-light);
		background: rgba(59, 130, 246, 0.1);
		z-index: 50;
		pointer-events: none;
	}

	:global(.ghost-marker) {
		opacity: 0.4;
		pointer-events: none;
		animation: ghost-fade 1s ease-in-out infinite;
	}

	@keyframes ghost-fade {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 0.2; }
	}

	:global(.mapboxgl-ctrl-bottom-left),
	:global(.mapboxgl-ctrl-bottom-right) {
		z-index: 1;
	}
</style>
