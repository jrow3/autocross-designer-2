import type { Tool } from '$lib/stores/toolStore.svelte';

export const TOOL_SHORTCUTS: Partial<Record<Tool, string>> = {
	regular: '1',
	pointer: '2',
	'start-cone': '3',
	'finish-cone': '4',
	gate: '5',
	slalom: '6',
	drivingline: '7',
	measure: '8',
	note: '9',
	courseoutline: 'O',
	obstacle: 'X',
	trailer: 'T',
	'staging-grid': 'G',
	worker: 'W',
	scale: 'S',
	select: 'Esc',
	'staging-area': 'a',
	'worker-zone': 'z',
	'hazard-point': 'h',
	'hazard-line': 'j'
};

export const KEY_TOOL_MAP: Record<string, Tool> = {
	'1': 'regular',
	'2': 'pointer',
	'3': 'start-cone',
	'4': 'finish-cone',
	'5': 'gate',
	'6': 'slalom',
	'7': 'drivingline',
	'8': 'measure',
	'9': 'note',
	o: 'courseoutline',
	x: 'obstacle',
	t: 'trailer',
	g: 'staging-grid',
	w: 'worker',
	s: 'scale',
	a: 'staging-area',
	z: 'worker-zone',
	h: 'hazard-point',
	j: 'hazard-line'
};
