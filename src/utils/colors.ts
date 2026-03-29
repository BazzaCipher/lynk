import type { SimpleDataType } from '../types';

// Paperbridge color scheme - warmed data type colors
export const DATA_TYPE_COLORS: Record<SimpleDataType, { bg: string; border: string; text: string }> = {
  string: {
    bg: 'rgba(56, 132, 212, 0.15)', // bold blue
    border: '#3884d4',
    text: '#2560a0',
  },
  number: {
    bg: 'rgba(72, 180, 72, 0.15)', // vivid green
    border: '#48b448',
    text: '#2d8a2d',
  },
  currency: {
    bg: 'rgba(228, 160, 28, 0.15)', // rich amber
    border: '#e4a01c',
    text: '#b07a10',
  },
  date: {
    bg: 'rgba(148, 90, 210, 0.15)', // vivid purple
    border: '#945ad2',
    text: '#6e3aaa',
  },
  boolean: {
    bg: 'rgba(220, 76, 120, 0.15)', // bold rose
    border: '#dc4c78',
    text: '#b03060',
  },
};

// File type color mapping - warmed to match Paperbridge palette
export const FILE_TYPE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  'application/pdf':  { bg: 'rgba(210, 60, 50, 0.1)',   border: '#d23c32', text: '#a82820', label: 'PDF' },
  'image/png':        { bg: 'rgba(56, 132, 212, 0.1)',   border: '#3884d4', text: '#2560a0', label: 'PNG' },
  'image/jpeg':       { bg: 'rgba(228, 160, 28, 0.1)',   border: '#e4a01c', text: '#b07a10', label: 'JPEG' },
  'image/webp':       { bg: 'rgba(72, 180, 72, 0.1)',    border: '#48b448', text: '#2d8a2d', label: 'WebP' },
  'image/gif':        { bg: 'rgba(148, 90, 210, 0.1)',   border: '#945ad2', text: '#6e3aaa', label: 'GIF' },
  'image/svg+xml':    { bg: 'rgba(220, 76, 120, 0.1)',   border: '#dc4c78', text: '#b03060', label: 'SVG' },
};

export function getFileTypeColor(mimeType: string) {
  return FILE_TYPE_COLORS[mimeType] || { bg: 'rgba(156, 132, 104, 0.1)', border: '#b8a58e', text: '#7d6a52', label: mimeType.split('/')[1]?.toUpperCase() || 'FILE' };
}

export function getColorForType(dataType: SimpleDataType) {
  return DATA_TYPE_COLORS[dataType] || DATA_TYPE_COLORS.string;
}

// Get a CSS class string for tailwind-based styling
export function getTypeColorClass(dataType: SimpleDataType): string {
  const classes: Record<SimpleDataType, string> = {
    string: 'bg-blue-100 text-blue-700 border-blue-300',
    number: 'bg-green-100 text-green-700 border-green-300',
    currency: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    date: 'bg-purple-100 text-purple-700 border-purple-300',
    boolean: 'bg-pink-100 text-pink-700 border-pink-300',
  };
  return classes[dataType] || classes.string;
}

// Get badge color class for type indicator
export function getTypeBadgeClass(dataType: SimpleDataType): string {
  const classes: Record<SimpleDataType, string> = {
    string: 'bg-blue-500',
    number: 'bg-green-500',
    currency: 'bg-yellow-500',
    date: 'bg-purple-500',
    boolean: 'bg-pink-500',
  };
  return classes[dataType] || classes.string;
}

/**
 * Create CSS gradient from multiple data types.
 * Sharp edges (no blending) between colors.
 */
export function createGradientFromTypes(types: SimpleDataType[]): string {
  if (types.length === 0) return '#9c8468';
  if (types.length === 1) return DATA_TYPE_COLORS[types[0]]?.border || '#9c8468';

  const colors = types.map(t => DATA_TYPE_COLORS[t]?.border || '#9c8468');
  const segmentSize = 100 / colors.length;
  const stops = colors.map((color, i) => {
    const start = i * segmentSize;
    const end = (i + 1) * segmentSize;
    return `${color} ${start}%, ${color} ${end}%`;
  }).join(', ');

  return `linear-gradient(90deg, ${stops})`;
}

/**
 * Get compatible types for a data type.
 * Number and currency are interchangeable; all other types are standalone.
 */
export function getCompatibleTypes(dataType: SimpleDataType): SimpleDataType[] | undefined {
  return (dataType === 'number' || dataType === 'currency') ? ['number', 'currency'] : undefined;
}

/**
 * Get output handle color from NodeOutput.
 */
export function getOutputHandleColor(output: { dataType: SimpleDataType; compatibleTypes?: SimpleDataType[] } | undefined): string {
  if (!output) return '#9c8468';
  const types = output.compatibleTypes ?? [output.dataType];
  return createGradientFromTypes(types);
}

/**
 * Get input handle color from accepted types.
 */
export function getInputHandleColor(
  acceptedTypes: SimpleDataType[] | Record<string, SimpleDataType[]> | undefined,
  handleId?: string
): string {
  if (!acceptedTypes) return '#9c8468';
  const types = Array.isArray(acceptedTypes)
    ? acceptedTypes
    : (handleId ? acceptedTypes[handleId] : undefined) ?? [];
  return createGradientFromTypes(types);
}
