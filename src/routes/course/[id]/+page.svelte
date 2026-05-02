<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { loadCourse } from '$lib/services/courseService';
	import { deserialize } from '$lib/engine/courseSerializer';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import CourseViewer from '$lib/components/CourseViewer.svelte';

	let loading = $state(true);
	let error = $state('');
	let title = $state('');

	onMount(async () => {
		try {
			const id = page.params.id as string;
			const result = await loadCourse(id);
			if (!result) {
				error = 'Course not found';
				loading = false;
				return;
			}
			title = result.title;
			const data = deserialize(result.data);
			courseStore.load(data);
			loading = false;
		} catch (e) {
			error = 'Failed to load course';
			loading = false;
		}
	});
</script>

{#if loading}
	<div class="loading">Loading course...</div>
{:else if error}
	<div class="error">{error}</div>
{:else}
	<CourseViewer {title} />
{/if}

<style>
	.loading,
	.error {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100vh;
		font-size: 18px;
		color: #ccc;
		background: #1a1a2e;
	}

	.error {
		color: #e94560;
	}
</style>
