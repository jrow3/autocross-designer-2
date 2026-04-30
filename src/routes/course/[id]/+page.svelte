<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { loadCourse } from '$lib/services/courseService';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { layerStore } from '$lib/stores/layerStore.svelte';
	import { deserialize } from '$lib/engine/courseSerializer';
	import { goto } from '$app/navigation';

	let error = $state('');

	onMount(async () => {
		const id = page.params.id as string;
		if (!id) { error = 'No course ID provided.'; return; }
		const result = await loadCourse(id);
		if (!result) { error = 'Course not found or failed to load.'; return; }

		const data = deserialize(result.data);
		courseStore.load(data);
		layerStore.setVisible('sketches', false);
		sessionStorage.setItem('fitCourseOnLoad', 'true');
		goto('/');
	});
</script>

{#if error}
	<div class="viewer">
		<div class="status error">{error}</div>
		<a href="/" class="back-link">Back to editor</a>
	</div>
{:else}
	<div class="viewer">
		<div class="status">Loading course...</div>
	</div>
{/if}

<style>
	.viewer {
		max-width: 600px;
		margin: 80px auto;
		padding: 24px;
		text-align: center;
	}

	.status {
		font-size: 18px;
		color: #94a3b8;
		padding: 40px 0;
	}

	.error {
		color: #ef4444;
	}

	.back-link {
		display: block;
		margin-top: 16px;
		color: #60a5fa;
		text-decoration: none;
	}
</style>
