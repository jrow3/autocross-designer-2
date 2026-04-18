<script lang="ts">
	let {
		onselect
	}: {
		onselect: (mode: 'map' | 'image', imageSrc?: string, fileName?: string) => void;
	} = $props();

	let showGallery = $state(false);
	let galleryImages = $state<{ name: string; file: string }[]>([]);
	let fileInput: HTMLInputElement;

	async function loadManifest() {
		try {
			const res = await fetch('assets/courses/manifest.json?t=' + Date.now());
			galleryImages = await res.json();
		} catch {
			galleryImages = [];
		}
	}

	function selectMap() {
		onselect('map');
	}

	async function openGallery() {
		await loadManifest();
		showGallery = true;
	}

	function selectGalleryImage(img: { name: string; file: string }) {
		onselect('image', `assets/courses/${img.file}`, img.name);
	}

	function handleUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			onselect('image', ev.target?.result as string, file.name);
		};
		reader.readAsDataURL(file);
	}
</script>

<div class="banner-overlay">
	{#if !showGallery}
		<div class="mode-choices">
			<h1 class="banner-title">Autocross Course Designer</h1>
			<div class="banner-buttons">
				<button class="mode-btn" onclick={selectMap}>
					<span class="mode-icon">🗺️</span>
					Draw on Live Map
				</button>
				<button class="mode-btn" onclick={openGallery}>
					<span class="mode-icon">🖼️</span>
					Load Image
				</button>
			</div>
		</div>
	{:else}
		<div class="gallery-panel">
			<h2 class="gallery-header">Choose a Course Image</h2>
			<div class="gallery-grid">
				{#each galleryImages as img}
					<button class="gallery-thumb" onclick={() => selectGalleryImage(img)}>
						<img src="assets/courses/{img.file}" alt={img.name} />
						<span>{img.name}</span>
					</button>
				{/each}
				<button class="gallery-thumb gallery-upload" onclick={() => fileInput.click()}>
					<span class="upload-icon">+</span>
					<span>Upload</span>
				</button>
			</div>
			<button class="gallery-back" onclick={() => (showGallery = false)}>Back</button>
		</div>
	{/if}
</div>

<input
	type="file"
	accept="image/*"
	bind:this={fileInput}
	onchange={handleUpload}
	style="display:none"
/>

<style>
	.banner-overlay {
		position: absolute;
		inset: 0;
		background: rgba(15, 23, 42, 0.95);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
	}

	.mode-choices {
		text-align: center;
	}

	.banner-title {
		font-size: 24px;
		font-weight: 700;
		color: #e2e8f0;
		margin-bottom: 32px;
	}

	.banner-buttons {
		display: flex;
		gap: 24px;
	}

	.mode-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 32px 40px;
		background: #1e293b;
		border: 2px solid #334155;
		border-radius: 12px;
		color: #e2e8f0;
		font-size: 16px;
		cursor: pointer;
		transition: border-color 0.2s, background 0.2s;
	}

	.mode-btn:hover {
		border-color: #3b82f6;
		background: #1e3a5f;
	}

	.mode-icon {
		font-size: 36px;
	}

	.gallery-panel {
		width: 90%;
		max-width: 700px;
		max-height: 80vh;
		overflow-y: auto;
	}

	.gallery-header {
		font-size: 18px;
		color: #e2e8f0;
		margin-bottom: 16px;
		text-align: center;
	}

	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 12px;
		margin-bottom: 16px;
	}

	.gallery-thumb {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 8px;
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 8px;
		cursor: pointer;
		color: #cbd5e1;
		font-size: 12px;
		text-align: center;
	}

	.gallery-thumb:hover {
		border-color: #3b82f6;
	}

	.gallery-thumb img {
		width: 100%;
		aspect-ratio: 4/3;
		object-fit: cover;
		border-radius: 4px;
	}

	.gallery-upload {
		justify-content: center;
		min-height: 120px;
	}

	.upload-icon {
		font-size: 32px;
		color: #64748b;
	}

	.gallery-back {
		display: block;
		margin: 0 auto;
		padding: 8px 24px;
		background: #334155;
		border: none;
		border-radius: 6px;
		color: #cbd5e1;
		font-size: 14px;
		cursor: pointer;
	}
</style>
