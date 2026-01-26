import type { ComponentType } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { NodeErrorBoundary } from './NodeErrorBoundary';

/**
 * Higher-order component that wraps a node component with an error boundary.
 * Prevents a single node crash from breaking the entire canvas.
 */
export function withErrorBoundary<T extends Node>(
  WrappedComponent: ComponentType<NodeProps<T>>,
  nodeType: string
): ComponentType<NodeProps<T>> {
  const WrappedWithErrorBoundary = (props: NodeProps<T>) => {
    return (
      <NodeErrorBoundary nodeId={props.id} nodeType={nodeType}>
        <WrappedComponent {...props} />
      </NodeErrorBoundary>
    );
  };

  WrappedWithErrorBoundary.displayName = `WithErrorBoundary(${nodeType})`;
  return WrappedWithErrorBoundary;
}
