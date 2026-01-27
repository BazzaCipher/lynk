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
import {
  wouldCreateCycle,
  getTopologicalOrder,
  getDependentNodes,
} from '../core/engine/dependencyGraph';
import { clearLocalStorageDraft } from '../hooks/useLocalStorageSync';
import { CanvasExporter, CanvasImporter, CanvasValidator, type ValidationResult } from './canvasPersistence';

// Highlighted region reference for source highlighting
export interface HighlightedRegion {
  nodeId: string;
  regionId: string;
}

// History snapshot for undo/redo
interface HistorySnapshot {
  nodes: LynkNode[];
  edges: Edge[];
}

const MAX_HISTORY_SIZE = 50;

interface CanvasStore {
  // State
  nodes: LynkNode[];
  edges: Edge[];
  viewport: Viewport;
  highlightedRegion: HighlightedRegion | null;
  canvasName: string;
  canvasId: string;
  lastSaved: string | null;

  // History state
  history: HistorySnapshot[];
  historyIndex: number;

  // React Flow change handlers
  onNodesChange: (changes: NodeChange<LynkNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;

  // Node actions
  addNode: (type: LynkNodeType, position: { x: number; y: number }, data: LynkNodeData) => string;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<LynkNodeData>) => void;
  replaceNode: (nodeId: string, newType: LynkNodeType, newData: LynkNodeData) => void;

  // Edge actions
  addEdge: (edge: Edge) => boolean; // Returns false if would create cycle
  removeEdge: (edgeId: string) => void;
  removeEdgesToTarget: (targetNodeId: string, targetHandle?: string) => void;
  canAddEdge: (source: string, target: string) => boolean;

  // Dependency graph selectors
  getCalculationOrder: () => string[] | null;
  getDependents: (nodeId: string) => string[];

  // Viewport actions
  setViewport: (viewport: Viewport) => void;

  // Highlight actions
  setHighlightedRegion: (region: HighlightedRegion | null) => void;

  // Group actions
  createGroup: (nodeIds: string[]) => string | null;
  ungroupNodes: (groupId: string) => void;
  getSelectedNodes: () => LynkNode[];
  getSelectedEdges: () => Edge[];
  removeSelectedNodes: () => void;
  removeSelectedEdges: () => void;
  clearSelection: () => void;

  // History actions
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Canvas actions
  clearCanvas: () => void;
  setCanvasName: (name: string) => void;

  // Persistence actions
  exportCanvas: () => CanvasState;
  importCanvas: (state: CanvasState) => { success: boolean; error?: string };
  validateCanvas: () => ValidationResult;
  saveToFile: () => Promise<{ success: boolean; warnings: string[] }>;
  loadFromFile: () => Promise<{ success: boolean; error?: string }>;

  // Maintenance actions
  cleanupInvalidEdges: () => number; // Returns count of removed edges
}

