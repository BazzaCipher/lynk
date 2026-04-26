# Reconciliation System Plan (v3)

## Context
Goal: make it trivially easy to extract tabular data from a bank statement, import a CSV, and reconcile them. The ExtractorNode already shows a region list that's basically a table - evolve that into a proper ledger rather than creating a separate node. The file preview should be minimal (small trigger button, hover preview). MatchNode bridges two extractors for reconciliation.

---

## Design Philosophy

- **ExtractorNode becomes the ledger** - its region list already IS a table of name/type/value rows. Extend it with user-defined columns, manual row entry, CSV import, and table-aware OCR. No separate LedgerNode needed.
- **File preview is secondary** - small circle button on top-right corner for opening the modal. Hover shows thumbnail preview. The node body is the data table.
- **MatchNode syncs two sources** - a new node type that connects two extractors (or any exportable) and shows reconciliation status inline, possibly opening a dedicated sync modal.
- **Focus mode on groups** - since groups are created via Ctrl+G, double-click group label to enter focus mode (dims everything else).

---

## Part 1: Evolve ExtractorNode into a Ledger-Table

### Current State
- Regions = rows, each with: label, dataType, value, coordinates
- RegionList renders rows with name + type badge + value
- Modal opens document viewer + collapsible "Fields" panel on right
- Each region gets an output handle

### Proposed Changes

#### 1a. Column System
Add user-defined columns to ExtractorNodeData:

```typescript
// New fields on ExtractorNodeData
interface ExtractorColumn {
  id: string;
  label: string;           // "Date", "Description", "Amount", "Reference"
  dataType: SimpleDataType;
  width?: number;          // column width in px
}

// ExtractorNodeData additions:
columns: ExtractorColumn[];        // user-defined columns (default: just "Label" + "Value")
// Each region's `extractedData` becomes cells in these columns
// regions[i].cells: Record<columnId, string>  -- new field on ExtractedRegion
```

- Default columns: "Label" (string), "Value" (auto-typed) - matches current behavior
- User can add columns: "Date", "Reference", "Description", etc.
- Column headers are editable, type is selectable
- Add column button (+) in header row
- Right-click column header: rename, change type, delete, set as key (for reconciliation)

#### 1b. Node Body Redesign
The ExtractorNode body becomes a compact table:

```
+--[Extractor Label]--------[file icon]--+
| Date    | Ref     | Desc    | Amount   |  <- column headers (editable)
|---------|---------|---------|----------|
| 01/15   | INV-001 | Widget  | $150.00  |  <- region rows
| 01/16   | INV-002 | Gadget  | $200.00  |
| ...     |         |         |          |
| [+ Add Row]                [n rows]    |
+-[import handles]------[export handles]-+
```

- **File button**: small circle icon on top-right of the header bar, opens the document modal
- **Hover preview**: hovering the file button shows a thumbnail tooltip of the current page
- **Column headers**: inline editable, click type badge to change type
- **Rows**: inline editable cells, click to edit, blur/Enter to commit
- **Row status stripe**: left border colored by match status (green/red/yellow) - set by MatchNode
- **Scrollable**: if > ~8 rows, the table body scrolls with a row count indicator
- **Virtualized for 1000+ rows**: use a lightweight virtual scroll (just CSS overflow + slicing rendered rows by scroll position, no heavy lib needed)

#### 1c. Manual Row Entry
- "Add Row" button at bottom of table
- New row appears with empty cells, user fills in manually
- Rows without coordinates/textRange are "manual" entries (no OCR link)
- Manual rows still get output handles and participate in reconciliation

#### 1d. CSV Import
- Drop .csv file onto the node (or paste CSV text)
- Auto-detect delimiter + headers
- Map CSV columns to ExtractorNode columns (auto-create if new)
- Each CSV row becomes a region with `selectionType: 'manual'`
- New utility: `src/utils/csvParser.ts`

#### 1e. Table-Aware OCR in Modal
- New selection mode: "Table" (alongside Select, Box, Text)
- Draw a box around a tabular area in the document
- OCR runs, then `tableParser` splits result into columns/rows by alignment
- Detected columns auto-map to existing ExtractorNode columns or create new ones
- Each detected row becomes a region with cell values populated

