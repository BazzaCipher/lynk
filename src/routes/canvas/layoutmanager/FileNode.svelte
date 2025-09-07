<script lang="ts">
    import { NodeToolbar, Handle, Position, type NodeProps } from '@xyflow/svelte';
	import { onDestroy } from 'svelte';
    import EntryNode from './EntryNode.svelte';
	import FileModal from './FileModal.svelte';
    import type { FileNodeProps } from '$lib/types';

    let { id, data }: FileNodeProps = $props();
    let { file } = data as FileNodeProps;

    let fileiconUrl = `/fileicon/${file.ext ?? 'default'}.svg`;
    let isVisible = $state(false);
	let showModal = $state(false);

	// Timer for hiding
	let hideTimer = $state(0);

	// Function for setting modal
	function handleModalOpen(e) {
		e.preventDefault();
		showModal = true;
	}
</script>

<NodeToolbar {isVisible} >
    <div class="bg-popover border-2 rounded-sm px-1">{file.name ?? '.' + file.ext ?? 'unknown'}</div>
</NodeToolbar>

<div class="w-full overflow-hidden flex items-center"
	onmouseenter={() => {
		hideTimer = setTimeout(() => {
			isVisible = true;
		}, 2000);
	}}
	onmouseleave={() => {
		if (hideTimer) {
			clearTimeout(hideTimer);
			hideTimer = null;
		}
		isVisible = false;
	}}
	ondblclick={handleModalOpen}
>
	<img class="shrink-0 h-[1.2em] w-auto mx-0.5" alt="File icon"
		src={fileiconUrl} loading="lazy"/>
	<div class="text-left ml-1 truncate flex-1 font-bold">{data.label}</div>
</div>

<FileModal bind:showModal>

</FileModal>

<style>
	::backdrop {
		
	}
</style>
