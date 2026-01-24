# Lynk Implementation Reference

## Key Patterns

### NodeEntry Component
**File:** `src/components/nodes/base/NodeEntry.tsx`

Each row/entry renders both its content AND its handle:

```tsx
interface NodeEntryProps {
  id: string;
  handleType: 'source' | 'target';
  handlePosition: Position;
  children: ReactNode;
  allowMultiple?: boolean;  // For multi-connection handles
  handleColor?: string;     // Data type color
}
```

### Per-Node Handle Layout

| Node | Inputs | Outputs |
|------|--------|---------|
| **FileNode** | None | NodeEntry per region (right) |
| **CalculationNode** | Single "inputs" handle (left, multi) | Single "output" handle (right) |
| **SheetNode** | Entry handles (left, multi) | Entry + Subheader handles (right) |
| **LabelNode** | Single "input" handle (left) | None |

---

## Operation Registry
**File:** `src/core/operations/operationRegistry.ts`

Extensible pattern for calculation operations:

```typescript
interface OperationDefinition {
  id: string;                    // 'sum', 'average', etc.
  label: string;                 // Display name
  category: 'multiple' | 'single';
  compatibleTypes: SimpleDataType[];
  calculate: (inputs, precision) => OperationResult | null;
  minInputs?: number;
  maxInputs?: number;
}
```

**Available Operations:**
- `sum` - Add all inputs
- `average` - Mean of inputs
- `max` - Maximum value (supports dates)
- `min` - Minimum value (supports dates)
- `count` - Count of inputs
- `round` - Round single input to precision

---

## Data Flow Resolution
**File:** `src/hooks/useDataFlow.ts`

The `useDataFlow` hook resolves inputs from connected edges:

```typescript
const { inputs, hasInputs, inputsBySource } = useDataFlow({
  nodeId: id,
  targetHandle: 'inputs',
  acceptedTypes: ['number', 'currency'],  // Optional filter
});
```

Each `ResolvedInput` contains:
- `value` - The actual value
- `numericValue` - Parsed numeric value (or null)
- `label` - Source label
- `dataType` - SimpleDataType
- `sourceNodeId` / `sourceRegionId` - For highlighting
- `edgeId` - For edge management

---

## SheetNode Structure

```typescript
interface SheetNodeData {
  label: string;
  subheaders: SheetSubheader[];
  entryResults?: Record<string, SheetComputedResult | null>;
  subheaderResults?: Record<string, SheetComputedResult | null>;
}

interface SheetSubheader {
  id: string;
  label: string;
  operation: string;  // From registry
  entries: SheetEntry[];
  collapsed?: boolean;
}

interface SheetEntry {
  id: string;
  label: string;
  operation: string;  // From registry
  expanded?: boolean;
}
```

**Handle ID Patterns:**
- Entry input: `entry-in-{subheaderId}-{entryId}`
- Entry output: `entry-out-{subheaderId}-{entryId}`
- Subheader output: `subheader-{subheaderId}`

---

## Highlighting System
**File:** `src/hooks/useHighlighting.ts`

Global highlight state for source region highlighting:

```typescript
const { isHighlighted, setHighlight, clearHighlight, toggleHighlight } = useHighlighting();

// Check if a region is highlighted
isHighlighted(nodeId, regionId);

// Set highlight on hover
setHighlight(nodeId, regionId);

// Toggle persistent highlight on click
toggleHighlight(nodeId, regionId);
```

---

## Run Commands

```bash
npm run dev      # Start dev server on port 5173
npm run build    # Production build
npm run lint     # Run ESLint
```