#### 1f. Handle Strategy
- **Export handles**: one per column (outputs array of values for that column), plus one per row (outputs that row as a record)
- **Import handle**: single handle on left, accepts bulk data from another extractor or CSV
- This is different from current per-region handles - need migration path (keep per-region handles as aliases)

### Files to Modify
- `src/types/regions.ts` - add `cells` field to ExtractedRegion, add `ExtractorColumn` type
- `src/types/nodes.ts` - add `columns` to ExtractorNodeData
- `src/components/nodes/ExtractorNode.tsx` - redesign node body as table
- `src/components/nodes/file/RegionList.tsx` - evolve into table grid component
- `src/components/canvas/nodeDefaults.ts` - update defaultExtractorData with default columns
- `src/utils/csvParser.ts` - new: CSV parsing
- `src/core/extraction/tableParser.ts` - new: OCR result -> structured rows/columns

---

## Part 2: MatchNode (Reconciliation)

### Concept
MatchNode connects two data sources and reconciles them. It's compact on the canvas but can open a **sync modal** that shows a side-by-side detailed view.

### Data Model

```typescript
interface MatchConfig {
  mode: 'exact' | 'fuzzy' | 'tolerance';
  tolerance?: number;
  percentTolerance?: number;
  dateRange?: number;           // days
  keyColumnLeft?: string;       // column ID to match on
  keyColumnRight?: string;
  compareColumns?: Array<{      // columns to compare values
    left: string;
    right: string;
  }>;
}

interface MatchPair {
  id: string;
  leftRowId: string;
  rightRowId: string;
  status: 'matched' | 'partial' | 'unmatched';
  deltas: Record<string, number>;  // per compare-column deltas
}

interface MatchNodeData extends BaseNodeData, Importable, Exportable {
  config: MatchConfig;
  pairs: MatchPair[];
  unmatchedLeft: string[];
  unmatchedRight: string[];
}
```

### Node Body (compact)
```
+--[Match: Bank vs Ledger]---------------+
| [===green====][=yellow=][red]          |  <- proportion bar
| 42 matched | 3 partial | 5 unmatched  |
| [Open Sync View]                       |
+-[A input]------------------[outputs]---+
```

- Two input handles: "Source A" (left-top) and "Source B" (left-bottom)
- Three output handles: "Matched", "Unmatched A", "Unmatched B"
- Summary proportion bar with counts
- Button to open sync modal

### Sync Modal
Full-screen modal showing side-by-side reconciliation:

```
+--[Source A: Bank Statement]---------+--[Source B: Ledger]------------------+
| Date   | Ref    | Amount  | Status  | Date   | Ref    | Amount  | Status  |
|--------|--------|---------|---------|--------|--------|---------|---------|
| 01/15  | INV-01 | $150.00 | [ok]   | 01/15  | INV-01 | $150.00 | [ok]   |
| 01/16  | INV-02 | $200.00 | [!]    | 01/16  | INV-02 | $199.50 | [!]    |
| 01/17  | INV-03 | $75.00  | [x]    |        |        |         |        |
+--------------------------------------+---------------------------------------+
```

- Matched rows aligned side-by-side
- Partial matches highlighted yellow with delta shown
- Unmatched rows shown at bottom of their respective side
- Click a row to highlight the source in both connected extractors
- Config panel at top: match mode, key column selectors, tolerance

### Match Engine
- `src/core/reconciliation/matchEngine.ts`
- Takes two arrays of records + config
- Returns MatchPair[] + unmatched lists
- Supports: exact key match, fuzzy string match, value tolerance, date range

### Files to Create/Modify
- `src/types/nodes.ts` - MatchConfig, MatchPair, MatchNodeData, add to unions
- `src/types/categories.ts` - add 'match' to CanExport/CanImport
- `src/components/nodes/MatchNode.tsx` - node component
- `src/components/nodes/match/SyncModal.tsx` - full reconciliation view
- `src/core/reconciliation/matchEngine.ts` - matching algorithm
- `src/core/nodes/registerAll.ts` - register match node
- `src/components/canvas/nodeDefaults.ts` - defaultMatchData

---

## Part 3: Focus Mode on Groups

### How It Works
- Double-click a group's label -> enter focus mode
- All nodes NOT in the group: opacity 0.15, pointer-events: none
- All edges not connecting group members: dimmed
- Floating "Exit Focus" pill at top of canvas (or press Escape)
- Purely visual, no data model changes

