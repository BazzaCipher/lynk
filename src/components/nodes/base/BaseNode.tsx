import { type ReactNode } from 'react';

interface BaseNodeProps {
  label: string;
  selected?: boolean;
  children: ReactNode;
  className?: string;
}

export function BaseNode({
  label,
  selected,
  children,
  className = '',
}: BaseNodeProps) {
  return (
    <div
      className={`
        bg-white rounded-lg shadow-md border-2 min-w-[200px]
        ${selected ? 'border-blue-500' : 'border-gray-200'}
        ${className}
      `}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-gray-50 rounded-t-lg border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 truncate">
          {label}
        </h3>
      </div>

      {/* Content - handles are managed by children via NodeEntry */}
      <div className="py-1">{children}</div>
    </div>
  );
}
