import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Viewport,
} from '@xyflow/react';
import type { LynkNode, LynkNodeData, LynkNodeType, CanvasState } from '../types';
import { CanvasStateSchema } from '../schemas/canvas';

// Highlighted region reference for source highlighting
export interface HighlightedRegion {
  nodeId: string;
  regionId: string;
}

interface CanvasStore {
  // State
  nodes: LynkNode[];
  edges: Edge[];
  viewport: Viewport;
  highlightedRegion: HighlightedRegion | null;
  canvasName: string;
  canvasId: string;
  lastSaved: string | null;

  // React Flow change handlers
  onNodesChange: (changes: NodeChange<LynkNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;

  // Node actions
  addNode: (type: LynkNodeType, position: { x: number; y: number }, data: LynkNodeData) => string;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<LynkNodeData>) => void;

  // Edge actions
  addEdge: (edge: Edge) => void;
  removeEdge: (edgeId: string) => void;

  // Viewport actions
  setViewport: (viewport: Viewport) => void;

  // Highlight actions
  setHighlightedRegion: (region: HighlightedRegion | null) => void;

  // Canvas actions
  clearCanvas: () => void;
  setCanvasName: (name: string) => void;

  // Persistence actions
  exportCanvas: () => CanvasState;
  importCanvas: (state: CanvasState) => { success: boolean; error?: string };
  saveToFile: () => void;
  loadFromFile: () => Promise<{ success: boolean; error?: string }>;
}

let nodeIdCounter = 0;
const generateNodeId = () => `node-${++nodeIdCounter}`;
const generateCanvasId = () => `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  highlightedRegion: null,
  canvasName: 'Untitled Canvas',
  canvasId: generateCanvasId(),
  lastSaved: null,

  // React Flow change handlers
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as LynkNode[],
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  // Node actions
  addNode: (type, position, data) => {
    const id = generateNodeId();
    const newNode = {
      id,
      type,
      position,
      data,
    } as LynkNode;
    set({ nodes: [...get().nodes, newNode] });
    return id;
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
    });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ) as LynkNode[],
    });
  },

  // Edge actions
  addEdge: (edge) => {
    set({ edges: [...get().edges, edge] });
  },

  removeEdge: (edgeId) => {
    set({
      edges: get().edges.filter((edge) => edge.id !== edgeId),
    });
  },

  // Viewport actions
  setViewport: (viewport) => {
    set({ viewport });
  },

  // Highlight actions
  setHighlightedRegion: (region) => {
    set({ highlightedRegion: region });
  },

  // Canvas actions
  clearCanvas: () => {
    set({
      nodes: [],
      edges: [],
      highlightedRegion: null,
      canvasName: 'Untitled Canvas',
      canvasId: generateCanvasId(),
      lastSaved: null,
    });
    nodeIdCounter = 0;
  },

  setCanvasName: (name) => {
    set({ canvasName: name });
  },

  // Persistence actions
  exportCanvas: () => {
    const { nodes, edges, viewport, canvasName, canvasId, lastSaved } = get();
    const now = new Date().toISOString();

    return {
      version: '1.0.0',
      metadata: {
        id: canvasId,
        name: canvasName,
        createdAt: lastSaved || now,
        updatedAt: now,
      },
      nodes,
      edges,
      viewport,
    };
  },

  importCanvas: (state) => {
    // Validate the state with Zod
    const result = CanvasStateSchema.safeParse(state);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid canvas file: ${result.error.issues.map((i) => i.message).join(', ')}`,
      };
    }

    const validState = result.data;

    // Find the highest node ID number to continue from
    let maxNodeId = 0;
    for (const node of validState.nodes) {
      const match = node.id.match(/^node-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNodeId) maxNodeId = num;
      }
    }
    nodeIdCounter = maxNodeId;

    set({
      nodes: validState.nodes as LynkNode[],
      edges: validState.edges,
      viewport: validState.viewport,
      canvasName: validState.metadata.name,
      canvasId: validState.metadata.id,
      lastSaved: validState.metadata.updatedAt,
      highlightedRegion: null,
    });

    return { success: true };
  },

  saveToFile: () => {
    const state = get().exportCanvas();
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.metadata.name.replace(/[^a-z0-9]/gi, '_')}.lynk.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    set({ lastSaved: state.metadata.updatedAt });
  },

  loadFromFile: () => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.lynk.json';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve({ success: false, error: 'No file selected' });
          return;
        }

        try {
          const text = await file.text();
          const data = JSON.parse(text);
          const result = get().importCanvas(data);
          resolve(result);
        } catch (err) {
          resolve({
            success: false,
            error: `Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`,
          });
        }
      };

      input.oncancel = () => {
        resolve({ success: false, error: 'File selection cancelled' });
      };

      input.click();
    });
  },
}));
