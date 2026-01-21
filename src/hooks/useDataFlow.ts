import { useMemo } from 'react';
import { useEdges, useNodes } from '@xyflow/react';
import type {
  LynkNode,
  FileNode,
  CalculationNode,
  DataSourceReference,
} from '../types';

export interface ResolvedInput {
  value: number | string;
  numericValue: number | null;
  label: string;
  source: DataSourceReference | null;
  edgeId: string;
}

interface UseDataFlowOptions {
  nodeId: string;
  targetHandle?: string; // Specific handle to filter by (optional)
}

interface UseDataFlowResult {
  inputs: ResolvedInput[];
  hasInputs: boolean;
}

/**
 * Hook for resolving input values from connected edges.
 * Used by processing nodes (Calculation, Sheet, Label) to get their input data.
 */
export function useDataFlow({ nodeId, targetHandle }: UseDataFlowOptions): UseDataFlowResult {
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
        resolvedInputs.push({
          ...resolved,
          edgeId: edge.id,
        });
      }
    }

    return resolvedInputs;
  }, [edges, nodes, nodeId, targetHandle]);

  return {
    inputs,
    hasInputs: inputs.length > 0,
  };
}

/**
 * Resolve the output value from a source node based on the source handle.
 */
function resolveNodeOutput(
  node: LynkNode,
  sourceHandle: string | null | undefined
): Omit<ResolvedInput, 'edgeId'> | null {
  switch (node.type) {
    case 'file':
      return resolveFileNodeOutput(node as FileNode, sourceHandle);
    case 'calculation':
      return resolveCalculationNodeOutput(node as CalculationNode, sourceHandle);
    default:
      return null;
  }
}

/**
 * Resolve output from a FileNode (region data).
 */
function resolveFileNodeOutput(
  node: FileNode,
  sourceHandle: string | null | undefined
): Omit<ResolvedInput, 'edgeId'> | null {
  if (!sourceHandle) return null;

  const region = node.data.regions.find((r) => r.id === sourceHandle);
  if (!region) return null;

  const extractedValue = region.extractedData.value;
  let value: string | number;
  let numericValue: number | null = null;

  if (typeof extractedValue === 'number') {
    value = extractedValue;
    numericValue = extractedValue;
  } else if (typeof extractedValue === 'string') {
    value = extractedValue;
    // Try to parse as number, removing currency symbols and commas
    const cleaned = extractedValue.replace(/[$€£,]/g, '').trim();
    const parsed = parseFloat(cleaned);
    numericValue = isNaN(parsed) ? null : parsed;
  } else {
    value = String(extractedValue);
  }

  const source: DataSourceReference = {
    nodeId: node.id,
    regionId: region.id,
    pageNumber: region.pageNumber,
    coordinates: region.coordinates,
    textRange: region.textRange,
    extractionMethod: region.extractedData.source?.extractionMethod || 'manual',
    confidence: region.extractedData.source?.confidence,
  };

  return {
    value,
    numericValue,
    label: region.label,
    source,
  };
}

/**
 * Resolve output from a CalculationNode (result value).
 */
function resolveCalculationNodeOutput(
  node: CalculationNode,
  sourceHandle: string | null | undefined
): Omit<ResolvedInput, 'edgeId'> | null {
  if (sourceHandle !== 'output') return null;

  // For CalculationNode, we need to compute the result based on its connected inputs
  // However, this creates a circular dependency. Instead, we should store the computed
  // result in the node data. For now, return the stored result if available.
  const result = node.data.result;
  if (!result) return null;

  const value = result.value as number;
  return {
    value,
    numericValue: value,
    label: node.data.label,
    source: result.source || null,
  };
}

/**
 * Parse a string value to a number, handling currency and locale formats.
 */
export function parseNumericValue(value: string | number): number | null {
  if (typeof value === 'number') return value;

  const cleaned = value.replace(/[$€£,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format a numeric value based on the specified format.
 */
export function formatValue(
  value: number | string | null | undefined,
  format: 'number' | 'currency' | 'date' | 'text',
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
        currency: options?.currency ?? 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    case 'date': {
      const date = typeof value === 'string' ? new Date(value) : null;
      if (!date || isNaN(date.getTime())) return String(value);
      return date.toLocaleDateString();
    }
    case 'text':
    default:
      return String(value);
  }
}
