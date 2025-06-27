import {
    SvelteFlow,
    Controls,
    Background,
    MiniMap,
    SvelteFlowProvider,
    type Node,
    type Edge,
    useSvelteFlow

} from '@xyflow/svelte'
import * as d3Force from 'd3-force';
import type { Simulation } from 'd3-force';
import '@xyflow/svelte/dist/style.css'

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
}
