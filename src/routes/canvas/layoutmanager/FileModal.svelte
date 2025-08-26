<script lang="ts">
	let { showModal = $bindable(), header, children } = $props();

	let dialog: HTMLDialogElement = $state(); // HTMLDialogElement

	$effect(() => {
		if (showModal && dialog) {
			dialog.showModal();
			console.log("showing modal");
		} else if (!showModal && dialog) {
			dialog.close();
		}
	});

	function handleDragStart(e: DragEvent) {
		console.log('dragging')
		e.stopPropagation();
	}

	function handleClose() {
		showModal = false;
	}

	function handleBackdropClick(e) {
		// Only close if clicking directly on the dialog element (backdrop)
		if (e.target === dialog) {
			dialog.close();
		}
	}
</script>

<dialog
	bind:this={dialog}
	draggable="true"
	onclose={handleClose}
	onclick={handleBackdropClick}
	ondragstart={handleDragStart}
	ondragend={()=>console.log("dragend")}
	class="backdrop:bg-gray-900/50 m-auto max-w-3/4 w-5xl min-h-150 max-h-3/4 h-fit
	rounded-xl"
>
	<div class="size-full m-0 p-0"
		aria-modal="true"
	>
		<p>Random ass text</p>
		{@render header?.()}
		<hr />
		{@render children?.()}
		<hr />
		<!-- svelte-ignore a11y_autofocus -->
		<button autofocus onclick={() => dialog.close()}>close modal</button>
	</div>
</dialog>
