<script lang="ts">
    import {
        NodeTypes,
        LayoutStateManager
    } from './layoutmanager/LayoutStateManager.svelte'
    import { config } from '$lib/config'
    import { onMount, onDestroy } from 'svelte';
    import {
        SvelteFlow,
        Controls,
        Background,
        MiniMap,
        SvelteFlowProvider,
        type Node,
        type Edge,
        useSvelteFlow,
    } from '@xyflow/svelte'
    import type { Simulation } from 'd3-force';
    type FileMapBreakdown = {
        name: string,
        amount: number,
        currency: string,
    }

    let nodes: Node[] = $state([]);
    let edges: Edge[] = $state([]);

    // Run the simulation below
    let simulation: Simulation<any, any>;
    let layoutStateManager: LayoutStateManager;

    onMount(() => {
        console.log('mounting');
        layoutStateManager = new LayoutStateManager(nodes, edges);
        layoutStateManager.initialise();
        simulation = layoutStateManager.getSimulation();
        // Set up the reactivity on the node simulation
        $effect(() => {
            nodes = layoutStateManager.nodes;
        });
        $effect(() => {
            edges = layoutStateManager.edges;
        });
        
        return () => {
            if (simulation) layoutStateManager.stop();
        }
    })

    onDestroy(() => {
        if (simulation) layoutStateManager.stop();
    });

    function forceContainWithinParent(nodes, parents) {
        function force(alpha) {
            for (const node of nodes) {
            if (!node.parentId) continue;

            const parent = parents.find(p => p.id === node.parentId);
            if (!parent) continue;

            const margin = 10; // inner margin
            const minX = parent.x + margin;
            const maxX = parent.x + parent.width - margin;
            const minY = parent.y + margin;
            const maxY = parent.y + parent.height - margin;

            if (node.x < minX) node.vx += (minX - node.x) * 0.1 * alpha;
            if (node.x > maxX) node.vx += (maxX - node.x) * 0.1 * alpha;
            if (node.y < minY) node.vy += (minY - node.y) * 0.1 * alpha;
            if (node.y > maxY) node.vy += (maxY - node.y) * 0.1 * alpha;
            }
        }

        return force;
    }

    let isDragging = $state(false);

    function handleDrop(event: DragEvent) {
        event.preventDefault();
        if(!event.dataTransfer) return;

        // Have to mention only allowed file types
        let droppedFiles = Array.from(event.dataTransfer.files);
        if (layoutStateManager.dropFiles(droppedFiles) !== null)  {
            // TODO: Implement a nice graphic
            alert("Oops, that wasn't meant to happen")
            console.log("File upload failed")
        }
    }

    function handleDragOver(event: DragEvent) {
        event.preventDefault();
        isDragging = true;
    }

    function handleDragLeave(event: DragEvent) {
        event.preventDefault()
        isDragging = false;
    }

    // Dragging behaviour under simulation
    // @ts-ignore
    function handleNodeDragStart({ targetNode }) {
        layoutStateManager.draggingNode = targetNode;
        //draggingNode = targetNode
    }
    
    // @ts-ignore
    function handleNodeDrag({ targetNode }) {
        layoutStateManager.draggingNode = targetNode;
        //draggingNode = targetNode;
    }
    
    function handleNodeDragStop() {
        layoutStateManager.draggingNode = null;
        //draggingNode = undefined;
    }
</script>

<style>
    .drop-zone {
        text-align: center;
        color: #666;
        border-radius: 10px;
    }

    .drop-zone.dragover {
        border: 2px dashed #aaa;
        border-color: #333;
        background: #f9f9f9;
    }
</style>

<div
    class="drop-zone"
    class:dragover={isDragging}
    role="region"
    aria-label="File upload drop zone"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    >
<div style:height = "100vh">
    <SvelteFlowProvider>
        <SvelteFlow
            bind:nodes
            bind:edges
            nodeTypes={NodeTypes}
            fitView
            onnodedragstart={handleNodeDragStart}
            onnodedrag={handleNodeDrag}
            onnodedragstop={handleNodeDragStop}>
            <Controls />
            <Background />
            <MiniMap />
        </SvelteFlow>
    </SvelteFlowProvider>
</div>
</div>