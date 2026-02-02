import { useCallback } from 'react';
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
import { DisplayNode as DisplayNodeComponent } from '../nodes/DisplayNode';
import { ExtractorNode as ExtractorNodeComponent } from '../nodes/ExtractorNode';
import { CalculationNode as CalculationNodeComponent } from '../nodes/CalculationNode';
import { SheetNode as SheetNodeComponent } from '../nodes/SheetNode';
import { LabelNode as LabelNodeComponent } from '../nodes/LabelNode';
import { GroupNode as GroupNodeComponent } from '../nodes/GroupNode';
import { withErrorBoundary } from '../nodes/base/withErrorBoundary';
import { Toolbar } from './Toolbar';
import { ConnectionLine } from './ConnectionLine';
import { LayoutControls } from './LayoutControls';
import { useToast } from '../ui/Toast';
import { wouldCreateCycle } from '../../core/engine/dependencyGraph';
import { getOperation, isTypeCompatible } from '../../core/operations/operationRegistry';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import type { LynkNode } from '../../types';
import { CanExport, CanImport, CalculationNode, ExtractorNode } from '../../types';

// Wrap node components with error boundaries to prevent crashes
const nodeTypes = {
  display: withErrorBoundary(DisplayNodeComponent, 'display'),
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
  const onEdgesChange = useCanvasStore((state) => state.onEdgesChange);
  const storeAddEdge = useCanvasStore((state) => state.addEdge);
  const addNode = useCanvasStore((state) => state.addNode);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const pushHistory = useCanvasStore((state) => state.pushHistory);
  const { showToast } = useToast();
  const { screenToFlowPosition } = useReactFlow();

  // Keyboard shortcuts (Delete, Ctrl+S, Ctrl+Z, Ctrl+G, etc.)
  useKeyboardShortcuts();

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

      // Check if source node can export (has output handles)
      if (!CanExport.is(sourceNode as LynkNode)) {
        return false;
      }

      // Check if target node can import (has input handles)
      if (!CanImport.is(targetNode as LynkNode)) {
        return false;
      }

      // Type compatibility check for CalculationNode targets
      const targetLynkNode = targetNode as LynkNode;
      const sourceLynkNode = sourceNode as LynkNode;
      if (CalculationNode.is(targetLynkNode)) {
        const operation = getOperation(targetLynkNode.data.operation);

        if (operation) {
          // Check if source data type is compatible with the operation
          if (ExtractorNode.is(sourceLynkNode)) {
            const regionId = connection.sourceHandle;
            const region = sourceLynkNode.data.regions.find((r) => r.id === regionId);

            if (region && !isTypeCompatible(targetLynkNode.data.operation, region.dataType)) {
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

      // Check if source node can export (has output handles)
      if (!CanExport.is(sourceNode as LynkNode)) {
        showToast('This node type cannot be a data source', 'warning');
        return;
      }

      // Check if target node can import (has input handles)
      if (!CanImport.is(targetNode as LynkNode)) {
        showToast('This node type cannot receive data', 'warning');
        return;
      }

      // Type compatibility check for CalculationNode targets
      const targetLynkNode = targetNode as LynkNode;
      const sourceLynkNode = sourceNode as LynkNode;
      if (CalculationNode.is(targetLynkNode)) {
        const operation = getOperation(targetLynkNode.data.operation);

        if (operation) {
          // Check if source data type is compatible with the operation
          if (ExtractorNode.is(sourceLynkNode)) {
            const regionId = connection.sourceHandle;
            const region = sourceLynkNode.data.regions.find((r) => r.id === regionId);

            if (region && !isTypeCompatible(targetLynkNode.data.operation, region.dataType)) {
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

  // ─────────────────────────────────────────────────────────────────────────────
  // FILE DROP HANDLING
  // ─────────────────────────────────────────────────────────────────────────────

  // Use the file upload hook's processFile function
  const { processFile } = useFileUpload({
    onFileRegistered: () => {}, // Not used for canvas drops
  });

  const handleCanvasDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleCanvasDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const files = event.dataTransfer.files;
      if (!files || files.length === 0) return;

      // Process files using the hook's processFile
      const results = Array.from(files)
        .map((file) => processFile(file))
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (results.length === 0) {
        showToast('No valid files (PDF or images only)', 'warning');
        return;
      }

      // Get drop position
      const dropPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      // Create ExtractorNodes positioned vertically
      const VERTICAL_SPACING = 350;

      pushHistory();

      results.forEach((result, index) => {
        const position = {
          x: dropPosition.x,
          y: dropPosition.y + (index * VERTICAL_SPACING),
        };

        addNode('extractor', position, {
          label: result.fileName,
          fileId: result.fileId,
          fileUrl: result.fileUrl,
          fileName: result.fileName,
          fileType: result.fileType,
          currentPage: 1,
          totalPages: 1,
          regions: [],
        });
      });

      showToast(`Created ${results.length} extractor node(s)`, 'success');
    },
    [screenToFlowPosition, addNode, pushHistory, showToast, processFile]
  );

  return (
    <div
      className="w-full h-full relative"
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
    >
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
    </div>
  );
}
