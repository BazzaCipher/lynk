import { useEffect } from 'react';
import type { NodeOutput } from '../types';
import type { UseNodeOutputsResult } from './useNodeOutputs';

/**
 * Syncs computed outputs to node data via useNodeOutputs.
 *
 * Replaces the repeated pattern across node components:
 * ```ts
 * useEffect(() => {
 *   if (outputs) nodeOutputs.update(outputs);
 *   else nodeOutputs.clearAll();
 * }, [outputs, nodeOutputs]);
 * ```
 *
 * @param outputs - Computed output map, or undefined to clear
 * @param nodeOutputs - The useNodeOutputs() result for this node
 * @param additionalData - Extra data to pass alongside outputs (e.g. { result }, { entryResults })
 */
export function useSyncNodeOutputs(
  outputs: Record<string, NodeOutput> | undefined,
  nodeOutputs: UseNodeOutputsResult,
  additionalData?: Record<string, unknown>
): void {
  useEffect(() => {
    if (outputs && Object.keys(outputs).length > 0) {
      nodeOutputs.update(outputs, additionalData);
    } else {
      nodeOutputs.clearAll(additionalData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- additionalData is derived from same source as outputs
  }, [outputs, nodeOutputs]);
}
