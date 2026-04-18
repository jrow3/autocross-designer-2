<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { toolStore } from '$lib/stores/toolStore.svelte';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { selectionStore } from '$lib/stores/selectionStore.svelte';
	import { mapStore } from '$lib/stores/mapStore.svelte';
	import { KEY_TOOL_MAP } from '$lib/config/shortcuts';

	let { children } = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

		if (e.key === 'Escape') {
			toolStore.setTool('select');
			return;
		}

		if (e.ctrlKey && e.key === 'z') {
			e.preventDefault();
			courseStore.undo();
			return;
		}

		if (e.ctrlKey && e.key === 'y') {
			e.preventDefault();
			courseStore.redo();
			return;
		}

		if (e.key === 'Delete') {
			selectionStore.deleteSelected();
			return;
		}

		if (e.ctrlKey && e.key === 'a') {
			e.preventDefault();
			selectionStore.selectAll();
			return;
		}

		const tool = KEY_TOOL_MAP[e.key.toLowerCase()];
		if (tool) {
			if (tool === 'scale' && mapStore.mode !== 'image') return;
			toolStore.setTool(tool);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<link rel="icon" href={favicon} />
	<link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
	<link href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.3/mapbox-gl-geocoder.css" rel="stylesheet" />
	<title>Autocross Course Designer</title>
</svelte:head>

{@render children()}
