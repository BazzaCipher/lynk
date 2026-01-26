import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type Connection,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '../../store/canvasStore';
import { DisplayNode } from '../nodes/DisplayNode';
import { ExtractorNode } from '../nodes/ExtractorNode';
import { CalculationNode } from '../nodes/CalculationNode';
import { SheetNode } from '../nodes/SheetNode';
import { LabelNode } from '../nodes/LabelNode';
import { GroupNode } from '../nodes/GroupNode';
import { withErrorBoundary } from '../nodes/base/withErrorBoundary';
import { Toolbar } from './Toolbar';
import { useToast } from '../ui/Toast';
import { wouldCreateCycle } from '../../core/engine/dependencyGraph';
import { getOperation, isTypeCompatible } from '../../core/operations/operationRegistry';
import type { ExtractorNodeData, CalculationNodeData } from '../../types';

// Wrap node components with error boundaries to prevent crashes
const nodeTypes = {
  display: withErrorBoundary(DisplayNode, 'display'),
  extractor: withErrorBoundary(ExtractorNode, 'extractor'),
  calculation: withErrorBoundary(CalculationNode, 'calculation'),
  sheet: withErrorBoundary(SheetNode, 'sheet'),
  label: withErrorBoundary(LabelNode, 'label'),
  group: withErrorBoundary(GroupNode, 'group'),
};

