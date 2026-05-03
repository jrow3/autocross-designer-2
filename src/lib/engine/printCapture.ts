import html2canvas from 'html2canvas';

export async function captureMapCanvas(): Promise<HTMLCanvasElement | null> {
	const mapContainer = document.querySelector('.map-container') as HTMLElement | null;
	if (!mapContainer) return null;

	const canvas = await html2canvas(mapContainer, {
		useCORS: true,
		allowTaint: true,
		backgroundColor: null,
		scale: 2
	});

	return canvas;
}

export interface PrintLayout {
	title: string;
	showConeCount: boolean;
	showLegend: boolean;
	showScaleBar: boolean;
}

export function renderPrintCanvas(
	mapCanvas: HTMLCanvasElement,
	layout: PrintLayout,
	coneCount: number,
	lineLength: string
): HTMLCanvasElement {
	const padding = 40;
	const headerHeight = layout.title ? 60 : 20;
	const footerHeight = (layout.showConeCount || layout.showLegend || layout.showScaleBar) ? 80 : 20;

	const width = mapCanvas.width + padding * 2;
	const height = mapCanvas.height + headerHeight + footerHeight;

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d')!;

	// White background
	ctx.fillStyle = '#fff';
	ctx.fillRect(0, 0, width, height);

	// Title
	if (layout.title) {
		ctx.fillStyle = '#1e293b';
		ctx.font = 'bold 24px -apple-system, sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(layout.title, width / 2, 36);
	}

	// Map image
	ctx.drawImage(mapCanvas, padding, headerHeight);

	// Footer info
	const footerY = headerHeight + mapCanvas.height + 24;
	ctx.fillStyle = '#475569';
	ctx.font = '14px -apple-system, sans-serif';
	ctx.textAlign = 'left';

	let x = padding;

	if (layout.showConeCount) {
		ctx.fillText(`Cones: ${coneCount}`, x, footerY);
		x += 120;
		ctx.fillText(`Line: ${lineLength}`, x, footerY);
		x += 140;
	}

	if (layout.showLegend) {
		const legends = [
			{ color: '#f97316', label: 'Regular' },
			{ color: '#22c55e', label: 'Start' },
			{ color: '#ef4444', label: 'Pointer' }
		];
		for (const leg of legends) {
			ctx.fillStyle = leg.color;
			ctx.beginPath();
			ctx.arc(x + 6, footerY - 4, 5, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = '#475569';
			ctx.fillText(leg.label, x + 16, footerY);
			x += 80;
		}
	}

	if (layout.showScaleBar) {
		ctx.fillStyle = '#475569';
		ctx.textAlign = 'right';
		ctx.fillText('Autocross Course Designer', width - padding, footerY);
	}

	return canvas;
}
