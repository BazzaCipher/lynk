import { useMemo } from 'react';
import { useEdges, useNodes } from '@xyflow/react';
import type {
  LynkNode,
  Exportable,
  DataSourceReference,
  SimpleDataType,
} from '../types';
import { parseNumericValue, getLocaleCurrency } from '../utils/formatting';

// Re-export for backward compatibility
export { parseNumericValue } from '../utils/formatting';

export interface ResolvedInput {
  value: number | string | boolean | Date;
  numericValue: number | null;
  label: string;
  source: DataSourceReference | null;
  edgeId: string;
  /** Data type of this input (always present for valid inputs) */
  dataType: SimpleDataType;
  /** Source node ID for direct access */
  sourceNodeId: string;
  /** Source region/handle ID for direct access */
  sourceRegionId: string;
}

interface UseDataFlowOptions {
  nodeId: string;
  targetHandle?: string;
  acceptedTypes?: SimpleDataType[];
}

interface UseDataFlowResult {
  inputs: ResolvedInput[];
  hasInputs: boolean;
  inputsBySource: Map<string, ResolvedInput[]>;
}

/**
 * Hook for resolving input values from connected edges.
 * Used by processing nodes (Calculation, Sheet, Label) to get their input data.
 */
export function useDataFlow({ nodeId, targetHandle, acceptedTypes }: UseDataFlowOptions): UseDataFlowResult {
  const edges = useEdges();
  const nodes = useNodes();

  const inputs = useMemo((): ResolvedInput[] => {
    // Find edges connected to this node's target handle(s)
    const connectedEdges = edges.filter((edge) => {
      if (edge.target !== nodeId) return false;
      if (targetHandle && edge.targetHandle !== targetHandle) return false;
      return true;
    });

    const resolvedInputs: ResolvedInput[] = [];

    for (const edge of connectedEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source) as LynkNode | undefined;
      if (!sourceNode) continue;

      const resolved = resolveNodeOutput(sourceNode, edge.sourceHandle);
      if (resolved) {
        // Filter by accepted types if specified
        if (acceptedTypes && !acceptedTypes.includes(resolved.dataType)) {
          continue;
        }
        resolvedInputs.push({
          ...resolved,
          edgeId: edge.id,
        });
      }
    }

    return resolvedInputs;
  }, [edges, nodes, nodeId, targetHandle, acceptedTypes]);

  // Group inputs by source node
  const inputsBySource = useMemo(() => {
    const map = new Map<string, ResolvedInput[]>();
    for (const input of inputs) {
      const sourceId = input.source?.nodeId ?? 'unknown';
      const existing = map.get(sourceId) ?? [];
      existing.push(input);
      map.set(sourceId, existing);
    }
    return map;
  }, [inputs]);

  return {
    inputs,
    hasInputs: inputs.length > 0,
    inputsBySource,
  };
}

/**
 * Resolve the output value from a source node based on the source handle.
 *
 * Generic implementation — reads from the node's Exportable.outputs map.
 * Each node component is responsible for populating its outputs.
 */
export function resolveNodeOutput(
  node: LynkNode,
  sourceHandle: string | null | undefined
): Omit<ResolvedInput, 'edgeId'> | null {
  if (!sourceHandle) return null;

  const data = node.data as Partial<Exportable>;
  const output = data.outputs?.[sourceHandle];
  if (!output) return null;

  const numericValue = typeof output.value === 'number'
    ? output.value
    : typeof output.value === 'string'
      ? parseNumericValue(output.value)
      : null;

  return {
    value: output.value,
    numericValue,
    label: output.label,
    source: output.source ?? null,
    dataType: output.dataType,
    sourceNodeId: node.id,
    sourceRegionId: sourceHandle,
  };
}

/**
 * Format a value based on the specified format.
 */
export function formatValue(
  value: number | string | boolean | Date | null | undefined,
  format: 'number' | 'currency' | 'date' | 'string' | 'boolean',
  options?: {
    precision?: number;
    currency?: string;
  }
): string {
  if (value === null || value === undefined) return '—';

  switch (format) {
    case 'number': {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num)) return String(value);
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: options?.precision ?? 2,
      });
    }
    case 'currency': {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num)) return String(value);
      return num.toLocaleString(undefined, {
        style: 'currency',
        currency: options?.currency ?? getLocaleCurrency(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    case 'date': {
      const date = value instanceof Date ? value : new Date(String(value));
      if (isNaN(date.getTime())) return String(value);
      return date.toLocaleDateString();
    }
    case 'boolean': {
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      const strVal = String(value).toLowerCase();
      if (strVal === 'yes' || strVal === 'true' || strVal === '1') return 'Yes';
      if (strVal === 'no' || strVal === 'false' || strVal === '0') return 'No';
      return 'Unknown';
    }
    case 'string':
    default:
      return String(value);
  }
}
