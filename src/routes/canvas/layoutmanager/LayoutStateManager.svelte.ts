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
import * as d3Force from 'd3-force';
import type { Simulation } from 'd3-force';
//import { 'collide' } from 'd3-bboxCollide'
import '@xyflow/svelte/dist/style.css'
import './xy-theme.css'
import { config } from '$lib/config'
// Node imports
import FileNode from './FileNode.svelte'
import AggregateNode from './AggregateNode.svelte'
import EntryNode from './EntryNode.svelte'

export type LayoutState =
| "grid" // Grid of files on the right, one focus col, and aggregates
| "focusOneAggregate" // Focus on aggregate node
| "multiFocus" // Focus on
| "childTracing";

export const NodeTypes = {
	fileNode: FileNode,
	entryNode: EntryNode,
	aggregateNode: AggregateNode
}

let defNodes = $state.raw<any>([
	{
		id: '1',
		data: { label: 'Hello', value: 3_232_232.54 },
		position: { x: 0, y: 0 },
		type: 'entryNode'
	},
	{
		id: '7',
		data: { label: 'MyOtherEntryNode', value: 444 },
		position: { x: 100, y: 0 },
		type: 'entryNode'
	},
	{
		id: '2',
		data: { label: 'World', file: { ext: 'pdf', src: '' } },
		position: { x: 0, y: 150 },
		type: 'fileNode'
	},
	{
		id: '3',
		data: { label: 'World', file: { ext: 'xlsx', src: '' } },
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

let defEdges = $state.raw<Edge[]>([ ]);

// We define the node forces all used here:
/** LayoutStateManager
* Handles the state of the canvas layout, provide it the set of initial
* nodes and it will handle all state transitions. Accepts new nodes (Files)
* 
* The initial nodes can be provided via the constructor
*/
export class LayoutStateManager {
	// These states can be modified anytime
	private simulation: Simulation<any, any>;
	private currentState: LayoutState = "grid";
	private running = false;
	public draggingNode: Node | null = null;
	
	private sim = {
		centre: [0, 0]
	}
	
	// These states describe the grid shape, serializable
	// Raw states are flat for the simulation
	#nodes: Node[] = $state.raw([]);
	#edges: Edge[] = $state.raw([]);
	
	// Other useful properties
	private nextFileNodeId = createNodeIdGenerator('file')
	
	// Forces definitions
	// TODO: Add forces to organise automatically
	static NODEFORCES: {
		[key: string]: d3Force.Force<
		d3Force.SimulationNodeDatum,
		d3Force.SimulationLinkDatum<d3Force.SimulationNodeDatum>
		> | undefined
	} = {
		'nodesCollide': d3Force.forceCollide().radius(40),
		// 'entryNodeInsideParent': d3Force.forceCollide().radius(
		//     function(d: Node) {
		//         if (d.type != 'entryNode') return 0;
		//         return 3
		//     }
		// )
		'fileNodeCenterX': d3Force.forceX().x(0).strength(
			d => (d as Node).type == 'fileNode' ?
			Math.pow(1.1, 1 - config.centralFileNodeXCoord):
			0
		),
		'fileNodeCenterY': d3Force.forceY().y(0),
		// 'test': function(nodes) {
		// 	function initalise() {

		// 	}
		// }
	};
	
	constructor(nodes: Node[], edges: Edge[]) {
		this.simulation = d3Force
		.forceSimulation()
		.alphaDecay(0.009)
		.stop();
		
		this.#nodes = nodes.length === 0 ? defNodes : nodes
		this.#edges = edges.length === 0 ? defEdges : edges
		this.simulation.nodes(nodes);
	}
	
	public setState(state: LayoutState) {
		this.cleanupForces();
		this.currentState = state;
		console.log('applying state', state)
		
		switch (state) {
			case "grid":
				//this.applyNodeForce('entryNodeCollideSiblings')
				// this.applyNodeForce('nodesCollide')
				// this.applyNodeForce('fileNodeCenterX')
				// this.applyNodeForce('fileNodeCenterY')
			break;
			case "focusOneAggregate":
				// this.simulation.force("snap", forceSnapToAggregate(payload.selectedAggregateId!));
				// this.simulation.force("highlight", forceHighlightContributors(payload.selectedAggregateId!));
			break;
		}
		// console.log('added forces')

		this.simulation.alphaTarget(0.3).restart();
	}
	
	public getCurrentState(): LayoutState {
		return this.currentState;
	}
	
	private applyNodeForce(forcename: string, subset: typeof NodeTypes = 'entryNode') {
		this.simulation.force(forcename,
			LayoutStateManager.NODEFORCES[forcename] ?? null
		);
	}
	
	private cleanupForces() {
		// Iterate over forces object
		for (let f in LayoutStateManager.NODEFORCES) {
			this.simulation.force(f, null)
		}
	}
	
	/// Returned string is NodeId; otherwise returns null
	public dropFiles(files: File[]): string[] | null {
		if (this.currentState !== 'grid') { return null }
		
		let newNodeIds = [];
		for (let file of files) {
			if (!this.filterAllowedFiles(file)) continue;
			
			let response = fetch('/canvas/upload', {
				method: 'POST',
				body: null// droppedFiles
			})
			
			let newNodeId = this.nextFileNodeId()[0]
			newNodeIds.push(newNodeId)
			this.#nodes.push({
				id: newNodeId,
				data: { label: file.name, breakdown: { name: "hi", amount: 1000, currency: "AUD" } },
				position: { x: 200, y: 100 },
				type: 'fileNode'
			})
			console.log("Dropped: ", file.name)
		}
		
		console.log('Dropped files: ', files.length);
		this.updateSimulation()
		
		return newNodeIds
	}
	
	private filterAllowedFiles(file: File): boolean {
		const ext = file.type.split('/').pop()?.toLowerCase();
		if (!ext) return false;
		
		return file.size <= config.maxUploadSizeMB * 10**6 &&
		config.allowedFileExts.includes(ext)
	}
	
	public getSimulation(): Simulation<any, any> {
		return this.simulation
	}
	
	/// Call to re-render simulation, use sparingly
	public updateSimulation() {
		
	}
	
	public initialise() {
		if (!this.simulation) return;
		console.log('starting initialisation')
		
		// Create a deep copy of nodes to avoid direct mutation
		let simNodes = this.#nodes.map((node) => ({
			...node,
			x: node.position.x,
			y: node.position.y,
			measured: {
				width: node.width || 150,
				height: node.height || 40,
			},
		}));
		
		// Create a deep copy of edges and ensure it has all the necessary properties
		let simEdges = this.#edges.map((edge) => ({
			...edge,
			source: edge.source,
			target: edge.target,
		}));
		
		// Reset the simulation with the current nodes and edges
		this.simulation.nodes(simNodes);
		
		this.setState('grid');
		
		console.log('finished initialising simulation')
		
		setTimeout(() => {
			console.log('starting animation')
			this.start()
		}, 500)
	}
	
	private attractForceApplyTimeoutId = 0;
	private attractForceRemoveTimeoutId = 0;
	private tick() {
		if (!this.running) return;
		//console.log("ticking")
		
		// Get current simulation nodes
		const simNodes = this.simulation.nodes();
		
		this.simulateDrag(simNodes)
		
		// Step the simulation forward
		this.simulation.tick();
		
		// TODO: Update size of nodes on size change of parent.

		// Update the nodes with their new positions from the simulation
		// Preserve all the original node data while updating only the position
		this.#nodes = simNodes.map((simNode) => {
			// Find the original node to keep all its properties
			const originalNode = this.#nodes.find((n) => n.id === simNode.id) || {};
			
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
			if (this.running) this.tick();
		});
	}
	
	private simulateDrag(simNodes: Node[]) {
		// Update dragged node position if applicable
		simNodes.forEach((node: Node, i: number) => {
			const dragging = this.draggingNode?.id === node.id;
			
			// Setting the fx/fy properties of a node tells the simulation to "fix"
			// the node at that position and ignore any forces that would normally
			// cause it to move.
			if (!dragging || !this.draggingNode) {
				// Release fixed position
				delete simNodes[i].fx;
				delete simNodes[i].fy;
			} else {
				// Debounce for attract force of 5 seconds
				// clearTimeout(this.attractForceApplyTimeoutId)
				// clearTimeout(this.attractForceRemoveTimeoutId)
				// this.attractForceApplyTimeoutId = setTimeout(() => {
				// 	this.simulation.force('fileNodeAttract', d3Force.forceManyBody().strength(300));
				// 	this.simulation.alpha(0.4)
				// }, 5000)
				// this.attractForceRemoveTimeoutId = setTimeout(() => {
				// 	this.simulation.force('fileNodeAttract', null);
				// }, 15000)
				// Fix the position to the dragged position
				simNodes[i].fx = this.draggingNode.position.x;
				simNodes[i].fy = this.draggingNode.position.y;
				this.simulation.alpha(0.4)
			}
		});
	}

	private nodeSubset(nt: typeof NodeTypes): Node[] {
		return this.#nodes.filter(d => d.data.type == nt)
	}
	
	public start() {
		console.log("starting simulation");
		this.running = true;
		this.simulation.alpha(1).restart();
		window.requestAnimationFrame(() => this.tick());
	}
	
	public stop() {
		console.log("stopping simulation");
		this.running = false;
	}
	
	get nodes(): Node[] {
		return this.#nodes
	}
	
	get edges(): Edge[] {
		return this.#edges
	}
}

// Generates node id for the canvas
export function createNodeIdGenerator(suffix = 'node') {
  let counter = 1;

  return function getNextNodeIds(n = 1): string[] {
    const ids = Array.from({ length: n }, () => `${counter++}-${suffix}`);
    return ids;
  };
}
