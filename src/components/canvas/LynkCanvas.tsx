import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type XYPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '../../store/canvasStore';
import { getNodeTypes } from '../../core/nodes/nodeRegistry';
import { FileControls } from './Toolbar';
import { NodeCreationBar } from './NodeCreationBar';
import { UndoRedoControls } from './UndoRedoControls';
import { PanelToggle } from './PanelToggle';
import { ConnectionLine } from './ConnectionLine';
import { LayoutControls } from './LayoutControls';
import { FileRegistryPanel } from './FileRegistryPanel';
import { NodeContextMenu } from './NodeContextMenu';
import { CanvasContextMenu } from './CanvasContextMenu';
import { ProjectSidebar, type SessionProject } from './ProjectSidebar';
import { EmptyState } from './EmptyState';
import { SuggestionBar } from './SuggestionBar';
import { useToast } from '../ui/Toast';
import { validateConnection } from '../../core/engine/connectionValidation';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useMagneticConnect } from '../../hooks/useMagneticConnect';
import { useCanvasDrop } from '../../hooks/useCanvasDrop';
import type { LynkNode, DisplayNodeData, ViewportRegion } from '../../types';
import { DisplayNode } from '../../types';

// Node types from registry (wrapped with error boundaries)
const nodeTypes = getNodeTypes();

interface CanvasMenuState {
  mode: 'create' | 'actions';
  x: number;
  y: number;
  flowPosition: XYPosition;
}

// Session project store - in-memory snapshots for switching between projects
interface ProjectSnapshot {
  nodes: LynkNode[];
  edges: Edge[];
  viewport: import('@xyflow/react').Viewport;
  canvasName: string;
  canvasId: string;
  lastSaved: string | null;
}

