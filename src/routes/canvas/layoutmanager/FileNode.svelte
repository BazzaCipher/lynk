<script lang="ts">
    import { Handle, Position, type NodeProps } from '@xyflow/svelte';
    import EntryNode from './EntryNode.svelte';
    import type { FileNodeProps } from '$lib/types';

    let { id, data }: FileNodeProps = $props();
    let { file } = data as FileNodeProps;

    let fileiconUrl = `/fileicon/${file.ext ?? 'default'}.svg`;
</script>

<div class="w-full">
    <a class="flex items-center" href="/">
        <img class="h-[1.2em] w-auto mx-0.5" alt="File icon"
            src={fileiconUrl} loading="lazy"/>
        <div class="ml-1 font-bold">{data.label}</div>
    </a>
</div>