### Implementation
- `coreSlice.ts`: add `focusedGroupId: string | null` + `setFocusedGroup(id | null)`
- `LynkCanvas.tsx`: derive which nodes are in the focused group, apply dim CSS class to others
- Group label double-click handler in the group selection/interaction logic
- Escape key handler to exit focus

### Files to Modify
- `src/store/slices/coreSlice.ts`
- `src/components/canvas/LynkCanvas.tsx`
- CSS for dim state

---

## Implementation Order

1. **ExtractorNode column system** - add columns to data model, redesign node body as table - **PARTIAL (foundation landed 2026-04-17)**
2. **Manual row entry + CSV import** - make extractor useful without a file - manual row entry **DONE**; CSV import **DONE** (2026-04-17)
3. **Table-aware OCR** - selection mode + parser for bulk extraction - **DONE (2026-04-17)**
4. **MatchNode** - reconciliation engine + compact node + sync modal - **DONE (2026-04-21)**
5. **Focus mode** - group isolation (quick win) - **DONE**

---

## Progress Log

### 2026-04-17 - Phase 1 foundation
Shipped the minimum viable column/table foundation. What's in:
- `ExtractorColumn` type + `columns?: ExtractorColumn[]` on `ExtractorNodeData` (optional; defaults applied at render)
- `cells?: Record<string,string>` on `ExtractedRegion` for user-defined columns
- `SelectionType` gained `'manual'` for non-OCR rows
- `DEFAULT_EXTRACTOR_COLUMNS` = `[Label, Value]` in `nodeDefaults.ts`
- New `src/components/nodes/file/RegionTable.tsx` - editable column headers, + add column, hover-x delete column (built-in `label`/`value` non-removable), inline-editable cells, `+ Add Row`, row count footer, ~280px scroll cap, per-row source handle retained
- `ExtractorNode.tsx` wires `handleColumnsChange` / `handleCellChange` / `handleAddRow`; node body now renders `RegionTable` instead of compact `RegionList`. Modal side-panel `RegionList` untouched
- Built-in column semantics: writing the `label` column updates `region.label`; writing `value` updates `region.extractedData.value` (and `textRange.text` for text selections); custom columns write to `region.cells[colId]`

Not yet in Phase 1 (explicitly deferred):
- Per-column data type pickers on headers (currently all custom cols default to string)
- Right-click column menu (rename/type/delete/set-as-key)
- Key-column marking for reconciliation
- Column-level export handles (still per-region only)
- Row status stripe for match results
- Virtual scrolling for 1000+ rows
- Hover thumbnail preview on file button, small-circle file button redesign

Next up when resuming: CSV import (1d) + table-aware OCR mode (1e), then MatchNode.

### 2026-04-17 - Phase 1d: CSV import
- New `src/utils/csvParser.ts`: auto delimiter detection (`,` `\t` `;` `|`), RFC-4180-style quoted field handling (embedded quotes via `""`, quoted newlines), CRLF support, row-width padding
- Test coverage in `src/__tests__/utils/csvParser.test.ts` (6 cases, all passing under vitest)
- `ExtractorNode.tsx`: new `handleCsvImport` + `handleDrop` wrapper. Dropping a `.csv`/`.tsv` file (or MIME `text/csv`/`application/csv`) onto the node header or empty drop zone imports rows instead of registering the file as a document
- Column merge policy: first CSV header maps to the built-in `label` column; remaining headers reuse existing custom columns by case-insensitive label match, else a new column is created. Rows append (no replace)
- Imported rows are `selectionType: 'manual'` with no coordinates, so they coexist with OCR-derived regions and use the existing row handles

Deferred: paste-CSV-from-clipboard entry point, per-column dataType inference from CSV values, column reorder to match CSV order.

