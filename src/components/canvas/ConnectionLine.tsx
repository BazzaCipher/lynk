import { type ConnectionLineComponentProps, getBezierPath } from '@xyflow/react';

/**
 * Custom connection line that provides visual feedback during connection dragging.
 * Shows green when connection is valid, red when invalid.
 */
export function ConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  connectionStatus,
}: ConnectionLineComponentProps) {
  const [path] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  });

  // connectionStatus is 'valid' | 'invalid' | null
  // null means not hovering over a handle
  let strokeColor = '#64748b'; // Default gray while dragging
  let strokeWidth = 2;

  if (connectionStatus === 'valid') {
    strokeColor = '#22c55e'; // Green for valid
    strokeWidth = 3;
  } else if (connectionStatus === 'invalid') {
    strokeColor = '#ef4444'; // Red for invalid
    strokeWidth = 3;
  }

  return (
    <g>
      {/* Glow effect for valid/invalid feedback */}
      {connectionStatus && (
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 4}
          strokeOpacity={0.3}
          className="animated"
        />
      )}
      {/* Main connection line */}
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        className="animated"
      />
      {/* Animated dots along the path */}
      <circle r={4} fill={strokeColor}>
        <animateMotion dur="1s" repeatCount="indefinite" path={path} />
      </circle>
    </g>
  );
}
