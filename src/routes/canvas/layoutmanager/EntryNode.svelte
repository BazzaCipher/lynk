<script lang="ts">
    import { onMount } from 'svelte';
    import { Handle, Position, type NodeProps } from '@xyflow/svelte'
    import * as Card from '$lib/components/ui/card/index.js'
    // Constants
    const defaultCurrencyForLocale: { [key: string]: string } = {
        'en-US': 'USD',
        'en-GB': 'GBP',
        'en-AU': 'AUD',
        'fr-FR': 'EUR',
    };

    let { id, data }: NodeProps = $props()

    // Currency on right
    const userLocale = navigator.language || 'en-US'

    let formattedValue = Intl.NumberFormat(userLocale, {
        style: 'currency',
        currency: defaultCurrencyForLocale[userLocale] ?? 'USD',
        currencySign: 'accounting'
    }).format(data.value)
</script>

<style>
    .entry-node {
        width: 100px;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }

    .left {
        min-width: 0;
        color: var(--muted-foreground);
    }

    .right {
        color: var(--primary);
    }
</style>

<div class="entry-node flex flex-row ">
    <div class="left text-left flex-1 min-w-0 truncate">{data.label}</div>
    <div class="right shrink-0 font-bold">
        {formattedValue}
    </div>
</div>
<Handle type="source" position={Position.Right} isConnectable={true}/>