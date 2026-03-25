/**
 * EditableLabel Component
 *
 * Reusable inline-editable label that wraps useEditableLabel hook.
 * Eliminates duplicated JSX across CalculationNode, LabelNode, SheetNode.
 */

import { useEditableLabel } from '../../../hooks/useEditableLabel';

export interface EditableLabelProps {
  /** Current label value */
  value: string;
  /** Called when label is saved */
  onSave: (newValue: string) => void;
  /** Visual variant - 'header' for node titles, 'inline' for row labels */
  variant?: 'header' | 'inline';
  /** Additional className for the container */
  className?: string;
}

/**
 * Inline-editable label component.
 * Double-click to edit, Enter to save, Escape to cancel.
 */
export function EditableLabel({
  value,
  onSave,
  variant = 'inline',
  className = '',
}: EditableLabelProps) {
  const {
    isEditing,
    value: editValue,
    inputRef,
    startEditing,
    setValue,
    handleKeyDown,
    handleBlur,
  } = useEditableLabel({ initialValue: value, onSave });

  // Variant-specific styles
  const inputStyles = variant === 'header'
    ? 'text-xs font-medium w-full px-1 py-0.5 border border-copper-400 rounded min-w-0 outline-none'
    : 'flex-1 text-xs px-1 py-0.5 border border-copper-400 rounded min-w-0 outline-none';

  const displayStyles = variant === 'header'
    ? 'text-xs font-medium text-bridge-700 truncate cursor-pointer hover:text-copper-500'
    : 'flex-1 text-xs text-bridge-700 truncate cursor-pointer hover:text-copper-500';

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`${inputStyles} ${className}`}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className={`${displayStyles} ${className}`}
      onDoubleClick={startEditing}
      title={`${value} (double-click to edit)`}
    >
      {value}
    </span>
  );
}
