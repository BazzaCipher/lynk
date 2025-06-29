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
import '@xyflow/svelte/dist/style.css'
import { config } from '$lib/config'
import { createNodeIdGenerator } from './util';

export type LayoutState =
  | "grid"
  | "focusOneAggregate"
  | "multiFocus"
  | "childTracing";

interface LayoutPayload {
  selectedAggregateId?: string;
  focusedNodes?: string[];
  // Add more as needed
}

/** LayoutStateManager
 * Handles the state of the canvas layout, provide it the set of initial
 * nodes and it will handle all state transitions. Accepts new nodes (Files)
 * 
 * 
 */
export default class LayoutStateManager {
  private simulation: d3.Simulation<Node, Edge>;
  private currentState: LayoutState = "grid";
  private payload: LayoutPayload = {};

  private nextFileNodeId = createNodeIdGenerator('file')

  constructor(simulation: d3.Simulation<Node, Edge>) {
    this.simulation = simulation;
  }

  public setState(state: LayoutState, payload: LayoutPayload = {}) {
    this.cleanupForces();
    this.currentState = state;
    this.payload = payload;

    switch (state) {
      case "grid":
        this.simulation.force("snap", forceSnapToGrid(...));
        break;

      case "focusOneAggregate":
        this.simulation.force("snap", forceSnapToAggregate(payload.selectedAggregateId!));
        this.simulation.force("highlight", forceHighlightContributors(payload.selectedAggregateId!));
        break;

      // Add more state transitions here
    }

    this.simulation.alphaTarget(0.3).restart();
  }

  public getCurrentState(): LayoutState {
    return this.currentState;
  }

  private cleanupForces() {
    this.simulation.force("snap", null);
    this.simulation.force("highlight", null);
    // Add others as needed
  }

  /// Returned string is NodeId; otherwise returns null
  public dropFiles(files: [File]): [string] | null {
    if (this.state !== 'mainGrid') { return null }

    let newNodeIds = [];
    for (let file of files) {
      let response = fetch('/canvas/upload', {
          method: 'POST',
          body: null// droppedFiles
      })

      let newNodeId = this.nextFileNodeId()[0]
      newNodeIds.push(newNodeId)
      this.nodes.push({
          id: newNodeId,
          data: { label: file.name, breakdown: { name: "hi", amount: 1000, currency: "AUD" } },
          position: { x: 200, y: 100 },
          type: 'fileNode'
      })
      console.log("Dropped: ", file.name)
    }

    console.log('Dropped files: ', files.length);
    this.updateSimulation()
  }
  
  private filterAllowedFiles(file: File): boolean {
    const ext = file.type.split('/').pop()?.toLowerCase();
    if (!ext) return false;

    return file.size <= config.maxUploadSizeMB * 10**6 &&
    config.allowedFileExts.includes(ext)
  }

  /// Call to re-render simulation, use sparingly
  public updateSimulation() {
    
  }
}
