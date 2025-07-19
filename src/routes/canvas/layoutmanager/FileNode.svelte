<script lang="ts">
    import { Handle, Position, type NodeProps } from '@xyflow/svelte';
    import EntryNode from './EntryNode.svelte';
    import type { FileNodeProps } from '$lib/types';

    let { id, data }: FileNodeProps = $props();
    let { file } = data as FileNodeProps;

    let fileiconUrl = `/fileicon/${file.ext ?? 'default'}.svg`;
</script>

<div class="max-w-250 w-30">
    <a class="flex items-center" href="/">
        <img class="h-[1.2em] w-auto mx-0.5" alt="File icon"
            src={fileiconUrl} loading="lazy"/>
        <div class="ml-1">{data.label}</div>
    </a>
    <div style="position: absolute;">
    <EntryNode id="sub-2" data={{ label: 'Sub 2', value: 200 }} />
    </div>
</div>