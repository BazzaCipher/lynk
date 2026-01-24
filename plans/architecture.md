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

### 1. File Node (Source)
- Renders PDFs and images
- Region selection with bounding boxes
- Manual selection + OCR extraction
- Each region becomes an output handle
- Tracks source coordinates for highlighting

### 2. Calculation Node (Processor)
- Operations: sum, average, min, max, count
- Multiple inputs → single output
- Configurable precision

### 3. Sheet Node (Hierarchical Aggregator)
- **Subheaders**: Groups that aggregate entry outputs with an operation
- **Entries**: Mini CalculationNodes that accept multiple inputs
- Each entry has input handle (left, multiple) and output handle (right)
- Each subheader has output handle (right) for aggregated result
- Operations: sum, average, min, max, count, round (from registry)
- Expandable entries to see connected inputs

### 4. Label Node (Sink)
- Single value display
- Formatting options (number, currency, date, text)
- Font size and alignment

### 5. Image Node (Visual)
- Standalone image display (PNG, JPG, GIF, WebP)
- NOT a FileNode - no region extraction, just visual reference
- Supports drag-and-drop upload or file picker
- Resizable within canvas
- No input/output handles (purely decorative/reference)
- Stores image as base64 data URL for persistence
- Use case: Screenshots, diagrams, reference images alongside data extraction work

## Project Structure

```
lynk/
├── src/
│   ├── app/                    # App shell, providers
│   ├── components/
│   │   ├── canvas/             # LynkCanvas, controls, toolbar
│   │   ├── nodes/
│   │   │   ├── base/           # BaseNode, NodeHeader, NodeHandle
│   │   │   ├── file/           # FileNode, PdfViewer, ImageViewer, RegionSelector
│   │   │   ├── calculation/    # CalculationNode
│   │   │   ├── sheet/          # SheetNode, SheetTable
│   │   │   └── label/          # LabelNode
│   │   ├── edges/              # DataEdge
│   │   └── ui/                 # Shared UI components
│   ├── core/
│   │   ├── engine/             # DataFlowEngine, DependencyGraph
│   │   ├── extraction/         # ExtractionService, OcrExtractor
│   │   └── calculations/       # CalculationEngine, operations
│   ├── store/                  # Zustand stores (canvas, selection, ui)
│   ├── hooks/                  # useDataFlow, useOcr, useCanvasPersistence
│   ├── types/                  # TypeScript interfaces
│   └── schemas/                # Zod validation schemas
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Core Data Types

```typescript
// Data value with source tracking
interface DataValue {
  type: 'number' | 'text' | 'date' | 'array' | 'table';
  value: number | string | Date | DataValue[];
  source?: DataSourceReference;  // Links back to file region
}

// Source tracking for highlighting
interface DataSourceReference {
  nodeId: string;
  regionId: string;
  pageNumber?: number;
  coordinates: RegionCoordinates;
  extractionMethod: 'manual' | 'ocr' | 'ai';
  confidence?: number;
}

// Region in a file node
interface ExtractedRegion {
  id: string;
  label: string;
  coordinates: RegionCoordinates;
  pageNumber: number;
  extractedData: DataValue;
  color: string;
}
```

## Data Flow Architecture

```
File Node ──[region]──→ Calculation Node ──[result]──→ Label Node
    │                         │
    │                         ↓
    └──[region]──→ Sheet Node (entry) ──[entry-out]──→ Calculation Node
                       │
                       └──[subheader]──→ Label Node
```

### Sheet Node Handle Patterns
| Handle | Type | Pattern | Purpose |
|--------|------|---------|---------|
| Entry Input | target | `entry-in-{subheaderId}-{entryId}` | Receives multiple values |
| Entry Output | source | `entry-out-{subheaderId}-{entryId}` | Entry's aggregated result |
| Subheader Output | source | `subheader-{subheaderId}` | Subheader's aggregated result |

- **DataFlowEngine**: Manages data propagation through the graph
- **DependencyGraph**: Tracks node connections, prevents cycles
- When a source node changes, downstream nodes recalculate automatically

## Persistence & Storage

### File Export (`.lynk.json`)
- Save canvas to `.lynk.json` files
- Zod validation on load/save
- **Complete export** - File contains everything needed for full restore
- Structure:
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
    },
    "embeddedImages": {
      "imageId": {
        "filename": "screenshot.png",
        "mimeType": "image/png",
        "data": "<base64-data-url>"
      }
    }
  }
  ```

### Export Data Validation
- **Pre-export checks**: Validate all required data is present before export
- **File embedding**: All PDFs/images embedded as base64 (no external references)
- **Integrity verification**: Hash check to detect corruption
- **Schema validation**: Zod validates structure on both save and load
- **Missing data warnings**: Alert user if any nodes reference missing files

