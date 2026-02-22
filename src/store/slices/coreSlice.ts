/**
 * Core Slice
 *
 * Fundamental canvas state: nodes, edges, viewport, highlighting.
 */

import {
  applyNodeChanges,
  applyEdgeChanges,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Viewport,
} from '@xyflow/react';
import type { LynkNode, LynkNodeData, LynkNodeType, DisplayNodeData, ViewportRegion } from '../../types';
import { FileNode } from '../../types';
import {
  wouldCreateCycle,
  getTopologicalOrder,
  getDependentNodes,
} from '../../core/engine/dependencyGraph';
import { validateNodeDataUpdate } from '../../services/canvasValidation';
import { BlobRegistry } from '../canvasPersistence';
import type { StateCreator } from './types';

let nodeIdCounter = 0;
export const generateNodeId = () => `node-${++nodeIdCounter}`;
export const resetNodeIdCounter = (value = 0) => { nodeIdCounter = value; };
export const setNodeIdCounter = (value: number) => { nodeIdCounter = value; };

export interface CoreSlice {
  nodes: LynkNode[];
  edges: Edge[];
  viewport: Viewport;
  highlightedHandle: string | null;

  onNodesChange: (changes: NodeChange<LynkNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;

  addNode: (type: LynkNodeType, position: { x: number; y: number }, data: LynkNodeData) => string;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<LynkNodeData>) => void;
  replaceNode: (nodeId: string, newType: LynkNodeType, newData: LynkNodeData) => void;

  addEdge: (edge: Edge) => boolean;
  removeEdge: (edgeId: string) => void;
  removeEdgesToTarget: (targetNodeId: string, targetHandle?: string) => void;
  canAddEdge: (source: string, target: string) => boolean;

  getCalculationOrder: () => string[] | null;
  getDependents: (nodeId: string) => string[];

  setViewport: (viewport: Viewport) => void;
  setHighlightedHandle: (handle: string | null) => void;

  updateViewportRegion: (nodeId: string, viewportId: string, updates: Partial<ViewportRegion>) => void;
}

export const createCoreSlice: StateCreator<CoreSlice> = (set, get) => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  highlightedHandle: null,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as LynkNode[] });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  addNode: (type, position, data) => {
    const id = generateNodeId();
    set({ nodes: [...get().nodes, { id, type, position, data } as LynkNode] });
    return id;
  },

  removeNode: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    // Clean up file references when removing a FileNode
    if (node && FileNode.is(node as LynkNode)) {
      const fileId = FileNode.getFileId(node as LynkNode);
      if (fileId) {
        BlobRegistry.removeNodeReference(fileId, nodeId);
      }
    }
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
  },

  updateNodeData: (nodeId, data) => {
    const { nodes } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (node) validateNodeDataUpdate(node.type, data);

    set({
      nodes: nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ) as LynkNode[],
    });
  },

  replaceNode: (nodeId, newType, newData) => {
    if (!get().nodes.find((n) => n.id === nodeId)) return;
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, type: newType, data: newData } : n
      ) as LynkNode[],
    });
  },

  addEdge: (edge) => {
    const { edges } = get();
    if (wouldCreateCycle(edges, edge.source, edge.target)) {
      console.warn(`Edge from ${edge.source} to ${edge.target} would create a cycle`);
      return false;
    }
    set({ edges: [...edges, edge] });
    return true;
  },

  removeEdge: (edgeId) => {
    set({ edges: get().edges.filter((e) => e.id !== edgeId) });
  },

  removeEdgesToTarget: (targetNodeId, targetHandle) => {
    set({
      edges: get().edges.filter((e) => {
        if (e.target !== targetNodeId) return true;
        if (targetHandle !== undefined && e.targetHandle !== targetHandle) return true;
        return false;
      }),
    });
  },

  canAddEdge: (source, target) => !wouldCreateCycle(get().edges, source, target),

  getCalculationOrder: () => {
    const { nodes, edges } = get();
    return getTopologicalOrder(nodes.map((n) => n.id), edges);
  },

  getDependents: (nodeId) => getDependentNodes(get().edges, nodeId),

  setViewport: (viewport) => set({ viewport }),
  setHighlightedHandle: (handle) => set({ highlightedHandle: handle }),

  updateViewportRegion: (nodeId, viewportId, updates) => {
    const { nodes } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || node.type !== 'display') return;

    const displayData = node.data as DisplayNodeData;
    const viewports = displayData.viewports || [];
    const updatedViewports = viewports.map((v) =>
      v.id === viewportId ? { ...v, ...updates } : v
    );

    set({
      nodes: nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, viewports: updatedViewports } }
          : n
      ) as LynkNode[],
    });
  },
});
