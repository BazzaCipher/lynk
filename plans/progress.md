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
| Phase 6: Image Node | ✅ Complete | Standalone image display node |
| Phase 7: Polish & UX | 🔄 In Progress | See below |
| Phase 8: Testing & Docs | ❌ Not Started | Unit tests, integration tests |

---

## Completed Work

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

**Files Modified:**
- `src/types/nodes.ts` - New types: SheetEntry, SheetSubheader, SheetComputedResult
- `src/schemas/canvas.ts` - Updated Zod schemas
- `src/hooks/useDataFlow.ts` - Added resolveSheetNodeOutput
- `src/components/nodes/SheetNode.tsx` - Complete rewrite (~880 lines)
- `src/components/canvas/Toolbar.tsx` - Updated default data

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
| Embed images as base64 | High | ✅ | Store ImageNode images in export |
| Embed FileNode images | High | ✅ | Store images used in FileNode |
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

### 5.5 Implementation Details (Jan 26, 2025)

**Files Added/Modified:**
- `src/hooks/useLocalStorageSync.ts` - Auto-save hook with debounce + interval
- `src/store/canvasPersistence.ts` - BlobRegistry, CanvasExporter, CanvasImporter, CanvasValidator
- `src/components/SessionRecovery.tsx` - Recovery modal on app load
- `src/types/canvas.ts` - Added EmbeddedFile type
- `src/types/nodes.ts` - Added fileId to FileNodeData
- `src/schemas/canvas.ts` - Updated Zod schemas for embedded files
- `src/store/canvasStore.ts` - Integrated persistence utilities
- `src/components/nodes/FileNode.tsx` - Register files with BlobRegistry
- `src/components/canvas/Toolbar.tsx` - Handle save validation results

**Key Patterns:**
- `BlobRegistry` - In-memory registry tracking blob URLs and file data
- `CanvasExporter.exportWithEmbeddedFiles()` - Converts blobs to base64 for export
- `CanvasImporter.importWithExtractedFiles()` - Restores blob URLs from base64
- Files stored without embedded data in localStorage (5MB limit)

---

## Phase 6: Image Node

### 6.1 ImageNode Component

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| Create ImageNode component | High | ❌ | Display-only node, no handles |
| Base64 storage for images | High | ❌ | Store as data URL for persistence |
| Drag-and-drop upload | High | ❌ | Drop image onto canvas to create node |
| File picker button | High | ❌ | Alternative to drag-drop |
| Resize controls | Medium | ❌ | Corner handles to resize image |
| Aspect ratio lock option | Low | ❌ | Maintain proportions when resizing |

### 6.2 ImageNode Features

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| Image preview in node | High | ❌ | Show scaled image within node bounds |
| Full-size view on click | Medium | ❌ | Modal to view full resolution |
| Image label/caption | Low | ❌ | Optional text label below image |
| Supported formats | High | ❌ | PNG, JPG, GIF, WebP |

**Key Distinction from FileNode:**
- ImageNode: Visual reference only, no data extraction, no handles
- FileNode: Data extraction with regions, OCR, output handles

---

## Phase 7: Polish & UX (Current)

### 7.1 Visual Feedback & UX Improvements

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| Edge deletion UI | High | ❌ | Right-click or select + delete key |
| Node deletion confirmation | Medium | ❌ | Warn if node has connections |
| Connection validation feedback | Medium | ❌ | Visual feedback for invalid connections |
| Keyboard shortcuts | Medium | ❌ | Delete, Esc, Ctrl+S, Ctrl+Z |
| Canvas zoom controls | Low | ❌ | Zoom buttons, fit-to-view |

### 7.2 Data Type Handling

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| Type coercion warnings | Medium | ❌ | Warn when connecting incompatible types |
| Currency formatting consistency | Medium | ❌ | Locale-aware currency display |
| Date formatting options | Low | ❌ | User-configurable date formats |

### 7.3 Error Handling

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| Error boundaries for nodes | High | ❌ | Prevent single node crash from breaking canvas |
| OCR error display | Medium | ❌ | Show OCR failures in UI |
| Invalid edge handling | Medium | ❌ | Graceful handling of broken connections |
| Save/load error messages | Medium | ❌ | User-friendly error messages |

### 7.4 Performance

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| Large file handling | Medium | ❌ | Progress indicator for big PDFs |
| Memoization audit | Low | ❌ | Prevent unnecessary re-renders |
| Edge batching | Low | ❌ | Batch updates for multiple connections |

---

## Phase 8: Testing & Documentation

### 8.1 Unit Tests

| Component | Priority | Status |
|-----------|----------|--------|
| Operation registry | High | ❌ |
| formatValue utility | High | ❌ |
| parseNumericValue | High | ❌ |
| Zod schemas | Medium | ❌ |
| useDataFlow hook | Medium | ❌ |

### 8.2 Integration Tests

| Scenario | Priority | Status |
|----------|----------|--------|
| FileNode → CalculationNode data flow | High | ❌ |
| FileNode → SheetNode entry aggregation | High | ❌ |
| SheetNode → CalculationNode chaining | High | ❌ |
| Save → Load roundtrip | High | ❌ |
| Export with embedded files | High | ❌ |
| Import restores all data | High | ❌ |
| LocalStorage auto-save | High | ❌ |
| Session recovery | Medium | ❌ |
| Multi-page PDF navigation | Medium | ❌ |

### 8.3 E2E Tests

| Scenario | Priority | Status |
|----------|----------|--------|
| Create node workflow | Medium | ❌ |
| Region selection on PDF | Medium | ❌ |
| Full data flow pipeline | Low | ❌ |

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

### Priority 1: Image Node (Phase 6)
1. **ImageNode component** - Display-only image node (no handles)
2. **Drag-and-drop upload** - Drop image onto canvas to create ImageNode
3. **Base64 storage** - Store image data for persistence

### Priority 2: Polish (Phase 7)
4. **Edge deletion** - Add ability to delete edges (right-click menu or select + delete)
5. **Error boundaries** - Wrap nodes in error boundaries to prevent crashes
6. **Keyboard shortcuts** - Delete, Esc, Ctrl+S, Ctrl+Z

### Priority 3: Testing (Phase 8)
7. **Unit tests** - Test operation registry, formatValue, parseNumericValue
8. **Integration tests** - Test data flow between nodes, save/load roundtrip

---

## Run Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Run ESLint
npm run test     # Run tests (once configured)
```
