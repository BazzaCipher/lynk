import { type ReactNode } from 'react';

interface BaseNodeProps {
  label: string;
  selected?: boolean;
  children: ReactNode;
  className?: string;
  /** Custom header content - if provided, replaces the default label h3 */
  renderHeader?: ReactNode;
}

export function BaseNode({
  label,
  selected,
  children,
  className = '',
  renderHeader,
}: BaseNodeProps) {
  return (
    <div
      className={`
        bg-white rounded-lg shadow-md border-2 min-w-[200px]
        ${selected ? 'border-copper-500' : 'border-paper-200'}
        ${className}
      `}
    >
      {/* Header */}
      <div className="px-2 py-1.5 bg-paper-50 rounded-t-lg border-b border-paper-200">
        {renderHeader ?? (
          <h3 className="text-sm font-medium text-bridge-700 truncate">
            {label}
          </h3>
        )}
      </div>

      {/* Content - handles are managed by children via NodeEntry */}
      <div className="py-1">{children}</div>
    </div>
  );
}