### 2026-04-17 - Phase 1e: Table-aware OCR
- New `src/core/extraction/tableParser.ts`: `parseTableFromOcr` clusters word x-starts to infer column anchors (20px tolerance), assigns words to nearest anchor, treats first row as header when <40% numeric else synthesises `Column N` labels
- New `extractFullPageFromRegion` helper in `ocrExtractor.ts` crops the image/canvas to the lasso rectangle before running full-page OCR, so table parsing runs only on the selected area
- `ExtractorNode.tsx`: new `selectionMode: 'table'` alongside select/box/text, new Table toolbar button, `handleTableExtract` runs crop→OCR→parse→merge. Column merge reuses the CSV-import merge policy (first header → built-in `label`, rest by case-insensitive label match or new column). Rows land as `selectionType: 'box'` with the lasso coordinates so highlights still render on the doc
- `RegionSelector` is now mounted in both `box` and `table` modes; highlight overlay remains interactive in both
- Tests: `src/__tests__/extraction/tableParser.test.ts` (3 cases: header detection, numeric-first-row fallback, tolerance-based cell joining) - all green under vitest (462/462 overall)

Deferred: column reorder to match detected header order, per-column dataType inference from cell values, user-editable column anchors, headerless multi-line rows.

Next up when resuming: MatchNode (Part 2) or Focus Mode (Part 3, quick win).

### 2026-04-21 - Phase 2: MatchNode
- New `src/core/reconciliation/matchEngine.ts`: `runMatch` pairs rows by key column with three modes — `exact` (normalized string equality), `fuzzy` (Levenshtein similarity ≥ threshold, default 0.8), `tolerance` (numeric |a-b| ≤ tol). Compare columns get per-cell `equal`/`delta` judgement, with numeric absolute + percent tolerance and optional date-range window for date-typed cells. Greedy pairing — a right row is used at most once
- Types/wiring: `MatchNodeData` + `MatchConfig` + `MatchPair` in `types/nodes.ts` (re-exported from engine), `'match'` added to `LynkNodeType`, `CanExport`/`CanImport` types arrays, `MatchNode` type guard, `defaultMatchData` in `nodeDefaults.ts`, registered in `registerAll.ts` (capabilities: canExport+canImport, creatable)
- `src/components/nodes/MatchNode.tsx`: reads store `nodes`/`edges` to resolve the two connected extractors via handles `source-a`/`source-b`, runs the engine live, persists `pairs`/`unmatchedLeft`/`unmatchedRight` back onto node data (guarded against no-op writes). Compact body shows proportion bar (green/yellow/red), counts, and an "Open Sync View" button. Output handles: `matched`, `unmatched-a`, `unmatched-b`
- `src/components/nodes/match/matchRows.ts`: adapter converting `ExtractedRegion[]` → `MatchRow[]`, merging built-in `label`/`value` with per-region `cells`
- `src/components/nodes/match/SyncModal.tsx`: full-screen reconciliation view. Config bar (mode / key A / key B / tolerance / fuzzy threshold), side-by-side tables with status-colored rows (matched=green, partial=yellow, unmatched=red). Row click clears any focused group and calls `setHighlight(nodeId, rowId)` so the corresponding region pulses on the canvas
- Tests: `src/__tests__/reconciliation/matchEngine.test.ts` (7 cases — exact/partial/tolerance/percent-tolerance matching, fuzzy key pairing, numeric tolerance key pairing, missing-key fallback, right-row single-use invariant); all green under vitest (469/469 overall)

Deferred: column-reorder to match detected header order, per-column data-type pickers, sync modal "keep as is" / "apply delta" bulk actions, export handles on MatchNode that actually stream pair records downstream (currently the compact node stores results in data but does not populate `Exportable.outputs` — downstream edges wired to `matched`/`unmatched-*` receive nothing yet), auto-detect likely key column (rather than first-column fallback).

---

## Key Design Decisions

- **No separate LedgerNode** - ExtractorNode evolves to handle both OCR extraction AND manual/CSV data entry
- **File preview minimized** - small circle button top-right, hover for thumbnail, modal for full viewer
- **1000+ rows supported** - virtual scrolling in the node body table (render only visible rows)
- **Per-region handles kept for backward compat** - column-level handles added alongside
- **MatchNode uses a sync modal** for detailed reconciliation view rather than cramming it all into the node body

---

## Verification
1. Create ExtractorNode, add custom columns (Date, Ref, Amount), manually enter rows
2. Drop CSV onto ExtractorNode, verify columns auto-created and rows populated
3. Use table OCR mode on a bank statement, verify structured extraction
4. Connect two ExtractorNodes to a MatchNode, verify matching summary
5. Open sync modal, verify side-by-side view with status colors
6. Group the workflow (Ctrl+G), double-click to focus, verify dim effect
7. Test with 1000+ row CSV to verify scroll performance
