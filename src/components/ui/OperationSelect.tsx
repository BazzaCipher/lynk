/**
 * OperationSelect Component
 *
 * Unified operation selector with two variants:
 * - 'dropdown': Styled dropdown with category subheaders (for CalculationNode)
 * - 'compact': Native select element (for SheetNode entries/subheaders)
 */

import { useState, useRef, useEffect } from 'react';
import {
  getOperation,
  getOperationsByCategory,
  OPERATIONS,
  CATEGORY_LABELS,
} from '../../core/operations/operationRegistry';

export interface OperationSelectProps {
  /** Current operation ID */
  value: string;
  /** Callback when operation changes */
  onChange: (operationId: string) => void;
  /** Variant style */
  variant?: 'dropdown' | 'compact';
  /** Show category headers (only for dropdown variant) */
  showCategories?: boolean;
  /** Disable the selector */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Operation selector with dropdown or compact native select variants.
 */
export function OperationSelect({
  value,
  onChange,
  variant = 'dropdown',
  showCategories = true,
  disabled = false,
  className = '',
}: OperationSelectProps) {
  if (variant === 'compact') {
    return (
      <CompactSelect
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={className}
      />
    );
  }

  return (
    <DropdownSelect
      value={value}
      onChange={onChange}
      showCategories={showCategories}
      disabled={disabled}
      className={className}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPACT VARIANT (Native Select)
// ═══════════════════════════════════════════════════════════════════════════════

interface CompactSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

function CompactSelect({ value, onChange, disabled, className }: CompactSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`text-xs bg-paper-100 border border-paper-200 rounded px-1 py-0.5
                  disabled:opacity-50 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {OPERATIONS.map((op) => (
        <option key={op.id} value={op.id}>
          {op.label}
        </option>
      ))}
    </select>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DROPDOWN VARIANT (Styled with Categories)
// ═══════════════════════════════════════════════════════════════════════════════

interface DropdownSelectProps {
  value: string;
  onChange: (value: string) => void;
  showCategories: boolean;
  disabled?: boolean;
  className?: string;
}

function DropdownSelect({
  value,
  onChange,
  showCategories,
  disabled,
  className,
}: DropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const operationsByCategory = getOperationsByCategory();
  const current = getOperation(value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (operationId: string) => {
    onChange(operationId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-2 py-1 text-xs font-medium bg-paper-100
                   hover:bg-paper-200 rounded transition-colors disabled:opacity-50
                   min-w-[70px] justify-between"
      >
        <span>{current?.label || value}</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-44 bg-white rounded-lg shadow-lg
                      border border-paper-200 z-50 overflow-hidden"
        >
          {showCategories ? (
            // Grouped by category
            Object.entries(operationsByCategory).map(([category, ops]) => (
              <div key={category}>
                <div
                  className="px-3 py-1.5 text-xs font-semibold text-bridge-500 bg-paper-50
                              border-b border-paper-100 uppercase tracking-wide"
                >
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                </div>
                {ops.map((op) => (
                  <OperationOption
                    key={op.id}
                    operation={op}
                    isSelected={op.id === value}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            ))
          ) : (
            // Flat list without categories
            OPERATIONS.map((op) => (
              <OperationOption
                key={op.id}
                operation={op}
                isSelected={op.id === value}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface OperationOptionProps {
  operation: { id: string; label: string; description: string };
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function OperationOption({ operation, isSelected, onSelect }: OperationOptionProps) {
  return (
    <button
      onClick={() => onSelect(operation.id)}
      className={`w-full px-3 py-2 text-left text-sm hover:bg-copper-400/10
                  transition-colors flex items-center justify-between
                  ${isSelected ? 'bg-copper-400/20 text-copper-600' : ''}`}
      title={operation.description}
    >
      <span>{operation.label}</span>
      {isSelected && (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
}
