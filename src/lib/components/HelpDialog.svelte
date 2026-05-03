<script lang="ts">
	import BaseDialog from './BaseDialog.svelte';

	let { onclose }: { onclose: () => void } = $props();
</script>

<BaseDialog title="Help — Autocross Course Designer" {onclose}>
	{#snippet children()}
		<div class="help-content">
			<section>
				<h3>Cones</h3>
				<dl>
					<dt>Regular</dt><dd>Standard orange traffic cone. Click the map to place.</dd>
					<dt>Pointer</dt><dd>Lime directional cone that automatically points toward the nearest regular cone.</dd>
					<dt>Start</dt><dd>Green cone marking the course start.</dd>
					<dt>Finish</dt><dd>Checkered cone marking the course finish.</dd>
				</dl>
			</section>

			<section>
				<h3>Course Elements</h3>
				<dl>
					<dt>Gate</dt><dd>Two-click placement. Click the center, then click to set the driving direction. Adjust gate width in the inline settings before placing.</dd>
					<dt>Slalom</dt><dd>Two-click placement. Click start and end positions. Adjust spacing in the inline settings. A dialog lets you fine-tune count and spacing before confirming.</dd>
					<dt>Driving Line</dt><dd>Click to add waypoints. The line is smoothed with a Catmull-Rom spline. Right-click a waypoint to delete it.</dd>
					<dt>Outline</dt><dd>Draw course boundary segments. Two clicks create a curved segment. Drag the yellow control point to adjust the curve.</dd>
				</dl>
			</section>

			<section>
				<h3>Lot Features</h3>
				<dl>
					<dt>Obstacle</dt><dd>Mark lot hazards (poles, drains, curbs, etc). Choose the type in the inline dropdown.</dd>
					<dt>Trailer</dt><dd>Place a labeled trailer marker. Resize by dragging corner handles. Rotate by dragging the orange circle above it.</dd>
					<dt>Staging Grid</dt><dd>Place a labeled staging area. Resize and rotate like the trailer.</dd>
				</dl>
			</section>

			<section>
				<h3>Annotations</h3>
				<dl>
					<dt>Worker Station</dt><dd>Place numbered worker positions. Right-click to rename or delete.</dd>
					<dt>Note</dt><dd>Click to place a text note on the map.</dd>
					<dt>Measure</dt><dd>Click two points to measure distance in feet. Clicks near cones snap to them. Measurements linked to cones move with the cone.</dd>
				</dl>
			</section>

			<section>
				<h3>Select Tool</h3>
				<dl>
					<dt>Box Select</dt><dd>Drag on the map to draw a selection box. All elements inside are selected (highlighted in blue).</dd>
					<dt>Group Move</dt><dd>Drag any selected element to move all selected items together.</dd>
					<dt>Delete</dt><dd>Press Delete to remove all selected elements.</dd>
				</dl>
			</section>

			<section>
				<h3>Sidebar Controls</h3>
				<dl>
					<dt>Layers</dt><dd>Toggle visibility of cones, workers, driving line, measurements, notes, outline, and grid.</dd>
					<dt>Marker Size</dt><dd>Slider to scale all markers up or down.</dd>
					<dt>Grid Overlay</dt><dd>Toggle a grid with configurable spacing (feet), rotation, and light/dark line style.</dd>
					<dt>Map Fade</dt><dd>Desaturate and darken the satellite map so course elements stand out. Useful for PDF export.</dd>
				</dl>
			</section>

			<section>
				<h3>Keyboard Shortcuts</h3>
				<div class="shortcut-grid">
					<span class="key">1-9</span><span>Select tools (Regular, Pointer, Start, Finish, Gate, Slalom, Driving Line, Measure, Note)</span>
					<span class="key">O</span><span>Course Outline</span>
					<span class="key">X</span><span>Obstacle</span>
					<span class="key">T</span><span>Trailer</span>
					<span class="key">G</span><span>Staging Grid</span>
					<span class="key">W</span><span>Worker Station</span>
					<span class="key">S</span><span>Set Scale (image mode)</span>
					<span class="key">Esc</span><span>Select tool</span>
					<span class="key">Ctrl+Z</span><span>Undo</span>
					<span class="key">Ctrl+Y</span><span>Redo</span>
					<span class="key">Ctrl+A</span><span>Select all</span>
					<span class="key">Del</span><span>Delete selected</span>
				</div>
			</section>

			<section>
				<h3>File Operations</h3>
				<dl>
					<dt>Save & Share</dt><dd>Save the course to the cloud and get a shareable link.</dd>
					<dt>Export / Import</dt><dd>Download or load courses as JSON files.</dd>
					<dt>SVG</dt><dd>Export the course as an SVG vector image.</dd>
					<dt>PDF</dt><dd>Print or save the course as a PDF. Use Map Fade to improve contrast.</dd>
				</dl>
			</section>
		</div>
	{/snippet}
	{#snippet actions()}
		<button class="dialog-btn dialog-btn-confirm" onclick={onclose}>Close</button>
	{/snippet}
</BaseDialog>

<style>
	:global(.dialog) {
		width: 500px !important;
	}

	.help-content {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.help-content section {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.help-content h3 {
		font-size: 13px;
		font-weight: 700;
		color: var(--text-primary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border-bottom: 1px solid var(--border);
		padding-bottom: 4px;
	}

	.help-content dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 4px 10px;
		margin: 0;
	}

	.help-content dt {
		font-size: 12px;
		font-weight: 600;
		color: var(--accent-light);
	}

	.help-content dd {
		font-size: 12px;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.4;
	}

	.shortcut-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 3px 10px;
	}

	.key {
		font-family: monospace;
		font-size: 11px;
		background: var(--bg-base);
		padding: 1px 5px;
		border-radius: 3px;
		color: var(--text-secondary);
		text-align: center;
		border: 1px solid var(--border);
	}

	.shortcut-grid span:not(.key) {
		font-size: 12px;
		color: var(--text-muted);
		line-height: 1.4;
	}
</style>
