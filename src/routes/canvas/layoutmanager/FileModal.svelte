<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolveFile } from '$lib/urls';

	let { showModal = $bindable(), file, viewers, children }:
	{ showModal: boolean; file: FileData; viewers: ViewerPlugin[], children: Snippet }
	= $props();

	let dialog: HTMLDialogElement = $state(); // HTMLDialogElement

	let Viewer: any = null;
	let viewerProps: any = {};
	let loading = $state(false);
	let error = $state(false);

	/// Handle Effects and Drag Behaviour
	$effect(() => {
		if (!dialog) {
			return;
		}
		if (showModal) {
			dialog.showModal();
			console.log("showing modal");
		} else {
			dialog.close();
		}
	});

	function supportedViewers(f: FileData) {
		return viewers
			.filter(x => x.supports(f))
	}

	// Pick viewer and upload file to viewer and display, when dialog opens
	$effect(async () => {
		Viewer = null; viewerProps = {}; error = false;
		if (!file || !viewers) return;

		loading = true;
		const plugin = supportedViewers(file).pop()
		if (!plugin) { loading = false; return; }

		try {
			Viewer = await plugin.load()
			Viewer = Viewer.default;
			viewerProps = {
				file,
				onClose: () => { showModal = false; }
			}
		} catch (e) { console.log(`Error in viewer: ${e}`); error = true; loading = false;
		} finally { loading = false; }
	})

	function handleDragStart(e: DragEvent) { e.stopPropagation(); }
	function handleClose() { showModal = false; }
	function handleBackdropClick(e) { if (e.target === dialog) { showModal = false; } }
	function silenceEvent(e) { e.stopPropagation(); e.stopImmediatePropagation();e.preventDefault() }
	// onwheel={silenceEvent}
	// onpointerdown={silenceEvent}
	// ondragleave={silenceEvent}
</script>

<dialog
	bind:this={dialog}
	onclose={handleClose}
	onclick={handleBackdropClick}
	class="backdrop:bg-gray-900/50 m-auto rounded-xl p-0 nodrag nowheel nopan
		w-[75vw] max-w-5xl h-[75vh] min-h-[150px] overflow-hidden"
>
	<div class="size-full m-0 p-0"
		aria-modal="true"
	>
		<p class="text-base font-semibold">File Viewer</p>
		<div>
			{@render children?.()}
			<hr />
			{#if !file}
				<p class="italic text-chart-1">No file found</p>
			{:else if loading}
				<p class="italic">Loading...</p>
			{:else if error}
				<p class="italic text-chart-1">Failed to load viewer</p>
			{:else if Viewer}
				<svelte:component this={Viewer} {...viewerProps} isVisible={showModal}/>
			{:else}
				<p class="text-chart-1">Unsupported file</p>
			{/if}
		</div>
		<hr />
		<!-- svelte-ignore a11y_autofocus -->
		<button autofocus onclick={() => {showModal=false}}>close modal</button>
	</div>
</dialog>
