import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '../../store/canvasStore';
import { FileNode } from '../nodes/FileNode';
import { CalculationNode } from '../nodes/CalculationNode';
import { SheetNode } from '../nodes/SheetNode';
import { LabelNode } from '../nodes/LabelNode';
import { Toolbar } from './Toolbar';
import { useToast } from '../ui/Toast';
import { wouldCreateCycle } from '../../core/engine/dependencyGraph';

const nodeTypes = {
  file: FileNode,
  calculation: CalculationNode,
  sheet: SheetNode,
  label: LabelNode,
};

export function LynkCanvas() {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const onNodesChange = useCanvasStore((state) => state.onNodesChange);
  const onEdgesChange = useCanvasStore((state) => state.onEdgesChange);
  const storeAddEdge = useCanvasStore((state) => state.addEdge);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const { showToast } = useToast();

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

      // FileNode can only be a source
      if (targetNode.type === 'file') {
        return false;
      }

      // Only file and calculation nodes can be sources
      if (sourceNode.type !== 'file' && sourceNode.type !== 'calculation') {
        return false;
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

      // FileNode can only be a source, not a target
      if (targetNode.type === 'file') {
        showToast('File nodes cannot receive data', 'warning');
        return;
      }

      // Only file and calculation nodes can be sources
      if (sourceNode.type !== 'file' && sourceNode.type !== 'calculation') {
        showToast('Only File and Calculation nodes can be data sources', 'warning');
        return;
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

  return (
    <div className="w-full h-full relative">
      <Toolbar />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onViewportChange={setViewport}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
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
