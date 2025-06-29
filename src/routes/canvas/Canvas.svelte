<script lang="ts">
    import FileNode from './FileNode.svelte'
    import AggregateNode from './AggregateNode.svelte'
    import LayoutStateManager from './LayoutStateManager'
    import { config } from '$lib/config'
    import { onMount, onDestroy } from 'svelte';

    type FileMapBreakdown = {
        name: string,
        amount: number,
        currency: string,
    }

    const nodeTypes = { fileNode: FileNode, aggregateNode: AggregateNode }

    let nodes = $state.raw<Node[]>([
        {
        id: '1',
        data: { label: 'Hello' },
        position: { x: 0, y: 0 },
        type: 'fileNode'
        },
        {
        id: '2',
        data: { label: 'World' },
        position: { x: 0, y: 150 },
        type: 'fileNode'
        },
        {
        id: '3',
        data: { label: 'World' },
        position: { x: 250, y: 150 },
        type: 'fileNode'
        },
        {
        id: '4',
        data: { label: 'Oh myu' },
        position: { x: 250, y: 150 },
        type: 'aggregateNode'
        }
    ]);

    let edges = $state.raw<Edge[]>([ ]);

    // Run the simulation below
    let simulation: Simulation<any, any>;
    let initialized = $state(false);
    let running = $state(true)
    let draggingNode = $state<Node>();

    onMount(() => {
        console.log('mounting')
        simulation = d3Force
            .forceSimulation()
            .alphaDecay(0.009)
            .stop();

        setTimeout(() => {
            console.log('initialised simulation')
            initialized = true;
            for (let i =0; i < 100; i++) { //
            nodes.push({
                id: nextFileNodeIds()[0],
                data: { label: 'Hi', breakdown: { name: "hi", amount: 1000, currency: "AUD" } },
                position: { x: 200, y: 100 },
                type: 'fileNode'
            }) } //
            initializeSimulation();
            window.requestAnimationFrame(tick);
        }, 500)

        return () => {
            if (simulation) simulation.stop();
        }
    })

    onDestroy(() => {
        if (simulation) {
        simulation.stop();
        }
    });

    function initializeSimulation() {
        console.log('starting initialisation')
        if (!simulation || !initialized) return;

        // Create a deep copy of nodes to avoid direct mutation
        let simNodes = nodes.map((node) => ({
            ...node,
            x: node.position.x,
            y: node.position.y,
            measured: {
                width: node.width || 150,
                height: node.height || 40,
            },
        }));
    
        // Create a deep copy of edges and ensure it has all the necessary properties
        let simEdges = edges.map((edge) => ({
            ...edge,
            source: edge.source,
            target: edge.target,
        }));
    
        // Reset the simulation with the current nodes and edges
        simulation.nodes(simNodes);
        simulation
            // .force('links',
            // d3Force
            //     .forceLink(simEdges)
            //     .id((d) => d.id)
            //     .strength(0.05)
            //     .distance(100),
            // )
            .force('fileNodeCollide', d3Force.forceCollide(40))
            .force('fileNodeCenterX', d3Force.forceX().x(0).strength(
                d => (d as Node).type == 'fileNode' ? Math.pow(1.1, 1 - config.centralFileNodeXCoord): 0))
            .force('fileNodeCenterY', d3Force.forceY().y(0)
                .strength(d => (d as Node).type == 'fileNode' ? 0.02: 0))
        
        console.log('finished initialising simulation')
    }

    let attractForceApplyTimeoutId = $state(0);
    let attractForceRemoveTimeoutId = $state(0);
    function tick() {
        if (!running) return;

        // Get current simulation nodes
        const simNodes = simulation.nodes();
    
        // Update dragged node position if applicable
        simNodes.forEach((node: Node, i: number) => {
            const dragging = draggingNode?.id === node.id;
        
            // Setting the fx/fy properties of a node tells the simulation to "fix"
            // the node at that position and ignore any forces that would normally
            // cause it to move.
            if (dragging && !!draggingNode) {
                // Debounce for attract force of 5 seconds
                clearTimeout(attractForceApplyTimeoutId)
                clearTimeout(attractForceRemoveTimeoutId)
                attractForceApplyTimeoutId = setTimeout(() => {
                    simulation.force('fileNodeAttract', d3Force.forceManyBody().strength(300));
                    simulation.alpha(0.4)
                }, 5000)
                attractForceRemoveTimeoutId = setTimeout(() => {
                    simulation.force('fileNodeAttract', null);
                }, 15000)
                // Fix the position to the dragged position
                simNodes[i].fx = draggingNode.position.x;
                simNodes[i].fy = draggingNode.position.y;
                simulation.alpha(0.4)
            } else {
                // Release fixed position
                delete simNodes[i].fx;
                delete simNodes[i].fy;
            }
        });
    
        // Step the simulation forward
        simulation.tick();
    
        // Update the nodes with their new positions from the simulation
        // Preserve all the original node data while updating only the position
        nodes = simNodes.map((simNode) => {
            // Find the original node to keep all its properties
            const originalNode = nodes.find((n) => n.id === simNode.id) || {};

            return {
            ...originalNode,
            position: {
                x: simNode.fx ?? simNode.x,
                y: simNode.fy ?? simNode.y,
            },
            };
        });

        // Request next animation frame and fit the view
        window.requestAnimationFrame(() => {
            if (running) tick();
        });
    }

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
        draggingNode = targetNode
    }
    
    // @ts-ignore
    function handleNodeDrag({ targetNode }) {
        draggingNode = targetNode;
    }
    
    function handleNodeDragStop() {
        draggingNode = undefined;
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
            {nodeTypes}
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