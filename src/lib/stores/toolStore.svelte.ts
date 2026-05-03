export type Tool =
	| 'regular'
	| 'pointer'
	| 'start-cone'
	| 'finish-cone'
	| 'trailer'
	| 'gate'
	| 'slalom'
	| 'worker'
	| 'select'
	| 'drivingline'
	| 'measure'
	| 'courseoutline'
	| 'note'
	| 'scale'
	| 'sketch'
	| 'staging-area'
	| 'worker-zone'
	| 'hazard-point'
	| 'hazard-line';

const CONE_TOOLS: Tool[] = ['regular', 'pointer', 'start-cone', 'finish-cone', 'gate', 'slalom'];

let activeTool = $state<Tool>('regular');
let previousTool = $state<Tool>('regular');
let gateWidthFeet = $state(20);
let gateDirectionalCones = $state(false);
let slalomSpacingFeet = $state(75);
let statusMessage = $state('');
let hazardBufferFeet = $state(25);

export const toolStore = {
	get activeTool() {
		return activeTool;
	},

	get gateWidthFeet() {
		return gateWidthFeet;
	},

	get gateDirectionalCones() {
		return gateDirectionalCones;
	},

	get slalomSpacingFeet() {
		return slalomSpacingFeet;
	},

	get statusMessage() {
		return statusMessage;
	},

	get hazardBufferFeet() {
		return hazardBufferFeet;
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

	setGateDirectionalCones(enabled: boolean): void {
		gateDirectionalCones = enabled;
	},

	setSlalomSpacing(feet: number): void {
		slalomSpacingFeet = feet;
	},

	setHazardBufferFeet(feet: number): void {
		hazardBufferFeet = feet;
	},

	setStatus(msg: string): void {
		statusMessage = msg;
	},

	clearStatus(): void {
		statusMessage = '';
	}
};
