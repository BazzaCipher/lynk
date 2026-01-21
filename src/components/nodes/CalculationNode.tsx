import { useMemo, useEffect } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position, useEdges, useNodes } from '@xyflow/react';
import { BaseNode } from './base/BaseNode';
import { NodeEntry } from './base/NodeEntry';
import { useCanvasStore } from '../../store/canvasStore';
import type {
  CalculationNode as CalculationNodeType,
  FileNode as FileNodeType,
  CalculationNode as CalcNodeType,
  DataValue,
  DataSourceReference,
} from '../../types';

interface ResolvedInput {
  value: number;
  label: string;
  sourceNodeId: string;
  sourceRegionId: string;
  source: DataSourceReference | null;
}

export function CalculationNode({ id, data, selected }: NodeProps<CalculationNodeType>) {
  const edges = useEdges();
  const nodes = useNodes();
  const setHighlightedRegion = useCanvasStore((state) => state.setHighlightedRegion);
  const highlightedRegion = useCanvasStore((state) => state.highlightedRegion);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);

  // Find all edges connected to this node's inputs handle
  const connectedEdges = useMemo(() => {
    return edges.filter(
      (edge) => edge.target === id && edge.targetHandle === 'inputs'
    );
  }, [edges, id]);

  // Resolve input values from connected nodes (FileNode or CalculationNode)
  const resolvedInputs = useMemo((): ResolvedInput[] => {
    const inputs: ResolvedInput[] = [];

    for (const edge of connectedEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      if (sourceNode.type === 'file') {
        // Handle FileNode source
        const fileNode = sourceNode as FileNodeType;
        const regionId = edge.sourceHandle;
        if (!regionId) continue;

        const region = fileNode.data.regions.find((r) => r.id === regionId);
        if (!region) continue;

        // Extract numeric value from the region
        const extractedValue = region.extractedData.value;
        let numericValue: number;

        if (typeof extractedValue === 'number') {
          numericValue = extractedValue;
        } else if (typeof extractedValue === 'string') {
          const cleaned = extractedValue.replace(/[$€£,]/g, '').trim();
          numericValue = parseFloat(cleaned);
        } else {
          continue;
        }

        if (isNaN(numericValue)) continue;

        const source: DataSourceReference = {
          nodeId: fileNode.id,
          regionId: region.id,
          pageNumber: region.pageNumber,
          coordinates: region.coordinates,
          textRange: region.textRange,
          extractionMethod: region.extractedData.source?.extractionMethod || 'manual',
          confidence: region.extractedData.source?.confidence,
        };

        inputs.push({
          value: numericValue,
          label: region.label,
          sourceNodeId: fileNode.id,
          sourceRegionId: region.id,
          source,
        });
      } else if (sourceNode.type === 'calculation') {
        // Handle CalculationNode source
        const calcNode = sourceNode as CalcNodeType;
        if (edge.sourceHandle !== 'output') continue;

        const result = calcNode.data.result;
        if (!result || typeof result.value !== 'number') continue;

        inputs.push({
          value: result.value,
          label: calcNode.data.label,
          sourceNodeId: calcNode.id,
          sourceRegionId: 'output',
          source: result.source || null,
        });
      }
    }

    return inputs;
  }, [connectedEdges, nodes]);

  // Calculate result based on operation
  const result = useMemo((): DataValue | null => {
    if (resolvedInputs.length === 0) return null;

    const values = resolvedInputs.map((input) => input.value);
    let calculatedValue: number;

    switch (data.operation) {
      case 'sum':
        calculatedValue = values.reduce((acc, val) => acc + val, 0);
        break;
      case 'average':
        calculatedValue = values.reduce((acc, val) => acc + val, 0) / values.length;
        break;
      case 'min':
        calculatedValue = Math.min(...values);
        break;
      case 'max':
        calculatedValue = Math.max(...values);
        break;
      case 'count':
        calculatedValue = values.length;
        break;
      default:
        return null;
    }

    // Apply precision
    const precision = data.precision ?? 2;
    calculatedValue = Number(calculatedValue.toFixed(precision));

    return {
      type: 'number',
      value: calculatedValue,
    };
  }, [resolvedInputs, data.operation, data.precision]);

  // Store result in node data for downstream nodes to access
  useEffect(() => {
    // Only update if the result has actually changed
    const currentValue = data.result?.value;
    const newValue = result?.value;

    if (currentValue !== newValue) {
      updateNodeData(id, { result });
    }
  }, [result, id, updateNodeData, data.result?.value]);

  // Handle hover on input value
  const handleInputHover = (input: ResolvedInput | null) => {
    if (input) {
      setHighlightedRegion({
        nodeId: input.sourceNodeId,
        regionId: input.sourceRegionId,
      });
    } else {
      setHighlightedRegion(null);
    }
  };

  // Handle click on input value (toggle persistent highlight)
  const handleInputClick = (input: ResolvedInput) => {
    const isCurrentlyHighlighted =
      highlightedRegion?.nodeId === input.sourceNodeId &&
      highlightedRegion?.regionId === input.sourceRegionId;

    if (isCurrentlyHighlighted) {
      setHighlightedRegion(null);
    } else {
      setHighlightedRegion({
        nodeId: input.sourceNodeId,
        regionId: input.sourceRegionId,
      });
    }
  };

  // Format result for display
  const formatValue = (value: number): string => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: data.precision ?? 2,
    });
  };

  return (
    <BaseNode label={data.label} selected={selected}>
      <div className="text-sm min-w-[180px]">
        {/* Single inputs handle that accepts multiple connections */}
        <NodeEntry
          id="inputs"
          handleType="target"
          handlePosition={Position.Left}
          allowMultiple
        >
          <div className="flex-1">
            {resolvedInputs.length === 0 ? (
              <span className="text-gray-400 text-xs">Connect inputs...</span>
            ) : (
              <div className="space-y-0.5">
                <span className="text-gray-500 text-xs">
                  Inputs ({resolvedInputs.length} values)
                </span>
                {resolvedInputs.map((input) => {
                  const isHighlighted =
                    highlightedRegion?.nodeId === input.sourceNodeId &&
                    highlightedRegion?.regionId === input.sourceRegionId;

                  return (
                    <div
                      key={`${input.sourceNodeId}-${input.sourceRegionId}`}
                      className={`flex items-center gap-2 px-1.5 py-0.5 rounded text-xs cursor-pointer transition-colors ${
                        isHighlighted
                          ? 'bg-blue-100 ring-1 ring-blue-400'
                          : 'hover:bg-gray-100'
                      }`}
                      onMouseEnter={() => handleInputHover(input)}
                      onMouseLeave={() => {
                        // Only clear if not persistently highlighted
                        if (!isHighlighted) {
                          handleInputHover(null);
                        }
                      }}
                      onClick={() => handleInputClick(input)}
                    >
                      <span className="text-gray-500 truncate max-w-[80px]" title={input.label}>
                        {input.label}:
                      </span>
                      <span className="font-mono text-gray-700">
                        {formatValue(input.value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </NodeEntry>

        {/* Operation display */}
        <div className="flex items-center gap-2 px-2 py-1 border-t border-gray-100 mt-1">
          <span className="text-gray-500 text-xs">Op:</span>
          <span className="font-medium text-xs capitalize">{data.operation}</span>
        </div>

        {/* Result with output handle */}
        <NodeEntry id="output" handleType="source" handlePosition={Position.Right}>
          <div className="flex-1 text-right">
            {result ? (
              <span className="font-mono font-medium text-sm">
                {formatValue(result.value as number)}
              </span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </NodeEntry>
      </div>
    </BaseNode>
  );
}
