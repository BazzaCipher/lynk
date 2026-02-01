/**
 * useNodeOutputs Hook
 *
 * Provides a method-based API for managing node outputs.
 * Handles deep comparison to prevent unnecessary updates.
 *
 * Usage:
 * ```tsx
 * const outputs = useNodeOutputs(id);
 *
 * // Set a single output
 * outputs.set('output', { value: 123, dataType: 'number', label: 'Result' });
 *
 * // Set multiple outputs
 * outputs.update({
 *   'output-1': { value: 1, dataType: 'number', label: 'A' },
 *   'output-2': { value: 2, dataType: 'number', label: 'B' },
 * });
 *
 * // Clear an output
 * outputs.clear('output');
 * ```
 */

import { useCallback, useMemo, useRef } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { NodeOutput } from '../types';

export interface UseNodeOutputsResult {
  /** Set a single output handle. Pass additional data to update alongside outputs. */
  set: (handleId: string, output: NodeOutput, additionalData?: Record<string, unknown>) => void;
  /** Set multiple output handles at once. Pass additional data to update alongside outputs. */
  update: (outputs: Record<string, NodeOutput>, additionalData?: Record<string, unknown>) => void;
  /** Clear a single output handle */
  clear: (handleId: string) => void;
  /** Clear all outputs */
  clearAll: (additionalData?: Record<string, unknown>) => void;
}

/**
 * Hook for managing node outputs with automatic change detection.
 *
 * @param nodeId - The node's unique identifier
 * @returns Methods to set, update, and clear outputs
 */
export function useNodeOutputs(nodeId: string): UseNodeOutputsResult {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);

  // Track last serialized outputs to avoid unnecessary updates
  const lastOutputsRef = useRef<string | null>(null);

  const set = useCallback(
    (handleId: string, output: NodeOutput, additionalData?: Record<string, unknown>) => {
      // Get current outputs from store
      const state = useCanvasStore.getState();
      const node = state.nodes.find((n) => n.id === nodeId);
      const currentOutputs = (node?.data as { outputs?: Record<string, NodeOutput> })?.outputs || {};

      const newOutputs = { ...currentOutputs, [handleId]: output };
      const serialized = JSON.stringify(newOutputs);

      // Only update if outputs changed
      if (lastOutputsRef.current !== serialized) {
        lastOutputsRef.current = serialized;
        updateNodeData(nodeId, { outputs: newOutputs, ...additionalData });
      }
    },
    [nodeId, updateNodeData]
  );

  const update = useCallback(
    (outputs: Record<string, NodeOutput>, additionalData?: Record<string, unknown>) => {
      const serialized = JSON.stringify(outputs);

      // Only update if outputs changed
      if (lastOutputsRef.current !== serialized) {
        lastOutputsRef.current = serialized;
        updateNodeData(nodeId, { outputs, ...additionalData });
      }
    },
    [nodeId, updateNodeData]
  );

  const clear = useCallback(
    (handleId: string) => {
      const state = useCanvasStore.getState();
      const node = state.nodes.find((n) => n.id === nodeId);
      const currentOutputs = (node?.data as { outputs?: Record<string, NodeOutput> })?.outputs;

      if (currentOutputs && handleId in currentOutputs) {
        const { [handleId]: _, ...newOutputs } = currentOutputs;
        const outputs = Object.keys(newOutputs).length > 0 ? newOutputs : undefined;
        lastOutputsRef.current = JSON.stringify(outputs);
        updateNodeData(nodeId, { outputs });
      }
    },
    [nodeId, updateNodeData]
  );

  const clearAll = useCallback(
    (additionalData?: Record<string, unknown>) => {
      lastOutputsRef.current = null;
      updateNodeData(nodeId, { outputs: undefined, ...additionalData });
    },
    [nodeId, updateNodeData]
  );

  return useMemo(() => ({ set, update, clear, clearAll }), [set, update, clear, clearAll]);
}
