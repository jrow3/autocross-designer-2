<script lang="ts">
	import { courseStore } from '$lib/stores/courseStore.svelte';
	import { saveCourse, updateCourse, shareUrl } from '$lib/services/courseService';
	import { isSupabaseConfigured } from '$lib/services/supabase';
	import type { SavedCourse } from '$lib/services/courseService';
	import BaseDialog from './BaseDialog.svelte';

	let {
		existingCourse = null,
		onclose,
		onsaved
	}: {
		existingCourse?: SavedCourse | null;
		onclose: () => void;
		onsaved?: (course: SavedCourse) => void;
	} = $props();

	const initialTitle = existingCourse?.title ?? '';
	let title = $state(initialTitle);
	let saving = $state(false);
	let savedUrl = $state('');
	let copied = $state(false);
	let error = $state('');

	const configured = isSupabaseConfigured();

	// Auto-save if updating an existing course
	if (existingCourse && configured) {
		(async () => {
			saving = true;
			const ok = await updateCourse(existingCourse.id, existingCourse.title, courseStore.course);
			if (ok) {
				savedUrl = shareUrl(existingCourse.id);
				onsaved?.({ ...existingCourse });
			} else {
				error = 'Failed to update course';
			}
			saving = false;
		})();
	}

	async function handleSave() {
		const trimmed = title.trim();
		if (!trimmed) return;
		saving = true;
		error = '';

		if (existingCourse) {
			const ok = await updateCourse(existingCourse.id, trimmed, courseStore.course);
			if (ok) {
				savedUrl = shareUrl(existingCourse.id);
				onsaved?.({ ...existingCourse, title: trimmed });
			} else {
				error = 'Failed to update course';
			}
		} else {
			const result = await saveCourse(trimmed, courseStore.course);
			if (result) {
				savedUrl = shareUrl(result.id);
				onsaved?.(result);
			} else {
				error = 'Failed to save course';
			}
		}
		saving = false;
	}

	async function handleCopy() {
		await navigator.clipboard.writeText(savedUrl);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !savedUrl) handleSave();
	}
</script>

<BaseDialog title={savedUrl ? `Saved "${existingCourse?.title ?? title.trim()}"` : saving ? 'Saving...' : configured ? 'Save & Share' : 'Save & Share'} onclose={onclose}>
	{#snippet children()}
		{#if !configured}
			<p class="dialog-desc" style="color: var(--danger)">
				Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to enable cloud saving.
			</p>
		{:else if savedUrl}
			<div class="url-row">
				<input type="text" readonly value={savedUrl} class="url-input" />
				<button class="dialog-btn dialog-btn-confirm" onclick={handleCopy}>
					{copied ? 'Copied!' : 'Copy'}
				</button>
			</div>
		{:else}
			<div class="dialog-field">
				<label for="course-title">Course Title</label>
				<input id="course-title" type="text" bind:value={title} onkeydown={handleKeydown} placeholder="My Autocross Course" />
			</div>
			{#if error}
				<p class="dialog-desc" style="color: var(--danger)">{error}</p>
			{/if}
		{/if}
	{/snippet}
	{#snippet actions()}
		{#if !configured || savedUrl}
			<button class="dialog-btn dialog-btn-cancel" onclick={onclose}>Close</button>
		{:else}
			<button class="dialog-btn dialog-btn-cancel" onclick={onclose}>Cancel</button>
			<button class="dialog-btn dialog-btn-confirm" onclick={handleSave} disabled={saving || !title.trim()}>
				{saving ? 'Saving...' : existingCourse ? 'Update' : 'Save & Share'}
			</button>
		{/if}
	{/snippet}
</BaseDialog>

<style>
	.url-row {
		display: flex;
		gap: 8px;
	}

	.url-input {
		flex: 1;
		padding: 8px;
		background: var(--bg-base);
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--driving-line);
		font-size: 13px;
		outline: none;
	}
</style>
