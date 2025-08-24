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
    }).format(Number.isInteger(data.value) ? data.value : 0)
</script>

<div class="flex flex-row justify-between flex flex-row w-full">
    <div class="text-muted-foreground text-left flex-1 min-w-0 truncate">{data.label}</div>
    <div class="shrink-0 font-bold text-primary ps-1">
        {formattedValue}
    </div>
</div>
<Handle type="source" position={Position.Right} isConnectable={true}/>
