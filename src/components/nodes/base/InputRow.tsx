import type { ResolvedInput } from '../../../hooks/useDataFlow';
import { formatValue } from '../../../utils/formatting';
import { getTypeBadgeClass } from '../../../utils/colors';

interface InputRowProps {
  input: ResolvedInput;
  isHighlighted: boolean;
  onHover: (input: ResolvedInput | null) => void;
  onClick: (input: ResolvedInput) => void;
  onDoubleClick: (input: ResolvedInput) => void;
  variant?: 'calculation' | 'sheet';
  isIncompatible?: boolean;
  incompatibleReason?: string;
}

export function InputRow({
  input,
  isHighlighted,
  onHover,
  onClick,
  onDoubleClick,
  variant = 'calculation',
  isIncompatible = false,
  incompatibleReason,
}: InputRowProps) {
  const displayVal = formatValue(input.value, input.dataType, { precision: 2 });

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick(input);
  };

  if (isIncompatible) {
    return (
      <div
        className="flex items-center gap-2 px-1.5 py-0.5 rounded text-xs bg-red-50 text-red-600"
        title={incompatibleReason}
        onDoubleClick={handleDoubleClick}
      >
        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <span className="truncate">{input.label}</span>
      </div>
    );
  }

  if (variant === 'sheet') {
    return (
      <div
        className={`flex items-center gap-2 pl-6 pr-2 py-0.5 text-xs cursor-pointer transition-colors ${
          isHighlighted ? 'bg-copper-400/10' : 'hover:bg-paper-50'
        }`}
        onMouseEnter={() => onHover(input)}
        onMouseLeave={() => { if (!isHighlighted) onHover(null); }}
        onClick={() => onClick(input)}
        onDoubleClick={handleDoubleClick}
      >
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${getTypeBadgeClass(input.dataType)}`}
          title={input.dataType}
        />
        <span className="text-bridge-500 truncate max-w-[80px]" title={input.label}>
          {input.label}:
        </span>
        <span className="font-mono text-bridge-700 ml-auto">{displayVal}</span>
      </div>
    );
  }

  // calculation variant (default)
  return (
    <div
      className={`flex items-center gap-2 px-1.5 py-0.5 rounded text-xs cursor-pointer transition-colors ${
        isHighlighted ? 'bg-copper-400/20 ring-1 ring-copper-400' : 'hover:bg-paper-100'
      }`}
      onMouseEnter={() => onHover(input)}
      onMouseLeave={() => { if (!isHighlighted) onHover(null); }}
      onClick={() => onClick(input)}
      onDoubleClick={handleDoubleClick}
    >
      <span className="text-bridge-500 truncate max-w-[80px]" title={input.label}>
        {input.label}:
      </span>
      <span className="font-mono text-bridge-700">{displayVal}</span>
    </div>
  );
}
