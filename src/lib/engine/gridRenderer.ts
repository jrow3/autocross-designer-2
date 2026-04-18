interface GridConfig {
	anchorX: number;
	anchorY: number;
	rotationDeg: number;
	canvasWidth: number;
	canvasHeight: number;
	metersPerPixel: number;
	lineMode: 'dark' | 'light';
	cellSizeM: number;
}

export function metersPerPixel(lat: number, zoom: number): number {
	return (78271.517 * Math.cos(lat * Math.PI / 180)) / Math.pow(2, zoom);
}

export function drawGrid(ctx: CanvasRenderingContext2D, config: GridConfig): void {
	const { anchorX, anchorY, rotationDeg, canvasWidth, canvasHeight, metersPerPixel: mpp, lineMode, cellSizeM } = config;

	ctx.clearRect(0, 0, canvasWidth, canvasHeight);

	const cellPx = cellSizeM / mpp;
	if (cellPx < 4 || cellPx > 2000) return;

	const rotation = (rotationDeg * Math.PI) / 180;

	ctx.save();
	ctx.translate(anchorX, anchorY);
	ctx.rotate(rotation);

	const diagonal = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
	const halfCells = Math.ceil(diagonal / cellPx) + 1;

	ctx.strokeStyle =
		lineMode === 'dark' ? 'rgba(0, 0, 0, 0.55)' : 'rgba(255, 255, 255, 0.45)';
	ctx.lineWidth = 1;
	ctx.beginPath();

	for (let i = -halfCells; i <= halfCells; i++) {
		const pos = i * cellPx;
		ctx.moveTo(pos, -halfCells * cellPx);
		ctx.lineTo(pos, halfCells * cellPx);
		ctx.moveTo(-halfCells * cellPx, pos);
		ctx.lineTo(halfCells * cellPx, pos);
	}

	ctx.stroke();

	// Origin crosshair
	ctx.strokeStyle =
		lineMode === 'dark' ? 'rgba(0, 0, 100, 0.5)' : 'rgba(255, 255, 100, 0.5)';
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(-10, 0);
	ctx.lineTo(10, 0);
	ctx.moveTo(0, -10);
	ctx.lineTo(0, 10);
	ctx.stroke();

	ctx.restore();
}
