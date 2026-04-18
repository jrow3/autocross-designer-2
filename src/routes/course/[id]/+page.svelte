<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { loadCourse, type SavedCourse } from '$lib/services/courseService';
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { deserialize } from '$lib/engine/courseSerializer';
	import { goto } from '$app/navigation';

	let course = $state<SavedCourse | null>(null);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		const id = page.params.id as string;
		if (!id) { error = 'No course ID provided.'; loading = false; return; }
		const result = await loadCourse(id);
		if (result) {
			course = result;
		} else {
			error = 'Course not found or failed to load.';
		}
		loading = false;
	});

	function cloneToEditor() {
		if (!course) return;
		const data = deserialize(course.data);
		courseStore.load(data);
		goto('/');
	}
</script>

<div class="viewer">
	{#if loading}
		<div class="status">Loading course...</div>
	{:else if error}
		<div class="status error">{error}</div>
		<a href="/" class="back-link">Back to editor</a>
	{:else if course}
		<div class="header">
			<h1>{course.title}</h1>
			<div class="meta">
				Shared {new Date(course.created_at).toLocaleDateString()}
			</div>
		</div>

		<div class="stats">
			<div class="stat">Cones: {course.data.cones?.length ?? 0}</div>
			<div class="stat">Obstacles: {course.data.obstacles?.length ?? 0}</div>
			<div class="stat">Workers: {course.data.workers?.length ?? 0}</div>
			<div class="stat">Notes: {course.data.notes?.length ?? 0}</div>
		</div>

		<div class="actions">
			<button class="btn btn-primary" onclick={cloneToEditor}>
				Clone to Editor
			</button>
			<a href="/" class="btn btn-secondary">Back to editor</a>
		</div>
	{/if}
</div>

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

	.header {
		margin-bottom: 24px;
	}

	h1 {
		font-size: 24px;
		color: #e2e8f0;
		margin-bottom: 8px;
	}

	.meta {
		font-size: 14px;
		color: #64748b;
	}

	.stats {
		display: flex;
		gap: 16px;
		justify-content: center;
		margin-bottom: 32px;
	}

	.stat {
		padding: 12px 16px;
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 6px;
		font-size: 14px;
		color: #cbd5e1;
	}

	.actions {
		display: flex;
		gap: 12px;
		justify-content: center;
	}

	.btn {
		padding: 10px 24px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		text-decoration: none;
		border: 1px solid #334155;
	}

	.btn-primary {
		background: #2563eb;
		border-color: #3b82f6;
		color: #fff;
	}

	.btn-secondary {
		background: #1e293b;
		color: #94a3b8;
		display: inline-flex;
		align-items: center;
	}

	.back-link {
		display: block;
		margin-top: 16px;
		color: #60a5fa;
		text-decoration: none;
	}
</style>