let nodeIdCounter = 0;
const generateNodeId = () => `node-${++nodeIdCounter}`;
const generateCanvasId = () => `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Validate node data updates for common issues.
 * Returns true if valid, logs warnings for detected issues.
 */
function validateNodeDataUpdate(
  nodeType: string,
  update: Partial<LynkNodeData>
): boolean {
  let isValid = true;

  // Type-specific validation
  if (nodeType === 'calculation') {
    // Validate precision is a reasonable number
    if ('precision' in update && typeof update.precision === 'number') {
      if (update.precision < 0 || update.precision > 10) {
        console.warn(`Invalid precision value: ${update.precision}. Should be 0-10.`);
        isValid = false;
      }
    }
  }

  if (nodeType === 'extractor') {
    // Validate regions array if present
    if ('regions' in update && update.regions) {
      if (!Array.isArray(update.regions)) {
        console.warn('Invalid regions: expected array');
        isValid = false;
      }
    }
  }

  if (nodeType === 'display') {
    // Validate view nodeSize dimensions are positive numbers
    if ('view' in update && update.view) {
      const view = update.view as { nodeSize?: { width?: number; height?: number } };
      if (view.nodeSize) {
        if (typeof view.nodeSize.width === 'number' && view.nodeSize.width <= 0) {
          console.warn(`Invalid view width value: ${view.nodeSize.width}. Should be positive.`);
          isValid = false;
        }
        if (typeof view.nodeSize.height === 'number' && view.nodeSize.height <= 0) {
          console.warn(`Invalid view height value: ${view.nodeSize.height}. Should be positive.`);
          isValid = false;
        }
      }
    }
  }

  // Common validation: label should be a non-empty string if present
  if ('label' in update && update.label !== undefined) {
    if (typeof update.label !== 'string') {
      console.warn(`Invalid label type: expected string, got ${typeof update.label}`);
      isValid = false;
    }
  }

  return isValid;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  highlightedRegion: null,
  canvasName: 'Untitled Canvas',
  canvasId: generateCanvasId(),
  lastSaved: null,
  history: [],
  historyIndex: -1,

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
    const { nodes } = get();
    const node = nodes.find((n) => n.id === nodeId);

    // Validate update if node exists
    if (node) {
      validateNodeDataUpdate(node.type, data);
    }

    set({
      nodes: nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, ...data } }
          : n
      ) as LynkNode[],
    });
  },

  replaceNode: (nodeId, newType, newData) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Replace node type and data while preserving position and id
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, type: newType, data: newData }
          : n
      ) as LynkNode[],
    }));
  },

  // Edge actions
  addEdge: (edge) => {
    const { edges } = get();
    // Check for cycles before adding
    if (wouldCreateCycle(edges, edge.source, edge.target)) {
      console.warn(`Edge from ${edge.source} to ${edge.target} would create a cycle`);
      return false;
    }
    set({ edges: [...edges, edge] });
    return true;
  },

  removeEdge: (edgeId) => {
    set({
      edges: get().edges.filter((edge) => edge.id !== edgeId),
    });
  },

  removeEdgesToTarget: (targetNodeId, targetHandle) => {
    set({
      edges: get().edges.filter((edge) => {
        if (edge.target !== targetNodeId) return true;
        if (targetHandle !== undefined && edge.targetHandle !== targetHandle) return true;
        return false;
      }),
    });
  },

  canAddEdge: (source, target) => {
    return !wouldCreateCycle(get().edges, source, target);
  },

  // Dependency graph selectors
  getCalculationOrder: () => {
    const { nodes, edges } = get();
    const nodeIds = nodes.map((n) => n.id);
    return getTopologicalOrder(nodeIds, edges);
  },

  getDependents: (nodeId) => {
    return getDependentNodes(get().edges, nodeId);
  },

  // Viewport actions
  setViewport: (viewport) => {
    set({ viewport });
  },

  // Highlight actions
  setHighlightedRegion: (region) => {
    set({ highlightedRegion: region });
  },

  // Group actions
  createGroup: (nodeIds) => {
    const { nodes } = get();
    const selectedNodes = nodes.filter((n) => nodeIds.includes(n.id) && n.type !== 'group');

    if (selectedNodes.length < 2) return null;

    // Calculate bounding box of selected nodes
    const padding = 20;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const node of selectedNodes) {
      const x = node.position.x;
      const y = node.position.y;
      // Estimate node dimensions (default to 200x100 if unknown)
      const width = (node as { width?: number }).width ?? 200;
      const height = (node as { height?: number }).height ?? 100;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    }

    const groupId = generateNodeId();
    const groupPosition = { x: minX - padding, y: minY - padding };
    const groupWidth = maxX - minX + padding * 2;
    const groupHeight = maxY - minY + padding * 2;

    // Create group node
    const groupNode: LynkNode = {
      id: groupId,
      type: 'group',
      position: groupPosition,
      data: {
        label: 'Group',
        width: groupWidth,
        height: groupHeight,
      },
    } as LynkNode;

    // Update selected nodes to have parentId and relative positions
    const updatedNodes = nodes.map((node) => {
      if (nodeIds.includes(node.id) && node.type !== 'group') {
        return {
          ...node,
          parentId: groupId,
          position: {
            x: node.position.x - groupPosition.x,
            y: node.position.y - groupPosition.y,
          },
        };
      }
      return node;
    });

    set({ nodes: [groupNode, ...updatedNodes] as LynkNode[] });
    return groupId;
  },

  ungroupNodes: (groupId) => {
    const { nodes } = get();
    const groupNode = nodes.find((n) => n.id === groupId && n.type === 'group');
    if (!groupNode) return;

    const groupPosition = groupNode.position;

    // Update children to have absolute positions and remove parentId
    const updatedNodes = nodes
      .filter((n) => n.id !== groupId)
      .map((node) => {
        if (node.parentId === groupId) {
          const { parentId: _parentId, ...rest } = node as LynkNode & { parentId?: string };
          return {
            ...rest,
            position: {
              x: node.position.x + groupPosition.x,
              y: node.position.y + groupPosition.y,
            },
          };
        }
        return node;
      });

    set({ nodes: updatedNodes as LynkNode[] });
  },

  getSelectedNodes: () => {
    return get().nodes.filter((n) => n.selected);
  },

  getSelectedEdges: () => {
    return get().edges.filter((e) => e.selected);
  },

  removeSelectedEdges: () => {
    const { edges } = get();
    set({
      edges: edges.filter((e) => !e.selected),
    });
  },

  clearSelection: () => {
    const { nodes, edges } = get();
    set({
      nodes: nodes.map((n) => ({ ...n, selected: false })) as LynkNode[],
      edges: edges.map((e) => ({ ...e, selected: false })),
    });
  },

  removeSelectedNodes: () => {
    const { nodes, edges } = get();
    const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);

    // Also remove children of selected groups
    const allIdsToRemove = new Set(selectedIds);
    for (const node of nodes) {
      if (node.parentId && allIdsToRemove.has(node.parentId)) {
        allIdsToRemove.add(node.id);
      }
    }

    set({
      nodes: nodes.filter((n) => !allIdsToRemove.has(n.id)),
      edges: edges.filter(
        (e) => !allIdsToRemove.has(e.source) && !allIdsToRemove.has(e.target)
      ),
    });
  },

  // History actions
  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();

    // Create snapshot
    const snapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };

    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);

    // Add new snapshot
    newHistory.push(snapshot);

    // Limit history size
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex, nodes, edges } = get();

    // If this is the first undo, save current state first
    if (historyIndex === history.length - 1 || history.length === 0) {
      const currentSnapshot: HistorySnapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      };

      // Push current state if not already in history
      const newHistory = [...history, currentSnapshot];
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
      }

      if (newHistory.length < 2) return; // Nothing to undo

      const newIndex = newHistory.length - 2;
      const snapshot = newHistory[newIndex];

      set({
        nodes: snapshot.nodes as LynkNode[],
        edges: snapshot.edges,
        history: newHistory,
        historyIndex: newIndex,
      });
      return;
    }

    if (historyIndex <= 0) return; // Nothing to undo

    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];

    set({
      nodes: snapshot.nodes as LynkNode[],
      edges: snapshot.edges,
      historyIndex: newIndex,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();

    if (historyIndex >= history.length - 1) return; // Nothing to redo

    const newIndex = historyIndex + 1;
    const snapshot = history[newIndex];

    set({
      nodes: snapshot.nodes as LynkNode[],
      edges: snapshot.edges,
      historyIndex: newIndex,
    });
  },

  canUndo: () => {
    const { history, historyIndex } = get();
    return history.length > 0 && historyIndex >= 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
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

    // Extract embedded files and restore blob URLs
    const restoredState = CanvasImporter.importWithExtractedFiles(validState as CanvasState);

    // Find the highest node ID number to continue from
    let maxNodeId = 0;
    for (const node of restoredState.nodes) {
      const match = node.id.match(/^node-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNodeId) maxNodeId = num;
      }
    }
    nodeIdCounter = maxNodeId;

    set({
      nodes: restoredState.nodes as LynkNode[],
      edges: restoredState.edges,
      viewport: restoredState.viewport,
      canvasName: restoredState.metadata.name,
      canvasId: restoredState.metadata.id,
      lastSaved: restoredState.metadata.updatedAt,
      highlightedRegion: null,
    });

    // Clean up any invalid edges (e.g., referencing deleted regions/handles)
    const removedEdges = get().cleanupInvalidEdges();
    if (removedEdges > 0) {
      console.log(`Removed ${removedEdges} invalid edge(s) during import`);
    }

    return { success: true };
  },

  validateCanvas: () => {
    const state = get().exportCanvas();
    return CanvasValidator.validateForExport(state);
  },

  saveToFile: async () => {
    const state = get().exportCanvas();

    // Validate before saving
    const validation = CanvasValidator.validateForExport(state);
    if (!validation.valid) {
      console.error('Canvas validation failed:', validation.errors);
      return { success: false, warnings: validation.errors };
    }

    // Embed all files as base64
    const stateWithFiles = await CanvasExporter.exportWithEmbeddedFiles(state);

    const json = JSON.stringify(stateWithFiles, null, 2);
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

    // Clear localStorage draft since we've saved to file
    clearLocalStorageDraft();

    return { success: true, warnings: validation.warnings };
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

  // Maintenance actions
  cleanupInvalidEdges: () => {
    const { nodes, edges } = get();
    const nodeIds = new Set(nodes.map((n) => n.id));

    // Build a map of valid handles for each node
    const validHandles = new Map<string, Set<string>>();
    for (const node of nodes) {
      const handles = new Set<string>();

      switch (node.type) {
        case 'extractor': {
          // Extractor nodes have source handles for each region
          const data = node.data as { regions?: { id: string }[] };
          if (data.regions) {
            for (const region of data.regions) {
              handles.add(region.id);
            }
          }
          break;
        }
        case 'calculation':
          // Calculation nodes have 'inputs' target handle and 'output' source handle
          handles.add('inputs');
          handles.add('output');
          break;
        case 'label':
          // Label nodes have 'input' target handle and 'output' source handle
          handles.add('input');
          handles.add('output');
          break;
        case 'sheet': {
          // Sheet nodes have entry input/output handles and subheader output handles
          const data = node.data as {
            subheaders?: { id: string; entries?: { id: string }[] }[];
          };
          if (data.subheaders) {
            for (const subheader of data.subheaders) {
              handles.add(`subheader-${subheader.id}`);
              if (subheader.entries) {
                for (const entry of subheader.entries) {
                  handles.add(`entry-in-${subheader.id}-${entry.id}`);
                  handles.add(`entry-out-${subheader.id}-${entry.id}`);
                }
              }
            }
          }
          break;
        }
        default:
          // For other node types, allow any handle (backward compatibility)
          break;
      }

      validHandles.set(node.id, handles);
    }

    const validEdges: Edge[] = [];
    let removedCount = 0;

    for (const edge of edges) {
      // Check if source and target nodes exist
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        removedCount++;
        continue;
      }

      // Check if source handle is valid (if specified)
      const sourceHandles = validHandles.get(edge.source);
      if (edge.sourceHandle && sourceHandles && sourceHandles.size > 0) {
        if (!sourceHandles.has(edge.sourceHandle)) {
          removedCount++;
          continue;
        }
      }

      // Check if target handle is valid (if specified)
      const targetHandles = validHandles.get(edge.target);
      if (edge.targetHandle && targetHandles && targetHandles.size > 0) {
        if (!targetHandles.has(edge.targetHandle)) {
          removedCount++;
          continue;
        }
      }

      validEdges.push(edge);
    }

    if (removedCount > 0) {
      set({ edges: validEdges });
      console.warn(`Cleaned up ${removedCount} invalid edge(s)`);
    }

    return removedCount;
  },
}));
