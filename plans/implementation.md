# Lynk Implementation Plan

## Phase 1 Status: COMPLETE
- Project initialized with Vite + React + TypeScript
- All dependencies installed
- Zustand canvas store created
- LynkCanvas with React Flow working
- BaseNode + placeholder node components created
- Build and dev server verified

---

## Handle Positioning Architecture

**Decision**: NodeEntry pattern - each entry component manages its own handle.

### NodeEntry Component
**File:** `src/components/nodes/base/NodeEntry.tsx`

A reusable component where each row/entry renders both its content AND its handle:

```tsx
interface NodeEntryProps {
  id: string;
  handleType: 'source' | 'target';
  handlePosition: Position;
  children: ReactNode;
}

function NodeEntry({ id, handleType, handlePosition, children }: NodeEntryProps) {
  return (
    <div className="relative flex items-center min-h-8 px-2">
      {children}
      <Handle
        type={handleType}
        position={handlePosition}
        id={id}
        style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)' }}
      />
    </div>
  );
}
```

### Benefits
- **Self-contained**: Each entry manages its own handle position
- **Flexible**: Rows can vary in height; handles stay aligned to their content
- **Reusable**: Same pattern for FileNode regions, SheetNode columns, CalculationNode inputs
- **React-idiomatic**: Composition over imperative calculation

### Usage Pattern

```tsx
// In FileNode
{data.regions.map(region => (
  <NodeEntry key={region.id} id={region.id} handleType="source" handlePosition={Position.Right}>
    <ColorDot color={region.color} />
    <span>{region.label}: {region.value}</span>
  </NodeEntry>
))}

// In SheetNode
{data.columns.map(col => (
  <NodeEntry key={col.id} id={col.id} handleType="target" handlePosition={Position.Left}>
    <span>{col.header}</span>
  </NodeEntry>
))}
```

### Per-Node Handle Layout

| Node | Inputs | Outputs |
|------|--------|---------|
| **FileNode** | None | NodeEntry per region (right side) |
| **CalculationNode** | NodeEntry per input (left) | Single centered handle (right) |
| **SheetNode** | NodeEntry per column (left/top) | None |
| **LabelNode** | Single centered handle (left) | None |

---

## Phase 2: File Node Implementation - COMPLETE

### Overview
Build the FileNode to render PDFs/images, allow region selection, and extract data via OCR.

### Completed Tasks

#### 1. PDF/Image Viewer Component
**File:** `src/components/nodes/file/DocumentViewer.tsx`
- Render PDF pages using `react-pdf`
- Render images using `<img>` tag
- Page navigation for multi-page PDFs

#### 2. Region Selection Overlay
**File:** `src/components/nodes/file/RegionSelector.tsx`
- Canvas overlay for drawing selection rectangles
- Mouse events: mousedown → drag → mouseup to create region
- Store coordinates relative to document
- Visual feedback: colored rectangle with label

#### 3. Region List Panel
**File:** `src/components/nodes/file/RegionList.tsx`
- List of all extracted regions
- Each row shows: color indicator, label, extracted value
- Edit/delete region buttons
- Dynamic handles: One output handle per region

#### 4. OCR Integration
**File:** `src/core/extraction/ocrExtractor.ts`
- Tesseract.js worker initialization
- Crop document to region coordinates
- Extract text and parse to detect type (number/date/text)
- Return DataValue with confidence score

#### 5. FileNode Component
**File:** `src/components/nodes/FileNode.tsx`
- Compose: DocumentViewer + RegionSelector + RegionList
- Manage regions in node data
- File drop zone for loading documents

---

## Phase 2.5: Modal Document Viewer - COMPLETE

### Goal
Move the document preview from inline in the node to a modal popup for better UX.

### Completed Tasks
- [x] Create Modal component (`src/components/ui/Modal.tsx`)
- [x] Create CollapsiblePanel component (`src/components/ui/CollapsiblePanel.tsx`)
- [x] Update FileNode to show thumbnail/filename instead of full preview
- [x] Open modal on click to view full document with region selection
- [x] Collapsible highlights panel on right side of modal
- [x] Text selection mode (in addition to box selection)
- [x] Simple datatypes for highlights (string, number, currency, date, boolean)

### New Features
- **Selection Modes**: Toggle between Box (for OCR regions) and Text (direct text selection)
- **Collapsible Panel**: Highlights list on right side, can collapse to save space
- **Simple Datatypes**: Each highlight can be assigned a data type
- **Text Highlights**: Select text directly from PDFs (uses react-pdf text layer)

---

## Phase 3: Processing & Display Nodes

### CalculationNode
- Wire up actual calculation logic when inputs connect
- Support operations: sum, average, min, max, count
- Recalculate when inputs change

### SheetNode
- Integrate TanStack Table for proper tabular display
- Populate columns from connected FileNode regions
- Per-column aggregation functions

### LabelNode
- Format values based on type (number, currency, date)
- Apply font size and alignment settings

---

## Phase 4: Data Flow Engine

### DataFlowEngine
**File:** `src/core/engine/DataFlowEngine.ts`

- Listen to edge connections/disconnections
- Propagate data from source nodes to target nodes
- Build dependency graph to determine update order
- Prevent circular dependencies

### Integration
- When FileNode region data changes → push to connected nodes
- When CalculationNode inputs change → recalculate and push result
- Sheet/Label nodes update their display when receiving data

---

## Run Commands
```bash
source ~/.nvm/nvm.sh && npm run dev    # Start dev server
npm run build                           # Verify TypeScript compiles
```
