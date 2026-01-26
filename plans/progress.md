# Lynk Development Progress

## Current Status Summary

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Foundation | ✅ Complete | Vite + React + TypeScript, React Flow, Zustand |
| Phase 2: File Node | ✅ Complete | PDF/Image viewer, region selection, OCR, text highlights |
| Phase 2.5: Modal Viewer | ✅ Complete | Modal-based document viewer, collapsible panel |
| Phase 3: Code Refactoring | ✅ Complete | Utilities, hooks, type consolidation |
| Phase 4: Processing Nodes | ✅ Complete | CalculationNode, SheetNode (hierarchical), LabelNode |
| Phase 5: Persistence & Storage | ✅ Complete | LocalStorage, complete export/import, embedded files |
| Phase 6: Display/Extractor Split | ✅ Complete | Replaced FileNode+ImageNode with DisplayNode+ExtractorNode |
| Phase 6.5: Architecture Refactor | ✅ Complete | Categories system, DocumentView abstraction, GroupNode |
| Phase 7: Polish & UX | 🔄 In Progress | See below |
| Phase 8: Testing & Docs | ❌ Not Started | Unit tests, integration tests |

---

## Current Architecture

### Node Types

| Node | Purpose | Handles | Category |
|------|---------|---------|----------|
| **DisplayNode** | Visual reference for PDFs/images (read-only) | None | Source |
| **ExtractorNode** | Data extraction with OCR/region selection | Output per region | Source |
| **CalculationNode** | Math operations (sum, avg, min, max, count) | Multi-input, single output | Transform |
| **SheetNode** | Hierarchical aggregation (entries + subheaders) | Entry inputs, entry/subheader outputs | Transform |
| **LabelNode** | Formatted value display | Single input | Transform |
| **GroupNode** | Visual container for organizing nodes | None | N/A |

### Type System

**`src/types/categories.ts`** - Node classification:
- `SourceNode`: display, extractor (brings data in from files)
- `TransformNode`: calculation, sheet, label (processes data from edges)

**`src/types/view.ts`** - Document viewport system:
- `DocumentView`: Flexible viewport for PDFs, images, future sheets/slides
- `ViewTarget`: Page, image, sheet, slide, range targets
- `ViewRect`: Normalized coordinates (0-1) for viewport regions

### Key Architectural Changes (Jan 27, 2025)

| Before | After |
|--------|-------|
| `FileNode.tsx` (combined) | Split into `DisplayNode.tsx` + `ExtractorNode.tsx` |
| `ImageNode.tsx` (separate) | Merged into Display/Extractor nodes (handle both PDF and images) |
| No categories | `categories.ts` with SourceNode/TransformNode classes |
| Basic page tracking | `view.ts` with DocumentView abstraction |
| No grouping | `GroupNode.tsx` for visual organization |

---

## Completed Work

### Phase 6 + 6.5: Architecture Refactor (Jan 27, 2025)

Completely restructured node system for better separation of concerns:

**DisplayNode** (`src/components/nodes/DisplayNode.tsx`):
- Visual reference only, no data extraction
- Supports PDF and images
- Resizable with aspect lock
- Page navigation for PDFs
- Converts to ExtractorNode with edge caching

**ExtractorNode** (`src/components/nodes/ExtractorNode.tsx`):
- Data extraction with regions and OCR
- Box selection and text selection modes
- Output handles per region
- Converts to DisplayNode with edge caching

**GroupNode** (`src/components/nodes/GroupNode.tsx`):
- Visual container for organizing nodes
- Resizable with NodeResizer
- No handles, purely organizational

**Files Added/Modified:**
- `src/components/nodes/DisplayNode.tsx` - New visual reference node
- `src/components/nodes/ExtractorNode.tsx` - Refactored from FileNode
- `src/components/nodes/GroupNode.tsx` - New grouping node
- `src/types/categories.ts` - SourceNode/TransformNode classes
- `src/types/view.ts` - DocumentView, ViewTarget, ViewRect types
- `src/types/nodes.ts` - Updated all node data types
- `src/components/nodes/index.ts` - Updated exports

### Phase 4: SheetNode Hierarchical Restructure (Jan 25, 2025)

Completely rewrote SheetNode from simple table display to hierarchical data aggregator:

**New Structure:**
```
SheetNode
├── Subheader: "Assets" (operation: sum) → output handle
│   ├── Entry: "Cash" (op: sum) [expandable] → output handle
│   │   └── [expanded: shows connected inputs]
│   ├── Entry: "Investments" (op: sum) → output handle
│   └── Entry: "Property" (op: max) → output handle
└── Subheader: "Liabilities" (operation: sum) → output handle
    └── ...
```