export function LynkCanvas() {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const onNodesChange = useCanvasStore((state) => state.onNodesChange);
  const onEdgesChange = useCanvasStore((state) => state.onEdgesChange);
  const storeAddEdge = useCanvasStore((state) => state.addEdge);
  const addNode = useCanvasStore((state) => state.addNode);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const createGroup = useCanvasStore((state) => state.createGroup);
  const ungroupNodes = useCanvasStore((state) => state.ungroupNodes);
  const getSelectedNodes = useCanvasStore((state) => state.getSelectedNodes);
  const getSelectedEdges = useCanvasStore((state) => state.getSelectedEdges);
  const removeSelectedNodes = useCanvasStore((state) => state.removeSelectedNodes);
  const removeSelectedEdges = useCanvasStore((state) => state.removeSelectedEdges);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const saveToFile = useCanvasStore((state) => state.saveToFile);
  const pushHistory = useCanvasStore((state) => state.pushHistory);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const { showToast } = useToast();
  const { screenToFlowPosition } = useReactFlow();

  const isValidConnection = useCallback(
    (connection: Edge | Connection): boolean => {
      if (!connection.source || !connection.target) return false;

      // Prevent self-connections
      if (connection.source === connection.target) {
        return false;
      }

      // Check for cycles
      if (wouldCreateCycle(edges, connection.source, connection.target)) {
        return false;
      }

      // Get source and target nodes
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return false;

      // DisplayNode cannot be source or target (no handles)
      if (sourceNode.type === 'display' || targetNode.type === 'display') {
        return false;
      }

      // ExtractorNode can only be a source
      if (targetNode.type === 'extractor') {
        return false;
      }

      // Only extractor, calculation, and label nodes can be sources
      if (sourceNode.type !== 'extractor' && sourceNode.type !== 'calculation' && sourceNode.type !== 'label') {
        return false;
      }

      // Type compatibility check for CalculationNode targets
      if (targetNode.type === 'calculation') {
        const calcData = targetNode.data as CalculationNodeData;
        const operation = getOperation(calcData.operation);

        if (operation) {
          // Check if source data type is compatible with the operation
          if (sourceNode.type === 'extractor') {
            const extractorData = sourceNode.data as ExtractorNodeData;
            const regionId = connection.sourceHandle;
            const region = extractorData.regions.find((r) => r.id === regionId);

            if (region && !isTypeCompatible(calcData.operation, region.dataType)) {
              return false; // Incompatible type
            }
          }

          // Check single-input operation limits
          if (operation.maxInputs === 1) {
            const existingInputs = edges.filter(
              (e) => e.target === targetNode.id && e.targetHandle === 'inputs'
            );
            if (existingInputs.length >= 1) {
              return false; // Already has an input
            }
          }
        }
      }

      return true;
    },
    [edges, nodes]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // Prevent self-connections
      if (connection.source === connection.target) {
        showToast('Cannot connect a node to itself', 'warning');
        return;
      }

      // Check for cycles
      if (wouldCreateCycle(edges, connection.source, connection.target)) {
        showToast('Cannot create circular dependency', 'error');
        return;
      }

      // Get source and target nodes for validation
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return;

      // DisplayNode cannot be source or target (no handles)
      if (sourceNode.type === 'display') {
        showToast('Display nodes cannot be data sources', 'warning');
        return;
      }
      if (targetNode.type === 'display') {
        showToast('Display nodes cannot receive data', 'warning');
        return;
      }

      // ExtractorNode can only be a source, not a target
      if (targetNode.type === 'extractor') {
        showToast('Extractor nodes cannot receive data', 'warning');
        return;
      }

      // Only extractor, calculation, and label nodes can be sources
      if (sourceNode.type !== 'extractor' && sourceNode.type !== 'calculation' && sourceNode.type !== 'label') {
        showToast('Only Extractor, Calculation, and Label nodes can be data sources', 'warning');
        return;
      }

      // Type compatibility check for CalculationNode targets
      if (targetNode.type === 'calculation') {
        const calcData = targetNode.data as CalculationNodeData;
        const operation = getOperation(calcData.operation);

        if (operation) {
          // Check if source data type is compatible with the operation
          if (sourceNode.type === 'extractor') {
            const extractorData = sourceNode.data as ExtractorNodeData;
            const regionId = connection.sourceHandle;
            const region = extractorData.regions.find((r) => r.id === regionId);

            if (region && !isTypeCompatible(calcData.operation, region.dataType)) {
              showToast(
                `${region.dataType} is not compatible with ${operation.label}. ` +
                `Supported types: ${operation.compatibleTypes.join(', ')}`,
                'warning'
              );
              return;
            }
          }

          // Check single-input operation limits
          if (operation.maxInputs === 1) {
            const existingInputs = edges.filter(
              (e) => e.target === targetNode.id && e.targetHandle === 'inputs'
            );
            if (existingInputs.length >= 1) {
              showToast(`${operation.label} only accepts one input`, 'warning');
              return;
            }
          }
        }
      }

      // Include handles in edge ID for uniqueness when multiple edges connect same nodes
      const edge = {
        id: `edge-${connection.source}-${connection.sourceHandle || 'default'}-${connection.target}-${connection.targetHandle || 'default'}`,
        source: connection.source,
        target: connection.target,
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMod = event.ctrlKey || event.metaKey;

      // Escape - clear selection
      if (event.key === 'Escape') {
        event.preventDefault();
        clearSelection();
      }

      // Delete/Backspace - delete selected nodes and edges
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodes = getSelectedNodes();
        const selectedEdges = getSelectedEdges();

        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          event.preventDefault();
          pushHistory();

          if (selectedEdges.length > 0) {
            removeSelectedEdges();
          }
          if (selectedNodes.length > 0) {
            removeSelectedNodes();
          }

          const parts = [];
          if (selectedNodes.length > 0) {
            parts.push(`${selectedNodes.length} node(s)`);
          }
          if (selectedEdges.length > 0) {
            parts.push(`${selectedEdges.length} edge(s)`);
          }
          showToast(`Deleted ${parts.join(' and ')}`, 'info');
        }
      }

      // Ctrl/Cmd+S - save to file
      if (isMod && event.key === 's') {
        event.preventDefault();
        saveToFile().then((result) => {
          if (result.success) {
            showToast('Canvas saved', 'success');
          } else if (result.warnings && result.warnings.length > 0) {
            showToast(`Save failed: ${result.warnings[0]}`, 'error');
          }
        });
      }

      // Ctrl/Cmd+Z - undo
      if (isMod && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }

      // Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z - redo
      if (isMod && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        redo();
      }

      // Ctrl/Cmd+G - group selected nodes
      if (isMod && event.key === 'g' && !event.shiftKey) {
        event.preventDefault();
        const selected = getSelectedNodes();
        if (selected.length >= 2) {
          pushHistory();
          const groupId = createGroup(selected.map((n) => n.id));
          if (groupId) {
            showToast('Nodes grouped', 'info');
          }
        } else {
          showToast('Select at least 2 nodes to group', 'warning');
        }
      }

      // Ctrl/Cmd+Shift+G - ungroup selected group
      if (isMod && event.key === 'G' && event.shiftKey) {
        event.preventDefault();
        const selected = getSelectedNodes();
        const groupNode = selected.find((n) => n.type === 'group');
        if (groupNode) {
          pushHistory();
          ungroupNodes(groupNode.id);
          showToast('Group dissolved', 'info');
        } else {
          showToast('Select a group to ungroup', 'warning');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [getSelectedNodes, getSelectedEdges, removeSelectedNodes, removeSelectedEdges, clearSelection, saveToFile, createGroup, ungroupNodes, pushHistory, undo, redo, showToast]);

  return (
    <div className="w-full h-full relative">
      <Toolbar />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDoubleClick={handleDoubleClick}
        onViewportChange={setViewport}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
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
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}
