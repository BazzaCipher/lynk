# Lynk Architecture Plan

## Overview
Lynk is a web-based visual node canvas application for extracting data from PDFs/images, processing it through calculation nodes, and displaying results in sheets and labels.

## Technology Stack

| Category | Choice | Reason |
|----------|--------|--------|
| Framework | React + TypeScript + Vite | User preference, strong typing |
| Node Canvas | @xyflow/react (React Flow v12) | Industry standard, excellent customization |
| State Management | Zustand | Minimal boilerplate, React Flow integration |
| PDF Rendering | react-pdf (PDF.js wrapper) | Mature, supports text layers |
| OCR | Tesseract.js | Browser-based, no server required |
| Data Tables | TanStack Table | For Sheet node tabular display |
| Validation | Zod | Runtime type checking for canvas state |
| UI | shadcn/ui + Tailwind CSS | Consistent design system |

## Node Types

### Node Categories (`src/types/categories.ts`)

Nodes are divided into two mutually exclusive categories based on data source:

| Category | Nodes | Description |
|----------|-------|-------------|
| **SourceNode** | display, extractor | Entry points - data comes from files (no input handles) |
| **TransformNode** | calculation, sheet, label | Processors - data comes from edges (has input handles) |

### 1. DisplayNode (Source)
- Visual reference for PDFs and images
- NO data extraction, NO output handles
- Supports resizing with aspect lock
- Page navigation for PDFs
- Can convert to ExtractorNode (with edge caching)

### 2. ExtractorNode (Source)
- Data extraction from PDFs and images
- Region selection with bounding boxes (box mode)
- Direct text selection (text mode)
- OCR integration for box selections
- Each region becomes an output handle
- Can convert to DisplayNode (caches edges for restoration)

### 3. CalculationNode (Transform)
- Operations: sum, average, min, max, count
- Multiple inputs → single output
- Configurable precision
- Operation registry for extensibility

### 4. SheetNode (Transform - Hierarchical Aggregator)
- **Subheaders**: Groups that aggregate entry outputs with an operation
- **Entries**: Mini CalculationNodes that accept multiple inputs
- Each entry has input handle (left, multiple) and output handle (right)
- Each subheader has output handle (right) for aggregated result
- Operations: sum, average, min, max, count, round (from registry)
- Expandable entries to see connected inputs

### 5. LabelNode (Transform)
- Single value display
- Formatting options (number, currency, date, string)
- Font size and alignment
- Manual value entry mode

### 6. GroupNode (Visual)
- Visual container for organizing nodes
- Resizable with corner handles
- Optional background color
- No handles (purely organizational)

## Project Structure

```
lynk/
├── src/
│   ├── App.tsx                # Main app component
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── LynkCanvas.tsx     # React Flow canvas wrapper
│   │   │   └── Toolbar.tsx        # Node creation toolbar
│   │   ├── nodes/
│   │   │   ├── base/              # BaseNode, NodeHeader, NodeHandle
│   │   │   ├── file/              # DocumentViewer, RegionSelector, HighlightOverlay
│   │   │   ├── DisplayNode.tsx    # Visual reference node
│   │   │   ├── ExtractorNode.tsx  # Data extraction node
│   │   │   ├── CalculationNode.tsx
│   │   │   ├── SheetNode.tsx
│   │   │   ├── LabelNode.tsx
│   │   │   ├── GroupNode.tsx
│   │   │   └── index.ts           # Node type registry
│   │   └── ui/                    # Modal, CollapsiblePanel, etc.
│   ├── core/
│   │   ├── extraction/            # OcrExtractor
│   │   └── calculations/          # Operation registry
│   ├── store/
│   │   ├── canvasStore.ts         # Zustand store for canvas state
│   │   └── canvasPersistence.ts   # BlobRegistry, export/import
│   ├── hooks/
│   │   ├── useDataFlow.ts         # Data propagation through graph
│   │   └── useLocalStorageSync.ts # Auto-save functionality
│   ├── types/
│   │   ├── index.ts               # Re-exports all types
│   │   ├── nodes.ts               # Node data interfaces
│   │   ├── categories.ts          # SourceNode/TransformNode classes
│   │   ├── view.ts                # DocumentView, ViewTarget, ViewRect
│   │   ├── data.ts                # DataValue, SimpleDataType
│   │   ├── regions.ts             # ExtractedRegion, TextRange
│   │   └── geometry.ts            # RegionCoordinates, DataSourceReference
│   ├── schemas/                   # Zod validation schemas
│   └── utils/                     # formatValue, parseNumericValue, colors
├── plans/
│   ├── architecture.md            # This file
│   └── progress.md                # Development progress tracker
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Core Data Types

### Document View System (`src/types/view.ts`)

```typescript
// Rectangular viewport into a document (normalized 0-1 coordinates)
interface ViewRect {
  x: number;      // Left offset (0 = left edge, 1 = right edge)
  y: number;      // Top offset (0 = top edge, 1 = bottom edge)
  width: number;  // Viewport width (1 = full width)
  height: number; // Viewport height (1 = full height)
}

