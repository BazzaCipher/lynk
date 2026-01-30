/**
 * useEditableLabel Hook
 *
 * Reusable hook for inline label editing functionality.
 * Consolidates identical label editing logic from:
 * - CalculationNode.tsx
 * - LabelNode.tsx
 * - SheetNode.tsx (EntryRow and SubheaderRow)
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseEditableLabelOptions {
  /** Initial value to display and edit */
  initialValue: string;
  /** Callback when save is confirmed */
  onSave: (value: string) => void;
  /** Whether empty values should revert to initial (default: true) */
  revertOnEmpty?: boolean;
}

export interface UseEditableLabelResult {
  /** Whether currently in edit mode */
  isEditing: boolean;
  /** Current value in the input */
  value: string;
  /** Ref to attach to the input element for auto-focus */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Start editing mode */
  startEditing: (e?: React.MouseEvent) => void;
  /** Update the current value */
  setValue: (value: string) => void;
  /** Save and exit edit mode */
  handleSave: () => void;
  /** Handle keyboard events (Enter to save, Escape to cancel) */
  handleKeyDown: (e: React.KeyboardEvent) => void;
  /** Handle blur (saves by default) */
  handleBlur: () => void;
  /** Cancel editing and revert to initial value */
  cancel: () => void;
}

/**
 * Hook for managing inline label editing state and handlers.
 * Provides unified API for editable labels across all node components.
 *
 * @example
 * ```tsx
 * const {
 *   isEditing,
 *   value,
 *   inputRef,
 *   startEditing,
 *   setValue,
 *   handleKeyDown,
 *   handleBlur,
 * } = useEditableLabel({
 *   initialValue: data.label,
 *   onSave: (newLabel) => updateNodeData(id, { label: newLabel }),
 * });
 *
 * return isEditing ? (
 *   <input
 *     ref={inputRef}
 *     value={value}
 *     onChange={(e) => setValue(e.target.value)}
 *     onKeyDown={handleKeyDown}
 *     onBlur={handleBlur}
 *   />
 * ) : (
 *   <span onDoubleClick={startEditing}>{data.label}</span>
 * );
 * ```
 */
export function useEditableLabel({
  initialValue,
  onSave,
  revertOnEmpty = true,
}: UseEditableLabelOptions): UseEditableLabelResult {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync value when initialValue changes (e.g., from external updates)
  useEffect(() => {
    if (!isEditing) {
      setValue(initialValue);
    }
  }, [initialValue, isEditing]);

  // Auto-focus and select when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setValue(initialValue);
    setIsEditing(true);
  }, [initialValue]);

  const handleSave = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed) {
      onSave(trimmed);
    } else if (revertOnEmpty) {
      setValue(initialValue);
    }
    setIsEditing(false);
  }, [value, onSave, revertOnEmpty, initialValue]);

  const cancel = useCallback(() => {
    setValue(initialValue);
    setIsEditing(false);
  }, [initialValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      cancel();
    }
    e.stopPropagation();
  }, [handleSave, cancel]);

  const handleBlur = useCallback(() => {
    handleSave();
  }, [handleSave]);

  return {
    isEditing,
    value,
    inputRef,
    startEditing,
    setValue,
    handleSave,
    handleKeyDown,
    handleBlur,
    cancel,
  };
}