export function LynkCanvas() {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const onNodesChange = useCanvasStore((state) => state.onNodesChange);
  const storeOnEdgesChange = useCanvasStore((state) => state.onEdgesChange);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const storeAddEdge = useCanvasStore((state) => state.addEdge);
  const removeEdge = useCanvasStore((state) => state.removeEdge);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const canvasId = useCanvasStore((state) => state.canvasId);
  const canvasName = useCanvasStore((state) => state.canvasName);
  const loadFromFile = useCanvasStore((state) => state.loadFromFile);
  const fileRegistryOpen = useCanvasStore((state) => state.fileRegistryOpen);
  const toggleFileRegistry = useCanvasStore((state) => state.toggleFileRegistry);
  const { showToast } = useToast();
  const { screenToFlowPosition, fitView, getNodes } = useReactFlow();

  // Keyboard shortcuts (Delete, Ctrl+S, Ctrl+Z, Ctrl+G, etc.)
  useKeyboardShortcuts();

  // Lock children of unselected groups from being dragged
  const processedNodes = useMemo(() => {
    const selectedGroups = new Set(
      nodes.filter((n) => n.type === 'group' && n.selected).map((n) => n.id)
    );
    return nodes.map((node) => {
      if (!node.parentId) return node;
      const parentIsGroup = nodes.some((n) => n.id === node.parentId && n.type === 'group');
      if (!parentIsGroup) return node;
      const draggable = selectedGroups.has(node.parentId);
      return node.draggable === draggable ? node : { ...node, draggable };
    });
  }, [nodes]);

  const { magneticMode, snapTarget, toggleMagneticMode, onNodeDrag, onNodeDragStop } = useMagneticConnect();

  // Node context menu (right-click on node)
  const [contextMenu, setContextMenu] = useState<{ node: LynkNode; x: number; y: number } | null>(null);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({ node: node as LynkNode, x: event.clientX, y: event.clientY });
  }, []);

  // Canvas context menu (double-click = create, right-click = actions)
  const [canvasMenu, setCanvasMenu] = useState<CanvasMenuState | null>(null);

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.react-flow__node')) return;

      const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setCanvasMenu({
        mode: 'create',
        x: event.clientX,
        y: event.clientY,
        flowPosition,
      });
    },
    [screenToFlowPosition]
  );

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setCanvasMenu({
        mode: 'actions',
        x: event.clientX,
        y: event.clientY,
        flowPosition,
      });
    },
    [screenToFlowPosition]
  );

  // Double-click on edge: navigate to the closer node (source or target)
  const handleEdgeDoubleClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      const sourceNode = getNodes().find((n) => n.id === edge.source);
      const targetNode = getNodes().find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) return;

      const clickPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      // Calculate center of each node
      const sourceCenter = {
        x: sourceNode.position.x + (sourceNode.measured?.width ?? 200) / 2,
        y: sourceNode.position.y + (sourceNode.measured?.height ?? 100) / 2,
      };
      const targetCenter = {
        x: targetNode.position.x + (targetNode.measured?.width ?? 200) / 2,
        y: targetNode.position.y + (targetNode.measured?.height ?? 100) / 2,
      };

      const distToSource = Math.hypot(clickPos.x - sourceCenter.x, clickPos.y - sourceCenter.y);
      const distToTarget = Math.hypot(clickPos.x - targetCenter.x, clickPos.y - targetCenter.y);

      const closerNodeId = distToSource <= distToTarget ? edge.source : edge.target;
      fitView({ nodes: [{ id: closerNodeId }], duration: 300, padding: 0.5 });
    },
    [screenToFlowPosition, fitView, getNodes]
  );

  // Right-click on a selected edge: flash red then delete
  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (!edge.selected) return;
      event.preventDefault();

      // Flash edge red before deleting
      const edgeEl = document.querySelector(`[data-testid="rf__edge-${edge.id}"]`)
        ?? document.querySelector(`.react-flow__edge[data-id="${edge.id}"]`);
      if (edgeEl) {
        const path = edgeEl.querySelector('path');
        if (path) {
          path.style.stroke = '#ef4444';
          path.style.strokeWidth = '3';
          path.style.filter = 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))';
        }
      }

      setTimeout(() => removeEdge(edge.id), 150);
    },
    [removeEdge]
  );

  // Wrap onEdgesChange to clean up viewport regions when edges are deleted
  const onEdgesChange = useCallback(
    (changes: import('@xyflow/react').EdgeChange[]) => {
      for (const change of changes) {
        if (change.type === 'remove') {
          const edge = edges.find((e) => e.id === change.id);
          if (!edge) continue;

          const sourceNode = nodes.find((n) => n.id === edge.source);
          if (sourceNode && DisplayNode.is(sourceNode as LynkNode)) {
            const displayData = sourceNode.data as DisplayNodeData;
            const sourceHandle = edge.sourceHandle;
            if (sourceHandle && displayData.viewports?.some((v: ViewportRegion) => v.id === sourceHandle)) {
              updateNodeData(sourceNode.id, {
                viewports: displayData.viewports.filter((v: ViewportRegion) => v.id !== sourceHandle),
              });
            }
          }
        }
      }
      storeOnEdgesChange(changes);
    },
    [edges, nodes, storeOnEdgesChange, updateNodeData]
  );

  const isValidConnection = useCallback(
    (connection: Edge | Connection): boolean => {
      return validateConnection(connection, { nodes: nodes as LynkNode[], edges }).valid;
    },
    [edges, nodes]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const result = validateConnection(connection, { nodes: nodes as LynkNode[], edges });
      if (!result.valid) {
        if (result.reason) showToast(result.reason, 'warning');
        return;
      }

      const edge = {
        id: `edge-${connection.source}-${connection.sourceHandle || 'default'}-${connection.target}-${connection.targetHandle || 'default'}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      };
      storeAddEdge(edge);
    },
    [edges, nodes, storeAddEdge, showToast]
  );

  const { handleCanvasDragOver, handleCanvasDrop, handleCanvasPaste } = useCanvasDrop();

  // Drag overlay state
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    dragCounterRef.current = 0;
    setIsDragOver(false);
    handleCanvasDrop(e);
  }, [handleCanvasDrop]);

  // Clipboard paste listener
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      // Don't intercept paste in input/textarea elements
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      handleCanvasPaste(e);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [handleCanvasPaste]);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusNameInput, setFocusNameInput] = useState(false);

  // Session projects - in-memory only
  const [projects, setProjects] = useState<SessionProject[]>(() => [{
    id: canvasId,
    name: canvasName,
    lastModified: Date.now(),
    nodeCount: nodes.length,
  }]);
  const snapshotsRef = useRef<Map<string, ProjectSnapshot>>(new Map());

  // Keep current project metadata in sync
  const activeProject = projects.find((p) => p.id === canvasId);
  if (activeProject && (activeProject.name !== canvasName || activeProject.nodeCount !== nodes.length)) {
    // Update without re-render loop - direct mutation + lazy sync
    activeProject.name = canvasName;
    activeProject.nodeCount = nodes.length;
    activeProject.lastModified = Date.now();
  }

  const handleSwitchProject = useCallback((targetId: string) => {
    const state = useCanvasStore.getState();

    // Save current state as snapshot
    snapshotsRef.current.set(state.canvasId, {
      nodes: state.nodes,
      edges: state.edges,
      viewport: state.viewport,
      canvasName: state.canvasName,
      canvasId: state.canvasId,
      lastSaved: state.lastSaved,
    });

    // Load target snapshot - direct state set, no validation needed for in-memory data
    const snapshot = snapshotsRef.current.get(targetId);
    if (snapshot) {
      useCanvasStore.setState({
        nodes: snapshot.nodes,
        edges: snapshot.edges,
        viewport: snapshot.viewport,
        canvasName: snapshot.canvasName,
        canvasId: snapshot.canvasId,
        lastSaved: snapshot.lastSaved,
        highlightedHandle: null,
      });
    }
  }, []);

  const handleDeleteProject = useCallback((targetId: string) => {
    const state = useCanvasStore.getState();

    if (targetId === state.canvasId) {
      // Switching away from active - find another project
      setProjects((prev) => {
        const remaining = prev.filter((p) => p.id !== targetId);
        if (remaining.length > 0) {
          // Switch to first remaining
          setTimeout(() => handleSwitchProject(remaining[0].id), 0);
        }
        return remaining;
      });
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== targetId));
    }

    snapshotsRef.current.delete(targetId);
  }, [handleSwitchProject]);

  const handleCloneProject = useCallback((targetId: string) => {
    const state = useCanvasStore.getState();
    const newId = `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Get source data
    let sourceSnapshot: ProjectSnapshot;
    if (targetId === state.canvasId) {
      sourceSnapshot = {
        nodes: state.nodes,
        edges: state.edges,
        viewport: state.viewport,
        canvasName: state.canvasName,
        canvasId: newId,
        lastSaved: null,
      };
    } else {
      const snap = snapshotsRef.current.get(targetId);
      if (!snap) return;
      sourceSnapshot = { ...snap, canvasId: newId, lastSaved: null };
    }

    const sourceName = targetId === state.canvasId ? state.canvasName : projects.find((p) => p.id === targetId)?.name || 'Untitled';

    // Store snapshot
    snapshotsRef.current.set(newId, sourceSnapshot);

    // Add to project list
    setProjects((prev) => [...prev, {
      id: newId,
      name: `${sourceName} (copy)`,
      lastModified: Date.now(),
      nodeCount: sourceSnapshot.nodes.length,
    }]);
  }, [projects]);

  const handleCreateProject = useCallback(() => {
    const state = useCanvasStore.getState();
    const newId = `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Save current state
    snapshotsRef.current.set(state.canvasId, {
      nodes: state.nodes,
      edges: state.edges,
      viewport: state.viewport,
      canvasName: state.canvasName,
      canvasId: state.canvasId,
      lastSaved: state.lastSaved,
    });

    // Set empty canvas
    useCanvasStore.setState({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      canvasName: 'Untitled Canvas',
      canvasId: newId,
      lastSaved: null,
      highlightedHandle: null,
    });

    setProjects((prev) => [...prev, {
      id: newId,
      name: 'Untitled Canvas',
      lastModified: Date.now(),
      nodeCount: 0,
    }]);

    // Focus the name input so user can immediately rename
    setFocusNameInput(true);
  }, []);

  // Load a file into a new project (preserves the current one)
  const handleLoad = useCallback(async () => {
    const state = useCanvasStore.getState();

    // Snapshot current project before loading
    snapshotsRef.current.set(state.canvasId, {
      nodes: state.nodes,
      edges: state.edges,
      viewport: state.viewport,
      canvasName: state.canvasName,
      canvasId: state.canvasId,
      lastSaved: state.lastSaved,
    });

    const result = await loadFromFile();
    if (!result.success) {
      // Restore snapshot on failure
      const snapshot = snapshotsRef.current.get(state.canvasId);
      if (snapshot) {
        useCanvasStore.setState(snapshot);
      }
      if (result.error) {
        const errorMsg = result.error.startsWith('Invalid canvas file:')
          ? 'Invalid canvas file. The file may be corrupted or in an incompatible format.'
          : result.error;
        showToast(errorMsg, 'error');
      }
      return;
    }

    showToast('Canvas loaded successfully', 'success');
  }, [loadFromFile, showToast]);

  // Register new projects when loading files
  // Track canvasId changes to register new projects
  const lastKnownIdRef = useRef(canvasId);
  if (canvasId !== lastKnownIdRef.current) {
    const prevId = lastKnownIdRef.current;
    lastKnownIdRef.current = canvasId;

    if (!projects.some((p) => p.id === canvasId)) {
      // If the previous project had no nodes (e.g. initial empty canvas before session restore),
      // replace it instead of adding a new entry
      const prevProject = projects.find((p) => p.id === prevId);
      if (prevProject && prevProject.nodeCount === 0 && !snapshotsRef.current.has(prevId)) {
        setProjects((prev) => prev.map((p) =>
          p.id === prevId
            ? { id: canvasId, name: canvasName, lastModified: Date.now(), nodeCount: nodes.length }
            : p
        ));
      } else {
        setProjects((prev) => [...prev, {
          id: canvasId,
          name: canvasName,
          lastModified: Date.now(),
          nodeCount: nodes.length,
        }]);
      }
    }
  }

  return (
    <div className="w-full h-full flex">
      <ProjectSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        projects={projects}
        activeProjectId={canvasId}
        onSwitchProject={handleSwitchProject}
        onDeleteProject={handleDeleteProject}
        onCloneProject={handleCloneProject}
        onCreateProject={handleCreateProject}
        onLoad={handleLoad}
      />
      <div
        className="flex-1 h-full relative"
        onDragOver={handleCanvasDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDoubleClick={handleDoubleClick}
      >
        {/* Top center: File controls + Undo/Redo */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          <FileControls
            focusName={focusNameInput}
            onFocusNameHandled={() => setFocusNameInput(false)}
          />
          <UndoRedoControls />
        </div>

        {/* Left: Projects panel toggle */}
        <PanelToggle
          side="left"
          isOpen={sidebarOpen}
          onClick={() => setSidebarOpen((v) => !v)}
          label="Projects"
        />

        {/* Right: Files panel toggle */}
        <PanelToggle
          side="right"
          isOpen={fileRegistryOpen}
          onClick={toggleFileRegistry}
          label="Files"
        />

        {/* Bottom center: Node creation */}
        <NodeCreationBar />

        {nodes.length === 0 && <EmptyState />}
        {nodes.length > 0 && <SuggestionBar />}
        {magneticMode && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none
                          bg-copper-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg
                          flex items-center gap-2 select-none">
            Magnetic connect {snapTarget ? '- snap ready' : '- drag near a handle'} · press M to disable
          </div>
        )}
        <ReactFlow
          nodes={processedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          zoomOnDoubleClick={false}
          onViewportChange={setViewport}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onNodeContextMenu={handleNodeContextMenu}
          onPaneContextMenu={handlePaneContextMenu}
          onEdgeDoubleClick={handleEdgeDoubleClick}
          onEdgeContextMenu={handleEdgeContextMenu}
          nodeTypes={nodeTypes}
          isValidConnection={isValidConnection}
          connectionLineComponent={ConnectionLine}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          edgesReconnectable
          edgesFocusable
          panOnScroll={true}
          zoomOnScroll={false}
          zoomOnPinch={true}
          zoomActivationKeyCode={['Control', 'Meta']}
          preventScrolling={true}
          minZoom={0.1}
          maxZoom={4}
        >
          <Background gap={16} size={1} />
          <Controls />
          <LayoutControls />
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
          />
        </ReactFlow>
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-copper-500/10 border-2 border-dashed border-copper-400 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 rounded-lg px-6 py-4 shadow-lg text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2 text-copper-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-sm font-medium text-copper-600">Drop files or folders here</p>
              <p className="text-xs text-bridge-500 mt-1">PDF and image files will be processed</p>
            </div>
          </div>
        )}
        {contextMenu && (
          <NodeContextMenu
            node={contextMenu.node}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            onClose={() => setContextMenu(null)}
            magneticMode={magneticMode}
            onToggleMagneticMode={toggleMagneticMode}
          />
        )}
        {canvasMenu && (
          <CanvasContextMenu
            mode={canvasMenu.mode}
            position={{ x: canvasMenu.x, y: canvasMenu.y }}
            flowPosition={canvasMenu.flowPosition}
            onClose={() => setCanvasMenu(null)}
            onLoad={handleLoad}
          />
        )}
      </div>
      <FileRegistryPanel />
    </div>
  );
}