// What part of the document we're viewing
type ViewTarget =
  | { type: 'page'; pageNumber: number }      // PDF page
  | { type: 'image' }                         // Full image
  | { type: 'sheet'; sheetName: string }      // Excel sheet (future)
  | { type: 'slide'; slideNumber: number }    // Slides (future)
  | { type: 'range'; sheet: string; range: string }; // Excel range (future)

// Complete document view configuration
interface DocumentView {
  viewport: ViewRect;
  target: ViewTarget;
  nodeSize: { width: number; height: number };
  aspectLocked: boolean;
}
```

### Data Value System

```typescript
// Simple data types for region values
type SimpleDataType = 'number' | 'currency' | 'date' | 'string';

// Data value with source tracking
interface DataValue {
  type: SimpleDataType;
  value: number | string | Date;
  source?: DataSourceReference;
}

// Source tracking for highlighting
interface DataSourceReference {
  nodeId: string;
  regionId: string;
  pageNumber?: number;
  coordinates?: RegionCoordinates;
  extractionMethod: 'manual' | 'ocr' | 'ai';
  confidence?: number;
}

// Region in an extractor node
interface ExtractedRegion {
  id: string;
  label: string;
  selectionType: 'box' | 'text';
  coordinates?: RegionCoordinates;  // For box selection
  textRange?: TextRange;            // For text selection
  pageNumber: number;
  extractedData: DataValue;
  dataType: SimpleDataType;
  color: string;
}
```

## Data Flow Architecture

```
ExtractorNode ──[region]──→ CalculationNode ──[result]──→ LabelNode
    │                            │
    │                            ↓
    └──[region]──→ SheetNode (entry) ──[entry-out]──→ CalculationNode
                       │
                       └──[subheader]──→ LabelNode
```

### DisplayNode ↔ ExtractorNode Conversion

When switching between Display and Extractor modes, edges are cached:

```typescript
// Cached when converting ExtractorNode → DisplayNode
interface CachedExtractorEdges {
  edges: Array<{
    id: string;
    target: string;
    targetHandle?: string;
    sourceHandle: string;
  }>;
  regions: ExtractedRegion[];
  cachedAt: string;
}
```

### Sheet Node Handle Patterns

| Handle | Type | Pattern | Purpose |
|--------|------|---------|---------|
| Entry Input | target | `entry-in-{subheaderId}-{entryId}` | Receives multiple values |
| Entry Output | source | `entry-out-{subheaderId}-{entryId}` | Entry's aggregated result |
| Subheader Output | source | `subheader-{subheaderId}` | Subheader's aggregated result |

## Persistence & Storage

### File Export (`.lynk.json`)

```json
{
  "version": "1.0.0",
  "metadata": { "id", "name", "createdAt", "updatedAt" },
  "nodes": [...],
  "edges": [...],
  "viewport": { "x", "y", "zoom" },
  "embeddedFiles": {
    "fileId": {
      "filename": "document.pdf",
      "mimeType": "application/pdf",
      "data": "<base64-encoded-file-content>"
    }
  }
}
```

### LocalStorage Auto-Save

```
lynk:canvas:current      - Current working canvas state
lynk:canvas:backup       - Previous state (for recovery)
lynk:settings            - User preferences
lynk:recent-files        - List of recently opened files
```

### BlobRegistry Pattern

```typescript
// In-memory registry for blob URLs
class BlobRegistry {
  static register(file: File): { fileId: string; blobUrl: string }
  static get(fileId: string): { file: File; blobUrl: string } | null
  static registerFromBase64(data: string, filename: string, mimeType: string): { fileId: string; blobUrl: string }
}
```

## Implementation Phases

### Phase 1-4: Foundation & Core Nodes ✅
- React + TypeScript + Vite setup
- React Flow canvas with Zustand state
- PDF/Image viewing with region selection
- OCR integration with Tesseract.js
- CalculationNode, SheetNode, LabelNode

### Phase 5: Persistence ✅
- LocalStorage auto-save with debounce
- Complete export with embedded files
- Import with file extraction
- Session recovery

### Phase 6-6.5: Architecture Refactor ✅
- Split FileNode → DisplayNode + ExtractorNode
- Merged ImageNode into Display/Extractor
- Categories system (SourceNode/TransformNode)
- DocumentView viewport abstraction
- GroupNode for visual organization

### Phase 7: Polish & UX 🔄
- Edge deletion (Delete key)
- Keyboard shortcuts (Delete, Escape, Ctrl+S)
- Error boundaries for nodes
- Connection validation feedback
- Performance optimizations

### Phase 8: Testing ❌
- Unit tests for utilities
- Integration tests for data flow
- E2E tests for workflows

## Environment

- **Node.js**: v24 (via nvm)
- **npm**: v11.6.2

## Run Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Run ESLint
npm run test     # Run tests (once configured)
```
