import { Position } from '@xyflow/react';
import { NodeEntry } from '../base/NodeEntry';
import { useCanvasStore } from '../../../store/canvasStore';
import type { ExtractedRegion, SimpleDataType } from '../../../types';
import { getTypeBadgeClass, getTypeColorClass } from '../../../utils/colors';

interface RegionListProps {
  regions: ExtractedRegion[];
  selectedRegionId: string | null;
  onRegionSelect: (regionId: string) => void;
  onRegionDelete: (regionId: string) => void;
  onRegionLabelChange: (regionId: string, label: string) => void;
  onRegionDataTypeChange: (regionId: string, dataType: SimpleDataType) => void;
  onValueChange?: (regionId: string, value: string) => void;
  onExtract?: (regionId: string) => void;
  isExtracting?: boolean;
  showOcrButton?: boolean;
  compact?: boolean;
  nodeId?: string; // Node ID for comparing with external highlight
}

const DATA_TYPE_OPTIONS: { value: SimpleDataType; label: string; icon: string }[] = [
  { value: 'string', label: 'Text', icon: 'Aa' },
  { value: 'number', label: 'Number', icon: '#' },
  { value: 'currency', label: 'Currency', icon: '$' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'boolean', label: 'Yes/No', icon: '?' },
];

const BOOLEAN_OPTIONS = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

