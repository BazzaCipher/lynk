<script lang="ts">
    import { Handle, Position, type NodeProps } from '@xyflow/svelte'

    let { id, data }: NodeProps = $props()
</script>

<Handle type="target" position={Position.Left} />
<div>Aggregate Node</div>