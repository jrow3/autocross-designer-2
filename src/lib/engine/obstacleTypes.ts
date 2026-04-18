import type { ObstacleTypeConfig } from '$lib/types/course';

export const OBSTACLE_TYPES: ObstacleTypeConfig[] = [
	{ id: 'pole', label: 'Light Pole', symbol: '×', color: '#ef4444' },
	{ id: 'drain', label: 'Drain', symbol: '◇', color: '#f59e0b' },
	{ id: 'curb', label: 'Curb', symbol: '▬', color: '#ef4444' },
	{ id: 'building', label: 'Building', symbol: '▢', color: '#94a3b8' },
	{ id: 'pothole', label: 'Pothole', symbol: '○', color: '#f59e0b' },
	{ id: 'hazard', label: 'Hazard', symbol: '⚠', color: '#ef4444' }
];

export function getObstacleType(id: string): ObstacleTypeConfig | undefined {
	return OBSTACLE_TYPES.find((t) => t.id === id);
}
