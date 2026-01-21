import { type ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';

interface NodeEntryProps {
  id: string;
  handleType: 'source' | 'target';
  handlePosition: Position;
  children: ReactNode;
  className?: string;
  /** Allow multiple connections to this handle */
  allowMultiple?: boolean;
}

export function NodeEntry({
  id,
  handleType,
  handlePosition,
  children,
  className = '',
  allowMultiple = false,
}: NodeEntryProps) {
  return (
    <div className={`relative flex items-center min-h-8 px-2 ${className}`}>
      {children}
      <Handle
        type={handleType}
        position={handlePosition}
        id={id}
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          ...(handlePosition === Position.Left && { left: -6 }),
          ...(handlePosition === Position.Right && { right: -6 }),
        }}
        className={`w-3 h-3 border-2 border-white ${
          allowMultiple ? 'ring-2 ring-offset-1 ring-blue-300' : ''
        }`}
      />
    </div>
  );
}
