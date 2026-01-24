import { useMemo } from 'react';
import { useEdges, useNodes } from '@xyflow/react';
import type {
  LynkNode,
  FileNode,
  CalculationNode,
  SheetNode,
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
    case 'sheet':
      return resolveSheetNodeOutput(node as SheetNode, sourceHandle);
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
  let value: string | number | boolean | Date;
  let numericValue: number | null = null;

  // Handle different data types appropriately
  if (region.dataType === 'boolean') {
    // Convert to actual boolean
    if (typeof extractedValue === 'boolean') {
      value = extractedValue;
    } else {
      const strVal = String(extractedValue).toLowerCase();
      value = strVal === 'yes' || strVal === 'true' || strVal === '1';
    }
  } else if (region.dataType === 'date') {
    // Keep date as string for date operations
    value = typeof extractedValue === 'string' ? extractedValue : String(extractedValue);
  } else if (typeof extractedValue === 'number') {
    value = extractedValue;
    numericValue = extractedValue;
  } else if (typeof extractedValue === 'string') {
    value = extractedValue;
    numericValue = parseNumericValue(extractedValue);
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
    dataType: region.dataType,
    sourceNodeId: node.id,
    sourceRegionId: region.id,
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

  const value = result.value;
  // Only parse numeric value for number/string types, not Date
  const numericValue = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? parseNumericValue(value)
      : null;

  return {
    value,
    numericValue,
    label: node.data.label,
    source: result.source || null,
    dataType: result.dataType,
    sourceNodeId: node.id,
    sourceRegionId: 'output',
  };
}

/**
 * Resolve output from a SheetNode (entry or subheader results).
 * Handles:
 * - Entry outputs: `entry-out-{subheaderId}-{entryId}`
 * - Subheader outputs: `subheader-{subheaderId}`
 */
function resolveSheetNodeOutput(
  node: SheetNode,
  sourceHandle: string | null | undefined
): Omit<ResolvedInput, 'edgeId'> | null {
  if (!sourceHandle) return null;

  // Entry output: return entry's computed result
  if (sourceHandle.startsWith('entry-out-')) {
    const parts = sourceHandle.replace('entry-out-', '').split('-');
    const subheaderId = parts[0];
    const entryId = parts.slice(1).join('-'); // Handle IDs with dashes

    const subheader = node.data.subheaders.find((s) => s.id === subheaderId);
    const entry = subheader?.entries.find((e) => e.id === entryId);
    if (!entry) return null;

    const result = node.data.entryResults?.[`${subheaderId}-${entryId}`];
    if (!result) return null;

    const numericValue = typeof result.value === 'number'
      ? result.value
      : typeof result.value === 'string'
        ? parseNumericValue(result.value)
        : null;

    return {
      value: result.value,
      numericValue,
      label: entry.label,
      source: null,
      dataType: result.dataType,
      sourceNodeId: node.id,
      sourceRegionId: `${subheaderId}-${entryId}`,
    };
  }

  // Subheader output: return aggregated result
  if (sourceHandle.startsWith('subheader-')) {
    const subheaderId = sourceHandle.replace('subheader-', '');
    const subheader = node.data.subheaders.find((s) => s.id === subheaderId);
    if (!subheader) return null;

    const result = node.data.subheaderResults?.[subheaderId];
    if (!result) return null;

    const numericValue = typeof result.value === 'number'
      ? result.value
      : typeof result.value === 'string'
        ? parseNumericValue(result.value)
        : null;

    return {
      value: result.value,
      numericValue,
      label: subheader.label,
      source: null,
      dataType: result.dataType,
      sourceNodeId: node.id,
      sourceRegionId: subheaderId,
    };
  }

  return null;
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
