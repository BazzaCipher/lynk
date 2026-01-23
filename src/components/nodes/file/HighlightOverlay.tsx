import type { ExtractedRegion } from '../../../types';
import { getColorForType } from '../../../utils/colors';
import { useExternalHighlight } from '../../../hooks/useHighlighting';

interface HighlightOverlayProps {
  regions: ExtractedRegion[];
  currentPage: number;
  selectedRegionId: string | null;
  onRegionSelect: (regionId: string) => void;
  interactive?: boolean;
  nodeId?: string; // Node ID for comparing with external highlight
}

export function HighlightOverlay({
  regions,
  currentPage,
  selectedRegionId,
  onRegionSelect,
  interactive = true,
  nodeId,
}: HighlightOverlayProps) {
  // Use external highlight hook
  const { isExternallyHighlighted } = useExternalHighlight(nodeId);

  // Filter regions for current page
  const boxRegions = regions.filter(
    (r) => r.pageNumber === currentPage && r.selectionType === 'box' && r.coordinates
  );
  const textRegions = regions.filter(
    (r) => r.pageNumber === currentPage && r.selectionType === 'text' && r.textRange?.rects
  );

  if (boxRegions.length === 0 && textRegions.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Render box selections */}
      {boxRegions.map((region) => {
        const colors = getColorForType(region.dataType);
        const isSelected = selectedRegionId === region.id;
        const isExternal = isExternallyHighlighted(region.id);

        return (
          <div
            key={region.id}
            data-region-id={region.id}
            className={`absolute transition-all duration-150 ${
              interactive ? 'pointer-events-auto cursor-pointer' : ''
            } ${isExternal ? 'animate-pulse' : ''}`}
            style={{
              left: region.coordinates!.x,
              top: region.coordinates!.y,
              width: region.coordinates!.width,
              height: region.coordinates!.height,
              backgroundColor: isSelected || isExternal ? colors.bg : 'transparent',
              borderWidth: 2,
              borderStyle: isSelected || isExternal ? 'solid' : 'dashed',
              borderColor: colors.border,
              boxShadow: isExternal
                ? `0 0 0 3px ${colors.border}, 0 0 12px 4px ${colors.bg}`
                : isSelected
                ? `0 0 0 2px ${colors.bg}`
                : 'none',
            }}
            onClick={interactive ? () => onRegionSelect(region.id) : undefined}
          >
            {/* Region label - positioned at top-left corner */}
            <div
              className={`absolute -top-5 left-0 px-1.5 py-0.5 text-xs text-white rounded-t whitespace-nowrap font-medium ${
                isExternal ? 'animate-pulse' : ''
              }`}
              style={{ backgroundColor: colors.border }}
            >
              {region.label}
            </div>

            {/* Corner handles for selected region */}
            {(isSelected || isExternal) && (
              <>
                <div
                  className="absolute -top-1 -left-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: colors.border }}
                />
                <div
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: colors.border }}
                />
                <div
                  className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: colors.border }}
                />
                <div
                  className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: colors.border }}
                />
              </>
            )}
          </div>
        );
      })}

      {/* Render text selections */}
      {textRegions.map((region) => {
        const colors = getColorForType(region.dataType);
        const isSelected = selectedRegionId === region.id;
        const isExternal = isExternallyHighlighted(region.id);
        const rects = region.textRange!.rects;

        // Calculate bounding box for label positioning
        const minX = Math.min(...rects.map((r) => r.x));
        const minY = Math.min(...rects.map((r) => r.y));

        return (
          <div key={region.id} data-region-id={region.id}>
            {/* Render each rect of the text selection */}
            {rects.map((rect, index) => (
              <div
                key={`${region.id}-rect-${index}`}
                className={`absolute transition-all duration-150 ${
                  interactive ? 'pointer-events-auto cursor-pointer' : ''
                } ${isExternal ? 'animate-pulse' : ''}`}
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  height: rect.height,
                  backgroundColor: colors.bg,
                  borderBottom: isSelected || isExternal ? `2px solid ${colors.border}` : 'none',
                  boxShadow: isExternal ? `0 0 8px 2px ${colors.bg}` : 'none',
                }}
                onClick={interactive ? () => onRegionSelect(region.id) : undefined}
              />
            ))}

            {/* Label positioned at the top-left of the first rect */}
            <div
              className={`absolute px-1.5 py-0.5 text-xs text-white rounded-t whitespace-nowrap font-medium ${
                interactive ? 'pointer-events-auto cursor-pointer' : ''
              } ${isExternal ? 'animate-pulse' : ''}`}
              style={{
                left: `${minX}px`,
                top: `${Math.max(0, minY - 22)}px`,
                backgroundColor: colors.border,
                zIndex: 10,
              }}
              onClick={interactive ? () => onRegionSelect(region.id) : undefined}
            >
              {region.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
