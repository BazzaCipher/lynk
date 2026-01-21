import type { SimpleDataType } from '../types';

// Color scheme based on data type
export const DATA_TYPE_COLORS: Record<SimpleDataType, { bg: string; border: string; text: string }> = {
  string: {
    bg: 'rgba(59, 130, 246, 0.15)', // blue
    border: '#3b82f6',
    text: '#1d4ed8',
  },
  number: {
    bg: 'rgba(34, 197, 94, 0.15)', // green
    border: '#22c55e',
    text: '#15803d',
  },
  currency: {
    bg: 'rgba(234, 179, 8, 0.15)', // yellow
    border: '#eab308',
    text: '#a16207',
  },
  date: {
    bg: 'rgba(168, 85, 247, 0.15)', // purple
    border: '#a855f7',
    text: '#7e22ce',
  },
  boolean: {
    bg: 'rgba(236, 72, 153, 0.15)', // pink
    border: '#ec4899',
    text: '#be185d',
  },
};

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