### LocalStorage Auto-Save
- **Auto-save interval**: Save to localStorage every 30 seconds (configurable)
- **Save on change**: Debounced save on any node/edge modification
- **Key structure**: `lynk:canvas:{canvasId}` for canvas data
- **Session recovery**: On app load, check for unsaved work in localStorage
- **Storage quota handling**: Warn user if localStorage is near capacity
- **Clear on explicit save**: Clear localStorage draft when user saves to file

### LocalStorage Keys
```
lynk:canvas:current      - Current working canvas state
lynk:canvas:backup       - Previous state (for recovery)
lynk:settings            - User preferences
lynk:recent-files        - List of recently opened files
```

### Import Process
1. Read and parse JSON file
2. Validate with Zod schema
3. Extract embedded files to memory/blob URLs
4. Restore nodes with proper file references
5. Restore edges and viewport
6. Verify all connections are valid
7. Display any warnings (missing data, schema migrations)

## Environment

- **Node.js**: v24 (via nvm)
- **npm**: v11.6.2

## Implementation Phases

### Phase 1: Foundation
- [x] Initialize Vite + React + TypeScript project
- [x] Install dependencies (@xyflow/react, zustand, tailwindcss, etc.)
- [x] Set up Zustand canvas store
- [x] Create LynkCanvas component with React Flow
- [x] Implement BaseNode component pattern

**Status**: COMPLETE

### Phase 2: File Node
- [x] Integrate react-pdf for PDF rendering
- [x] Build image viewer component
- [x] Implement region selection overlay (canvas-based)
- [x] Integrate Tesseract.js for OCR
- [x] Create dynamic output handles per region
- [x] Modal-based document viewer with collapsible side panel
- [x] Text selection mode (direct text highlighting)
- [x] Simple datatypes for highlights

**Status**: COMPLETE

### Phase 3: Processing & Display Nodes
- [x] Implement CalculationNode with operations
- [x] Build DataFlowEngine for propagation
- [x] Implement SheetNode with TanStack Table
- [x] Implement LabelNode with formatting

**Status**: COMPLETE

### Phase 4: Processing Nodes - COMPLETE
- [x] CalculationNode with operation registry
- [x] SheetNode hierarchical aggregator (entries + subheaders)
- [x] LabelNode with formatting
- [x] Data flow resolution between all node types
- [x] Save/load to JSON files with Zod validation
- [x] Source highlighting (hover/click to highlight source regions)

### Phase 5: Persistence & Storage - NOT STARTED
- [ ] Embed files as base64 in export
- [ ] LocalStorage auto-save (30s interval + debounced on change)
- [ ] Session recovery from localStorage on app load
- [ ] Export data validation (pre-export checks)
- [ ] Import with embedded file extraction
- [ ] Storage quota warnings

### Phase 6: Image Node - NOT STARTED
- [ ] Create ImageNode component (no handles, display only)
- [ ] Drag-and-drop image upload
- [ ] File picker for images
- [ ] Resize controls
- [ ] Store as base64 for persistence

### Phase 7: Polish & UX - IN PROGRESS
- [ ] Edge deletion UI
- [ ] Error boundaries for nodes
- [ ] Keyboard shortcuts
- [ ] Performance optimizations

### Phase 8: Testing
- [ ] Unit tests for utilities and hooks
- [ ] Integration tests for data flow
- [ ] E2E tests for user workflows

## Key Implementation Details

### Region Selection
- Canvas overlay on PDF/image viewer
- Draw rectangles to select regions
- Store coordinates relative to document (not screen)
- Transform coordinates when zooming/panning

### OCR Integration
- Tesseract.js worker initialized on mount
- Crop image to region before OCR
- Parse result to detect data type (number/date/text)
- Store confidence score for display

### Source Highlighting
- Every DataValue tracks its source region
- When hovering/clicking a value in Sheet/Label, highlight source
- Use the stored coordinates to draw highlight box on File Node

### Extensibility
- Node registry pattern for adding new node types
- Each node type defines: component, category, default data, ports
- New nodes just register with the registry

## Verification Plan

1. **Create a test PDF** with numbers in known locations
2. **Add File Node** → load PDF → verify rendering
3. **Draw regions** → verify coordinates are captured
4. **Run OCR** → verify text extraction
5. **Connect to Calculation Node** → verify sum/avg/etc work
6. **Connect to Sheet Node** → verify data displays in table
7. **Connect to Label Node** → verify single value display
8. **Save canvas** → reload → verify state restored
9. **Click value in Sheet** → verify source region highlights in File Node

---

## Run Commands
```bash
source ~/.nvm/nvm.sh && npm run dev    # Start dev server
npm run build                           # Verify TypeScript compiles
```
