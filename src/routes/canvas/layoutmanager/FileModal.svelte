<script>
	let { showModal = $bindable(), header, children } = $props();

	let dialog = $state(); // HTMLDialogElement

	$effect(() => {
		if (showModal) dialog.showModal();
	});

	function handleDragStart(e) {
		console.log('dragging')
		e.stopPropagation();
	}
</script>

<dialog
	bind:this={dialog}
	onclose={() => (showModal = false)}
	onclick={(e) => { if (e.target === dialog) dialog.close(); }}
	class="backdrop:bg-primary/50 m-auto max-w-3/4 w-5xl min-h-150 max-h-3/4 h-fit
	rounded-xl"
>
	<div class="w-full h-full p-5" draggable="true"
		ondragstart={handleDragStart}
		ondragend={()=>console.log("dragend")}
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