function formatValue(value: string | number | Date, dataType: SimpleDataType): string {
  if (value === '' || value === null || value === undefined) return '';

  const strValue = String(value);

  switch (dataType) {
    case 'currency':
      const num = parseFloat(strValue.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? strValue : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    case 'number':
      const parsed = parseFloat(strValue.replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? strValue : parsed.toLocaleString();
    case 'date':
      const date = new Date(strValue);
      return isNaN(date.getTime()) ? strValue : date.toLocaleDateString();
    case 'boolean':
      const lower = strValue.toLowerCase();
      if (lower === 'yes' || lower === 'true' || lower === '1') return 'Yes';
      if (lower === 'no' || lower === 'false' || lower === '0') return 'No';
      return 'Unknown';
    default:
      return strValue;
  }
}

function getRawValue(region: ExtractedRegion): string {
  if (region.extractedData.value !== '') {
    return String(region.extractedData.value);
  }
  if (region.selectionType === 'text' && region.textRange) {
    return region.textRange.text;
  }
  return '';
}

function getDisplayValue(region: ExtractedRegion): string {
  const raw = getRawValue(region);
  if (!raw) return '';
  return formatValue(raw, region.dataType);
}

function getBooleanValue(region: ExtractedRegion): string {
  const raw = getRawValue(region).toLowerCase();
  if (raw === 'yes' || raw === 'true' || raw === '1') return 'yes';
  if (raw === 'no' || raw === 'false' || raw === '0') return 'no';
  return 'unknown';
}

export function RegionList({
  regions,
  selectedRegionId,
  onRegionSelect,
  onRegionDelete,
  onRegionLabelChange,
  onRegionDataTypeChange,
  onValueChange,
  onExtract,
  isExtracting = false,
  showOcrButton = false,
  compact = false,
  nodeId,
}: RegionListProps) {
  // Subscribe to external highlight state
  const highlightedRegion = useCanvasStore((state) => state.highlightedRegion);

  // Check if a region is externally highlighted (from CalculationNode hover/click)
  const isExternallyHighlighted = (regionId: string): boolean => {
    if (!highlightedRegion || !nodeId) return false;
    return (
      highlightedRegion.nodeId === nodeId &&
      highlightedRegion.regionId === regionId
    );
  };

  if (regions.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-gray-400 text-center">
        {compact ? 'No fields' : 'Draw a box or select text to create fields'}
      </div>
    );
  }

  // Compact view - just show values with type indicator
  if (compact) {
    return (
      <div className="divide-y divide-gray-100">
        {regions.map((region) => {
          const displayValue = getDisplayValue(region);
          const typeColor = getTypeBadgeClass(region.dataType);
          const isExternal = isExternallyHighlighted(region.id);

          return (
            <NodeEntry
              key={region.id}
              id={region.id}
              handleType="source"
              handlePosition={Position.Right}
              className={`group hover:bg-gray-50 cursor-pointer ${
                selectedRegionId === region.id ? 'bg-blue-50' : ''
              } ${isExternal ? 'bg-blue-100 ring-1 ring-blue-400 animate-pulse' : ''}`}
            >
              <div
                className="flex items-center gap-2 flex-1 min-w-0 py-0.5"
                onClick={() => onRegionSelect(region.id)}
              >
                {/* Type color indicator */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${typeColor}`} />

                {/* Label */}
                <span className="text-xs text-gray-500 truncate max-w-[60px]">
                  {region.label}
                </span>

                {/* Value */}
                <span className={`text-sm font-medium truncate flex-1 ${
                  displayValue ? 'text-gray-900' : 'text-gray-300'
                }`}>
                  {displayValue || '(empty)'}
                </span>
              </div>
            </NodeEntry>
          );
        })}
      </div>
    );
  }

  // Full view - editable with all controls
  return (
    <div className="divide-y divide-gray-100">
      {regions.map((region) => {
        const displayValue = getDisplayValue(region);
        const rawValue = getRawValue(region);
        const hasValue = rawValue !== '';
        const needsOcr = region.selectionType === 'box' && !hasValue;

        return (
          <div
            key={region.id}
            className={`p-3 hover:bg-gray-50 transition-colors cursor-pointer ${
              selectedRegionId === region.id ? 'bg-blue-50 ring-2 ring-blue-200 ring-inset' : ''
            }`}
            onClick={() => onRegionSelect(region.id)}
          >
            {/* Header row: label + delete */}
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={region.label}
                onChange={(e) => {
                  e.stopPropagation();
                  onRegionLabelChange(region.id, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-sm font-medium bg-transparent border-none outline-none focus:ring-0 p-0"
                placeholder="Label..."
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRegionDelete(region.id);
                }}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Type selector */}
            <div className="flex items-center gap-1 mb-2">
              {DATA_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRegionDataTypeChange(region.id, opt.value);
                  }}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    region.dataType === opt.value
                      ? getTypeColorClass(opt.value)
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={opt.label}
                >
                  {opt.icon}
                </button>
              ))}
            </div>

            {/* Value display/input */}
            <div className={`rounded p-2 ${getTypeColorClass(region.dataType)}`}>
              {region.dataType === 'boolean' ? (
                // Boolean: Yes/No/Unknown selector
                <div className="flex gap-1">
                  {BOOLEAN_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        onValueChange?.(region.id, opt.value);
                      }}
                      className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                        getBooleanValue(region) === opt.value
                          ? 'bg-white shadow-sm font-medium'
                          : 'hover:bg-white/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : onValueChange ? (
                <input
                  type="text"
                  value={rawValue}
                  onChange={(e) => {
                    e.stopPropagation();
                    onValueChange(region.id, e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-sm font-mono bg-transparent border-none outline-none focus:ring-0 p-0"
                  placeholder="Enter value..."
                />
              ) : (
                <span className={`text-sm font-mono ${hasValue ? '' : 'opacity-50'}`}>
                  {displayValue || '(no value)'}
                </span>
              )}
            </div>

            {/* OCR button for box selections without value */}
            {showOcrButton && needsOcr && onExtract && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExtract(region.id);
                }}
                disabled={isExtracting}
                className="mt-2 w-full px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                {isExtracting ? (
                  <>
                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Extracting...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    Run OCR
                  </>
                )}
              </button>
            )}

            {/* Selection type indicator */}
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
              {region.selectionType === 'text' ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  Text selection
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z" />
                  </svg>
                  Box selection
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
