# Feature Prompt: CSV/Tabular Data Table Component

## Overview

Add a feature to the Excalidraw canvas that allows users to **drag and drop a CSV file** or **copy and paste tabular data** (e.g., from Excel, Google Sheets, or plain CSV/TSV) and have it create a **table component** on the canvas displaying the parsed data.

---

## Context: Excalidraw Codebase

This is the **Excalidraw monorepo** — a whiteboard/canvas application. Key architecture points:

- **`packages/excalidraw/`** — Main React component library (where most logic lives)
- **`excalidraw-app/`** — Web app wrapper
- **Element types** — Shapes (rectangle, ellipse, text, image, embeddable, iframe, etc.) defined in `packages/element/src/types.ts`
- **Charts** — Existing `charts/` module with `tryParseSpreadsheet()` that parses CSV/TSV/semicolon-delimited text into a chart-oriented structure (labels, series, numeric values). Charts render as bar/line/radar shapes.
- **Paste flow** — `pasteFromClipboard` → `parseClipboard` → `insertClipboardContent` in `App.tsx`. Tabular paste currently opens `PasteChartDialog` for chart conversion.
- **Drop flow** — `handleAppOnDrop` in `App.tsx` handles images, library items, excalidraw files, embeddable URLs. Uses `parseDataTransferEvent` from `clipboard.ts` to read `DataTransfer`.

---

## Requirements

### 1. Input Methods

**A. Drag and drop CSV file**

- When a `.csv` file (or `text/csv`, `text/plain` with CSV content) is dropped onto the canvas, parse it and create a table component at the drop position.
- Reuse the same drop handling path as images/library (`handleAppOnDrop`). Add CSV detection before or after existing file-type checks.
- Use `file.text()` or `FileReader` to read file contents as text, then parse.

**B. Copy and paste tabular data**

- When the user pastes (Ctrl/Cmd+V) text that looks like tabular data (rows with consistent delimiters: tab, comma, semicolon), offer to create a table component.
- Current behavior: tabular paste opens `PasteChartDialog` with bar/line/radar chart options and "plain text". Add a **"Table"** option that creates the table component instead of a chart.
- Support data copied from Excel, Google Sheets, Numbers, or raw CSV/TSV.

### 2. Table Component

- **Representation**: Decide how to represent the table on the canvas. Options:
  - **Option A**: New element type (e.g., `type: "table"`) with `customData` holding `{ rows: string[][] }`. Requires new renderer, hit-testing, resize, export.
  - **Option B**: Use an **embeddable** or **iframe** element with `srcdoc` set to an HTML `<table>`. Reuses existing embeddable/iframe rendering and export.
  - **Option C**: Compose existing elements (e.g., grouped text elements in a grid). Simpler but harder to maintain as a single logical table.
- **Rendering**: Table should display headers (first row) and data rows with clear cell boundaries. Styling should follow Cursor brand guidelines (see `CLAUDE.md`).
- **Sizing**: Table should have reasonable default dimensions based on row/column count, or fit-to-content behavior.

### 3. Parsing

- **Delimiters**: Support tab (`\t`), comma (`,`), and semicolon (`;`). The existing `tryParseSpreadsheet` in `packages/excalidraw/charts/charts.parse.ts` already handles these; consider extracting or adapting a generic `parseTableData(text: string): string[][] | null` that returns a 2D array of cell strings.
- **Edge cases**: Handle quoted CSV fields, empty cells, inconsistent row lengths (e.g., pad or truncate), BOM, `\r\n` vs `\n`.
- **Validation**: If parsing fails or produces empty/invalid data, show an error (e.g., `setState({ errorMessage: t("errors.invalidCSV") })`) or fall back to plain text paste.

### 4. Integration Points

| Location | Change |
|----------|--------|
| `packages/excalidraw/components/App.tsx` | In `handleAppOnDrop`: detect CSV files, read contents, parse, insert table at `sceneX`/`sceneY`. |
| `packages/excalidraw/components/App.tsx` | In `insertClipboardContent`: when `tryParseSpreadsheet` succeeds, ensure `PasteChartDialog` also offers a "Table" option (or a separate `PasteTableDialog` if UX differs). |
| `packages/excalidraw/components/PasteChartDialog.tsx` | Add "Table" button that creates the table component from the same `Spreadsheet` or raw cell data. |
| `packages/excalidraw/clipboard.ts` or new `packages/excalidraw/data/table.ts` | Add `parseTableData(text: string): string[][] | null` for generic tabular parsing (or adapt `tryParseSpreadsheet` / `tryParseCells`). |
| Element type / renderer | Implement table element (new type or embeddable/iframe approach). |
| `packages/excalidraw/locales/en.json` | Add strings: `labels.pasteAsTable`, `errors.invalidCSV`, etc. |

### 5. Testing

- **Unit tests**: `parseTableData` (or equivalent) for CSV, TSV, semicolon, quoted fields, empty rows.
- **Integration tests**: Follow patterns in `packages/excalidraw/tests/clipboard.test.tsx` and `image.test.tsx`:
  - Paste tabular text → table created (or dialog with table option).
  - Drop CSV file via `API.drop([{ kind: "file", file: csvFile }])` → table created at drop position.
- Run `yarn test:update` and `yarn test:typecheck` before committing.

### 6. UX Details

- **Feedback**: When dropping a CSV file, optionally show a brief loading state. On parse error, use existing `errorMessage` state.
- **Positioning**: Place table at cursor (paste) or drop coordinates (drag-and-drop), consistent with images and library items.
- **Undo**: Table creation should be undoable (standard scene mutation).

---

## Out of Scope (for initial implementation)

- Editing table cells in-place on the canvas.
- Exporting table to CSV.
- Table styling options (borders, colors) beyond a default readable style.

---

## Reference Files

- `packages/excalidraw/components/App.tsx` — `handleAppOnDrop` (line ~11469), `insertClipboardContent` (line ~3520), `pasteFromClipboard`
- `packages/excalidraw/clipboard.ts` — `parseDataTransferEvent`, `parseClipboard`, `createPasteEvent`
- `packages/excalidraw/charts/charts.parse.ts` — `tryParseSpreadsheet`, `tryParseCells`
- `packages/excalidraw/components/PasteChartDialog.tsx` — Chart paste dialog
- `packages/excalidraw/tests/image.test.tsx` — Drop test pattern (`API.drop`)
- `packages/excalidraw/tests/clipboard.test.tsx` — Paste test pattern
- `packages/element/src/types.ts` — Element type definitions
- `CLAUDE.md` — Cursor brand colors, dev commands
