<script lang="ts">
	import type { Tool } from '$lib/stores/toolStore.svelte';

	let { tool, size = 14 }: { tool: Tool; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 16 16" fill="none" class="tool-icon">
	{#if tool === 'regular'}
		<circle cx="8" cy="8" r="5.5" fill="var(--cone-regular)" stroke="#fff" stroke-width="1.5" />
	{:else if tool === 'pointer'}
		<polygon points="8,2 14,14 2,14" fill="var(--cone-pointer)" stroke="#fff" stroke-width="1.5" />
	{:else if tool === 'start-cone'}
		<circle cx="8" cy="8" r="5.5" fill="var(--cone-start)" stroke="#fff" stroke-width="1.5" />
	{:else if tool === 'finish-cone'}
		<circle cx="8" cy="8" r="5.5" fill="#fff" stroke="#000" stroke-width="1.5" />
		<line x1="8" y1="2.5" x2="8" y2="13.5" stroke="#000" stroke-width="0.75" />
		<line x1="2.5" y1="8" x2="13.5" y2="8" stroke="#000" stroke-width="0.75" />
	{:else if tool === 'gate'}
		<rect x="3" y="2" width="2" height="12" rx="0.5" fill="currentColor" />
		<rect x="11" y="2" width="2" height="12" rx="0.5" fill="currentColor" />
		<line x1="5.5" y1="8" x2="10.5" y2="8" stroke="currentColor" stroke-width="1" stroke-dasharray="2 1" />
	{:else if tool === 'slalom'}
		<path d="M3 12 Q5 4 8 8 Q11 12 13 4" stroke="currentColor" stroke-width="1.5" fill="none" />
		<circle cx="3" cy="12" r="1.5" fill="currentColor" />
		<circle cx="8" cy="8" r="1.5" fill="currentColor" />
		<circle cx="13" cy="4" r="1.5" fill="currentColor" />
	{:else if tool === 'drivingline'}
		<path d="M3 13 Q4 3 8 8 Q12 13 13 3" stroke="var(--driving-line)" stroke-width="1.5" fill="none" />
		<polygon points="13,3 11,5 14,5" fill="var(--driving-line)" />
	{:else if tool === 'courseoutline'}
		<rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2" fill="none" />
	{:else if tool === 'trailer'}
		<rect x="4" y="5" width="10" height="6" rx="1" fill="currentColor" />
		<polygon points="4,7 1,8 4,9" fill="currentColor" />
	{:else if tool === 'staging-area'}
		<polygon points="2,12 5,3 14,4 13,13" stroke="#6495ED" stroke-width="1.5" stroke-dasharray="3 2" fill="#6495ED" fill-opacity="0.2" />
	{:else if tool === 'worker-zone'}
		<polygon points="2,13 3,3 13,3 13,13" stroke="#ff6b6b" stroke-width="1.5" stroke-dasharray="3 2" fill="#ff6b6b" fill-opacity="0.15" />
		<text x="8" y="10.5" text-anchor="middle" font-size="6" font-weight="bold" fill="#ff6b6b">1</text>
	{:else if tool === 'hazard-point'}
		<circle cx="8" cy="8" r="5" stroke="#e53e3e" stroke-width="1.5" fill="none" />
		<circle cx="8" cy="8" r="2.5" fill="#e53e3e" />
	{:else if tool === 'hazard-line'}
		<line x1="3" y1="12" x2="13" y2="4" stroke="#e53e3e" stroke-width="2" />
		<line x1="1" y1="9" x2="11" y2="1" stroke="#e53e3e" stroke-width="0.75" stroke-dasharray="2 2" opacity="0.6" />
		<line x1="5" y1="15" x2="15" y2="7" stroke="#e53e3e" stroke-width="0.75" stroke-dasharray="2 2" opacity="0.6" />
	{:else if tool === 'worker'}
		<circle cx="8" cy="4.5" r="2.5" fill="var(--worker)" />
		<path d="M3 14 Q3 9 8 9 Q13 9 13 14" fill="var(--worker)" />
	{:else if tool === 'note'}
		<rect x="2" y="2" width="11" height="12" rx="1" fill="var(--note)" opacity="0.8" />
		<path d="M9 2 L13 6 L13 2 Z" fill="var(--bg-surface)" />
		<line x1="4.5" y1="7" x2="10" y2="7" stroke="#fff" stroke-width="1" />
		<line x1="4.5" y1="10" x2="9" y2="10" stroke="#fff" stroke-width="1" />
	{:else if tool === 'measure'}
		<line x1="2" y1="8" x2="14" y2="8" stroke="var(--measure)" stroke-width="1.5" />
		<line x1="2" y1="5" x2="2" y2="11" stroke="var(--measure)" stroke-width="1.5" />
		<line x1="14" y1="5" x2="14" y2="11" stroke="var(--measure)" stroke-width="1.5" />
		<text x="8" y="6" text-anchor="middle" font-size="6" fill="var(--measure)">ft</text>
	{:else if tool === 'select'}
		<polygon points="3,2 3,12 6,9 10,13 12,11 8,7 12,4" fill="currentColor" />
	{:else if tool === 'scale'}
		<line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.5" />
		<polygon points="2,8 4,6 4,10" fill="currentColor" />
		<polygon points="14,8 12,6 12,10" fill="currentColor" />
		<line x1="6" y1="5" x2="6" y2="11" stroke="currentColor" stroke-width="1" />
		<line x1="10" y1="5" x2="10" y2="11" stroke="currentColor" stroke-width="1" />
	{/if}
</svg>

<style>
	.tool-icon {
		flex-shrink: 0;
	}
</style>
