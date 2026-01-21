import { useMemo, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Position, useEdges, useNodes } from '@xyflow/react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { BaseNode } from './base/BaseNode';
import { NodeEntry } from './base/NodeEntry';
import { useCanvasStore } from '../../store/canvasStore';
import type {
  SheetNode as SheetNodeType,
  FileNode as FileNodeType,
  CalculationNode as CalculationNodeType,
  DataSourceReference,
} from '../../types';

interface RowData {
  id: string;
  value: string | number;
  numericValue: number | null;
  label: string;
  source: DataSourceReference | null;
}

type AggregationType = 'sum' | 'average' | 'min' | 'max' | 'count' | 'none';

const columnHelper = createColumnHelper<RowData>();

export function SheetNode({ id, data, selected }: NodeProps<SheetNodeType>) {
  const edges = useEdges();
  const nodes = useNodes();
  const setHighlightedRegion = useCanvasStore((state) => state.setHighlightedRegion);
  const highlightedRegion = useCanvasStore((state) => state.highlightedRegion);

  // State for aggregation type
  const [aggregation, setAggregation] = useState<AggregationType>('sum');

  // Find all edges connected to this node's rows handle
  const connectedEdges = useMemo(() => {
    return edges.filter(
      (edge) => edge.target === id && edge.targetHandle === 'rows'
    );
  }, [edges, id]);

  // Resolve row data from connected nodes (FileNode or CalculationNode)
  const rowData = useMemo((): RowData[] => {
    const rows: RowData[] = [];

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

        const extractedValue = region.extractedData.value;
        let value: string | number;
        let numericValue: number | null = null;

        if (typeof extractedValue === 'number') {
          value = extractedValue;
          numericValue = extractedValue;
        } else if (typeof extractedValue === 'string') {
          value = extractedValue;
          const cleaned = extractedValue.replace(/[$€£,]/g, '').trim();
          const parsed = parseFloat(cleaned);
          numericValue = isNaN(parsed) ? null : parsed;
        } else {
          value = String(extractedValue);
        }

        rows.push({
          id: `${fileNode.id}-${region.id}`,
          value,
          numericValue,
          label: region.label,
          source: {
            nodeId: fileNode.id,
            regionId: region.id,
            pageNumber: region.pageNumber,
            coordinates: region.coordinates,
            textRange: region.textRange,
            extractionMethod: region.extractedData.source?.extractionMethod || 'manual',
            confidence: region.extractedData.source?.confidence,
          },
        });
      } else if (sourceNode.type === 'calculation') {
        // Handle CalculationNode source
        const calcNode = sourceNode as CalculationNodeType;
        if (edge.sourceHandle !== 'output') continue;

        const result = calcNode.data.result;
        if (!result) continue;

        const resultValue = result.value;
        let value: string | number;
        let numericValue: number | null = null;

        if (typeof resultValue === 'number') {
          value = resultValue;
          numericValue = resultValue;
        } else if (typeof resultValue === 'string') {
          value = resultValue;
          const cleaned = resultValue.replace(/[$€£,]/g, '').trim();
          const parsed = parseFloat(cleaned);
          numericValue = isNaN(parsed) ? null : parsed;
        } else {
          value = String(resultValue);
        }

        rows.push({
          id: `${calcNode.id}-output`,
          value,
          numericValue,
          label: calcNode.data.label,
          source: result.source || null,
        });
      }
    }

    return rows;
  }, [connectedEdges, nodes]);

  // Calculate aggregation
  const aggregatedValue = useMemo(() => {
    const numericValues = rowData
      .map((r) => r.numericValue)
      .filter((v): v is number => v !== null);

    if (numericValues.length === 0) return null;

    switch (aggregation) {
      case 'sum':
        return numericValues.reduce((acc, val) => acc + val, 0);
      case 'average':
        return numericValues.reduce((acc, val) => acc + val, 0) / numericValues.length;
      case 'min':
        return Math.min(...numericValues);
      case 'max':
        return Math.max(...numericValues);
      case 'count':
        return numericValues.length;
      case 'none':
      default:
        return null;
    }
  }, [rowData, aggregation]);

  // Check if a row is highlighted
  const isRowHighlighted = (row: RowData): boolean => {
    if (!row.source || !highlightedRegion) return false;
    return (
      highlightedRegion.nodeId === row.source.nodeId &&
      highlightedRegion.regionId === row.source.regionId
    );
  };

  // Handle hover on row
  const handleRowHover = (row: RowData | null) => {
    if (row?.source) {
      setHighlightedRegion({
        nodeId: row.source.nodeId,
        regionId: row.source.regionId,
      });
    } else {
      setHighlightedRegion(null);
    }
  };

  // Handle click on row (toggle persistent highlight)
  const handleRowClick = (row: RowData) => {
    if (!row.source) return;

    const isHighlighted = isRowHighlighted(row);
    if (isHighlighted) {
      setHighlightedRegion(null);
    } else {
      setHighlightedRegion({
        nodeId: row.source.nodeId,
        regionId: row.source.regionId,
      });
    }
  };

  // Define table columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('label', {
        header: 'Field',
        cell: (info) => (
          <span className="text-gray-500 text-xs">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('value', {
        header: 'Value',
        cell: (info) => {
          const value = info.getValue();
          const row = info.row.original;
          const isNumeric = row.numericValue !== null;

          return (
            <span className={`font-mono ${isNumeric ? 'text-right' : ''}`}>
              {isNumeric
                ? row.numericValue!.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })
                : value}
            </span>
          );
        },
      }),
    ],
    []
  );

  // Create table instance
  const table = useReactTable({
    data: rowData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Format aggregated value
  const formatAggregated = (value: number | null): string => {
    if (value === null) return '—';
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <BaseNode label={data.label} selected={selected} className="min-w-[250px]">
      {/* Single rows handle that accepts multiple connections */}
      <NodeEntry
        id="rows"
        handleType="target"
        handlePosition={Position.Left}
        allowMultiple
        className="border-b border-gray-100"
      >
        <span className="text-xs text-gray-500">
          Rows ({rowData.length} connected)
        </span>
      </NodeEntry>

      {/* Table display */}
      <div className="max-h-[300px] overflow-auto">
        {rowData.length === 0 ? (
          <div className="px-3 py-4 text-xs text-gray-400 text-center">
            Connect values to display...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {table.getRowModel().rows.map((row) => {
                const isHighlighted = isRowHighlighted(row.original);
                return (
                  <tr
                    key={row.id}
                    className={`cursor-pointer transition-colors ${
                      isHighlighted
                        ? 'bg-blue-100'
                        : 'hover:bg-gray-50'
                    }`}
                    onMouseEnter={() => handleRowHover(row.original)}
                    onMouseLeave={() => {
                      if (!isHighlighted) handleRowHover(null);
                    }}
                    onClick={() => handleRowClick(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-2 py-1.5">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Aggregation footer */}
      {rowData.length > 0 && (
        <div className="border-t border-gray-200 px-2 py-2 bg-gray-50">
          <div className="flex items-center justify-between">
            <select
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value as AggregationType)}
              className="text-xs bg-white border border-gray-200 rounded px-1.5 py-0.5"
            >
              <option value="sum">Sum</option>
              <option value="average">Average</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
              <option value="count">Count</option>
              <option value="none">None</option>
            </select>
            <span className="font-mono font-medium text-sm">
              {formatAggregated(aggregatedValue)}
            </span>
          </div>
        </div>
      )}
    </BaseNode>
  );
}
