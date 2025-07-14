<script lang="ts">
    import { Handle, Position, type NodeProps } from '@xyflow/svelte'
    let { id, data }: NodeProps = $props()

</script>

<div>{data.label}</div>
<Handle type="source" position={Position.Right} />