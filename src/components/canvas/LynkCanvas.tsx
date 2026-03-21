import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '../../store/canvasStore';
import { DisplayNode as DisplayNodeComponent } from '../nodes/DisplayNode';
import { ViewportNode as ViewportNodeComponent } from '../nodes/ViewportNode';
import { ExtractorNode as ExtractorNodeComponent } from '../nodes/ExtractorNode';
import { CalculationNode as CalculationNodeComponent } from '../nodes/CalculationNode';
import { SheetNode as SheetNodeComponent } from '../nodes/SheetNode';
import { LabelNode as LabelNodeComponent } from '../nodes/LabelNode';
import { GroupNode as GroupNodeComponent } from '../nodes/GroupNode';
import { withErrorBoundary } from '../nodes/base/withErrorBoundary';
import { Toolbar } from './Toolbar';
import { ConnectionLine } from './ConnectionLine';
import { LayoutControls } from './LayoutControls';
import { FileRegistryPanel } from './FileRegistryPanel';
import { NodeContextMenu } from './NodeContextMenu';
import { EmptyState } from './EmptyState';
import { SuggestionBar } from './SuggestionBar';
import { useToast } from '../ui/Toast';
import { validateConnection } from '../../core/engine/connectionValidation';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useMagneticConnect } from '../../hooks/useMagneticConnect';
import { useCanvasDrop } from '../../hooks/useCanvasDrop';
import type { LynkNode, DisplayNodeData, ViewportRegion } from '../../types';
import { DisplayNode } from '../../types';

// Wrap node components with error boundaries to prevent crashes
const nodeTypes = {
  display: withErrorBoundary(DisplayNodeComponent, 'display'),
  viewport: withErrorBoundary(ViewportNodeComponent, 'viewport'),
  extractor: withErrorBoundary(ExtractorNodeComponent, 'extractor'),
  calculation: withErrorBoundary(CalculationNodeComponent, 'calculation'),
  sheet: withErrorBoundary(SheetNodeComponent, 'sheet'),
  label: withErrorBoundary(LabelNodeComponent, 'label'),
  group: withErrorBoundary(GroupNodeComponent, 'group'),
};

export function LynkCanvas() {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const onNodesChange = useCanvasStore((state) => state.onNodesChange);
  const storeOnEdgesChange = useCanvasStore((state) => state.onEdgesChange);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const storeAddEdge = useCanvasStore((state) => state.addEdge);
  const addNode = useCanvasStore((state) => state.addNode);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const { showToast } = useToast();
  const { screenToFlowPosition } = useReactFlow();

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

  const [contextMenu, setContextMenu] = useState<{ node: LynkNode; x: number; y: number } | null>(null);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({ node: node as LynkNode, x: event.clientX, y: event.clientY });
  }, []);

  // Wrap onEdgesChange to clean up viewport regions when edges are deleted
  const onEdgesChange = useCallback(
    (changes: import('@xyflow/react').EdgeChange[]) => {
      // Check for removed edges that connect DisplayNode → ViewportNode
      for (const change of changes) {
        if (change.type === 'remove') {
          const edge = edges.find((e) => e.id === change.id);
          if (!edge) continue;

          const sourceNode = nodes.find((n) => n.id === edge.source);
          if (sourceNode && DisplayNode.is(sourceNode as LynkNode)) {
            const displayData = sourceNode.data as DisplayNodeData;
            const sourceHandle = edge.sourceHandle;
            if (sourceHandle && displayData.viewports?.some((v: ViewportRegion) => v.id === sourceHandle)) {
              // Remove the viewport region from the parent DisplayNode
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

  // Double-click on canvas pane creates a new LabelNode
  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // Check if double-click was on a node (not on pane)
      const target = event.target as HTMLElement;
      if (target.closest('.react-flow__node')) {
        return; // Clicked on a node, don't create new label
      }

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode('label', position, {
        label: 'Label',
        format: 'string',
        fontSize: 'medium',
        alignment: 'left',
        isManualMode: true,
        manualValue: '',
      });
    },
    [screenToFlowPosition, addNode]
  );

  const { handleCanvasDragOver, handleCanvasDrop } = useCanvasDrop();

  return (
    <div
      className="w-full h-full relative"
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
    >
      <Toolbar />
      {nodes.length === 0 && <EmptyState />}
      {nodes.length > 0 && <SuggestionBar />}
      {magneticMode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none
                        bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg
                        flex items-center gap-2 select-none">
          ⊕ Magnetic connect {snapTarget ? '— snap ready' : '— drag near a handle'} · press M to disable
        </div>
      )}
      <ReactFlow
        nodes={processedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDoubleClick={handleDoubleClick}
        onViewportChange={setViewport}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={handleNodeContextMenu}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        connectionLineComponent={ConnectionLine}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        // Enable edge selection for deletion
        edgesReconnectable
        edgesFocusable
        // Viewport controls - prevent page scroll, enable canvas zoom/pan
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
      <FileRegistryPanel />
      {contextMenu && (
        <NodeContextMenu
          node={contextMenu.node}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          magneticMode={magneticMode}
          onToggleMagneticMode={toggleMagneticMode}
        />
      )}
    </div>
  );
}