**Handle Patterns:**
| Element | Handle Type | Handle ID Pattern |
|---------|-------------|-------------------|
| Entry input | target | `entry-in-{subheaderId}-{entryId}` |
| Entry output | source | `entry-out-{subheaderId}-{entryId}` |
| Subheader output | source | `subheader-{subheaderId}` |

---

## Phase 5: Persistence & Storage (COMPLETE)

### 5.1 LocalStorage Auto-Save

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| Debounced save on change | High | ✅ | Save to localStorage when nodes/edges change |
| Auto-save interval (30s) | High | ✅ | Periodic background save |
| Session recovery prompt | High | ✅ | On load, detect unsaved work and offer to restore |
| Storage quota monitoring | Medium | ✅ | Warn user when near localStorage limit |
| Clear draft on file save | Medium | ✅ | Remove localStorage draft when user saves to file |

### 5.2 Complete Export (Everything Included)

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| Embed PDFs as base64 | High | ✅ | Store file content in export JSON |
| Embed images as base64 | High | ✅ | Store images in export |
| Pre-export validation | High | ✅ | Check all data present before export |
| Missing data warnings | Medium | ✅ | Alert user if nodes reference missing files |
| Export size estimation | Low | ❌ | Show estimated file size before save |

### 5.3 Complete Import (Full Restore)

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| Extract embedded files | High | ✅ | Convert base64 back to blob URLs |
| Restore node file references | High | ✅ | Link nodes to extracted files |
| Schema migration support | Medium | ❌ | Handle older file versions |
| Import validation | High | ✅ | Verify all connections valid after load |
| Import error reporting | Medium | ✅ | User-friendly error messages on failure |

### 5.4 Storage Keys & Structure

```
LocalStorage Keys:
├── lynk:canvas:current     - Current working canvas state
├── lynk:canvas:backup      - Previous state (for recovery)
├── lynk:settings           - User preferences (auto-save interval, etc.)
└── lynk:recent-files       - List of recently opened files
```

---

## Phase 7: Polish & UX (Current)

### 7.1 Edge Management

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| Edge deletion UI | High | ✅ | Select + Delete key |
| Connection validation feedback | Medium | ❌ | Visual feedback for invalid connections |

### 7.2 Keyboard Shortcuts

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| Delete key for nodes/edges | High | ✅ | Delete selected elements |
| Escape to deselect | High | ✅ | Clear selection |
| Ctrl+S to save | High | ✅ | Trigger save action |
| Ctrl+Z for undo | Low | ❌ | Requires undo stack |

### 7.3 Error Handling

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| Error boundaries for nodes | High | ✅ | Prevent single node crash from breaking canvas |
| OCR error display | Medium | ❌ | Show OCR failures in UI |
| Invalid edge handling | Medium | ❌ | Graceful handling of broken connections |

### 7.4 Performance

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| Large file handling | Medium | ❌ | Progress indicator for big PDFs |
| Memoization audit | Low | ❌ | Prevent unnecessary re-renders |

---

## Phase 8: Testing & Documentation

### 8.1 Unit Tests

| Component | Priority | Status |
|-----------|----------|--------|
| Operation registry | High | ❌ |
| formatValue utility | High | ❌ |
| parseNumericValue | High | ❌ |
| Category classification | High | ❌ |
| DocumentView helpers | Medium | ❌ |
| Zod schemas | Medium | ❌ |

### 8.2 Integration Tests

| Scenario | Priority | Status |
|----------|----------|--------|
| ExtractorNode → CalculationNode data flow | High | ❌ |
| ExtractorNode → SheetNode aggregation | High | ❌ |
| DisplayNode ↔ ExtractorNode conversion | High | ❌ |
| Save/load roundtrip with embedded files | High | ❌ |
| LocalStorage auto-save | High | ❌ |
| Session recovery | Medium | ❌ |

---

## Phase 9: Future Enhancements (Backlog)

These are potential future features, not required for MVP:

| Feature | Description |
|---------|-------------|
| CSV/Excel import | Import data files into SheetNode |
| Export to CSV | Export SheetNode data |
| Formula support | Custom formulas in CalculationNode |
| Undo/Redo | Full undo/redo stack |
| Node templates | Save/load node configurations |
| Collaborative editing | Multi-user support |
| AI extraction | Use LLMs for smarter data extraction |
| Batch processing | Process multiple files |

---

## Immediate Next Steps

### Priority 1: Phase 7 Completion
1. ~~Edge deletion~~ ✅
2. ~~Keyboard shortcuts~~ ✅
3. ~~Error boundaries~~ ✅
4. Connection validation feedback
5. OCR error display

### Priority 2: Testing (Phase 8)
6. **Unit tests** - Test operation registry, formatValue, parseNumericValue, categories
7. **Integration tests** - Test data flow between nodes, save/load roundtrip

---

## Run Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Run ESLint
npm run test     # Run tests (once configured)
```
