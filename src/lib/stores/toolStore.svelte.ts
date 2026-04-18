export type Tool =
	| 'regular'
	| 'pointer'
	| 'start-cone'
	| 'finish-cone'
	| 'trailer'
	| 'staging-grid'
	| 'gate'
	| 'slalom'
	| 'obstacle'
	| 'worker'
	| 'select'
	| 'drivingline'
	| 'measure'
	| 'courseoutline'
	| 'note'
	| 'scale';

const CONE_TOOLS: Tool[] = ['regular', 'pointer', 'start-cone', 'finish-cone', 'gate', 'slalom'];

import type { ObstacleTypeId } from '$lib/types/course';

let activeTool = $state<Tool>('regular');
let previousTool = $state<Tool>('regular');
let gateWidthFeet = $state(20);
let slalomSpacingFeet = $state(75);
let selectedObstacleType = $state<ObstacleTypeId>('pole');
let statusMessage = $state('');

export const toolStore = {
	get activeTool() {
		return activeTool;
	},

	get gateWidthFeet() {
		return gateWidthFeet;
	},

	get slalomSpacingFeet() {
		return slalomSpacingFeet;
	},

	get statusMessage() {
		return statusMessage;
	},

	get selectedObstacleType() {
		return selectedObstacleType;
	},

	get isConeTool() {
		return CONE_TOOLS.includes(activeTool);
	},

	setTool(tool: Tool): void {
		if (tool === 'select') {
			previousTool = activeTool;
		}
		activeTool = tool;
		statusMessage = '';
	},

	revertFromSelect(): void {
		activeTool = previousTool;
		statusMessage = '';
	},

	setGateWidth(feet: number): void {
		gateWidthFeet = feet;
	},

	setSlalomSpacing(feet: number): void {
		slalomSpacingFeet = feet;
	},

	setObstacleType(type: ObstacleTypeId): void {
		selectedObstacleType = type;
	},

	setStatus(msg: string): void {
		statusMessage = msg;
	},

	clearStatus(): void {
		statusMessage = '';
	}
};
