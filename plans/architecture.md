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

### 3. Sheet Node (Sink)
- Tabular display with configurable columns
- Subheaders per column
- Per-column aggregation (default: sum)
- TanStack Table for rendering

### 4. Label Node (Sink)
- Single value display
- Formatting options (number, currency, date, text)
- Font size and alignment

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
    └──[region]──────→ Sheet Node (columns)
```

- **DataFlowEngine**: Manages data propagation through the graph
- **DependencyGraph**: Tracks node connections, prevents cycles
- When a source node changes, downstream nodes recalculate automatically

## Persistence

- Save canvas to `.lynk.json` files
- Zod validation on load/save
- Structure:
  ```json
  {
    "version": "1.0.0",
    "metadata": { "id", "name", "createdAt", "updatedAt" },
    "nodes": [...],
    "edges": [...],
    "viewport": { "x", "y", "zoom" }
  }
  ```

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

### Phase 4: Integration & Polish
- [ ] Wire up data flow between all node types
- [ ] Implement save/load to JSON files
- [ ] Add source highlighting (click label → highlight source region)
- [ ] Error handling and validation UI
- [ ] Testing

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
