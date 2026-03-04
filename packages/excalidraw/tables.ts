import { getFontString, getLineHeight, normalizeEOL } from "@excalidraw/common";

import {
  measureText,
  newElement,
  newTextElement,
  wrapText,
} from "@excalidraw/element";

import type {
  ExcalidrawElement,
  ExcalidrawTextElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

type Delimiter = "\t" | "," | ";";

export type ParseTabularTextResult =
  | { ok: true; data: string[][] }
  | { ok: false; reason: string };

const DELIMITERS: readonly Delimiter[] = ["\t", ",", ";"];

const parseDelimitedRows = (text: string, delimiter: Delimiter): string[][] => {
  const rows: string[][] = [];
  const normalizedText = normalizeEOL(text);
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  let rowHasDelimiter = false;

  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];

    if (char === '"') {
      const nextChar = normalizedText[i + 1];
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      rowHasDelimiter = true;
      continue;
    }

    if (!inQuotes && char === "\n") {
      currentRow.push(currentCell.trim());
      if (rowHasDelimiter || currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      rowHasDelimiter = false;
      continue;
    }

    currentCell += char;
  }

  if (inQuotes) {
    return [];
  }

  currentRow.push(currentCell.trim());
  if (rowHasDelimiter || currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
};

export const parseTabularText = (text: string): ParseTabularTextResult => {
  if (text.trim().length === 0) {
    return { ok: false, reason: "No values" };
  }

  const candidates = DELIMITERS.map((delimiter) => {
    const parsed = parseDelimitedRows(text, delimiter);
    const columnCount = parsed[0]?.length ?? 0;
    const isConsistent =
      parsed.length > 0 && parsed.every((row) => row.length === columnCount);
    const score =
      (isConsistent ? 1000 : 0) + columnCount * 10 + Math.min(parsed.length, 99);
    return { delimiter, parsed, columnCount, isConsistent, score };
  });

  let bestCandidate = candidates[0];
  for (const candidate of candidates.slice(1)) {
    if (candidate.score > bestCandidate.score) {
      bestCandidate = candidate;
    }
  }

  if (!bestCandidate.isConsistent) {
    return { ok: false, reason: "Rows have inconsistent number of columns" };
  }

  if (bestCandidate.columnCount < 2) {
    return { ok: false, reason: "Less than 2 columns" };
  }

  if (bestCandidate.parsed.length < 2) {
    return { ok: false, reason: "Less than 2 rows" };
  }

  return { ok: true, data: bestCandidate.parsed };
};

type TableRenderStyle = Pick<
  ExcalidrawElement,
  | "strokeColor"
  | "backgroundColor"
  | "fillStyle"
  | "strokeWidth"
  | "strokeStyle"
  | "roughness"
  | "opacity"
  | "locked"
>;

const CELL_PADDING_X = 12;
const CELL_PADDING_Y = 8;
const MIN_COLUMN_WIDTH = 80;
const MAX_COLUMN_WIDTH = 320;
const MIN_ROW_HEIGHT = 36;

export const renderTableFromCells = (opts: {
  cells: string[][];
  x: number;
  y: number;
  groupId?: string;
  frameId: ExcalidrawElement["frameId"];
  style: TableRenderStyle;
  fontSize: ExcalidrawTextElement["fontSize"];
  fontFamily: ExcalidrawTextElement["fontFamily"];
}): readonly NonDeletedExcalidrawElement[] => {
  const cells = opts.cells;
  if (!cells.length || !cells[0]?.length) {
    return [];
  }

  const columnCount = cells[0].length;
  const lineHeight = getLineHeight(opts.fontFamily);
  const fontString = getFontString({
    fontFamily: opts.fontFamily,
    fontSize: opts.fontSize,
  });
  const groupIds = opts.groupId ? [opts.groupId] : [];

  const columnWidths = Array.from({ length: columnCount }, (_, columnIndex) => {
    const maxCellWidth = Math.max(
      ...cells.map((row) =>
        measureText(row[columnIndex] || "", fontString, lineHeight).width,
      ),
    );
    return Math.min(
      MAX_COLUMN_WIDTH,
      Math.max(MIN_COLUMN_WIDTH, maxCellWidth + CELL_PADDING_X * 2),
    );
  });

  const wrappedTexts = cells.map((row) =>
    row.map((cell, columnIndex) =>
      wrapText(
        cell,
        fontString,
        Math.max(1, columnWidths[columnIndex] - CELL_PADDING_X * 2),
      ),
    ),
  );

  const rowHeights = wrappedTexts.map((row) =>
    Math.max(
      MIN_ROW_HEIGHT,
      ...row.map(
        (wrappedText) =>
          measureText(wrappedText, fontString, lineHeight).height +
          CELL_PADDING_Y * 2,
      ),
    ),
  );

  const elements: NonDeletedExcalidrawElement[] = [];
  let currentY = opts.y;

  for (let rowIndex = 0; rowIndex < cells.length; rowIndex++) {
    let currentX = opts.x;
    const rowHeight = rowHeights[rowIndex];

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
      const columnWidth = columnWidths[columnIndex];
      const wrappedText = wrappedTexts[rowIndex][columnIndex];
      const textMetrics = measureText(wrappedText, fontString, lineHeight);
      const textY = currentY + (rowHeight - textMetrics.height) / 2;

      elements.push(
        newElement({
          type: "rectangle",
          x: currentX,
          y: currentY,
          width: columnWidth,
          height: rowHeight,
          strokeColor: opts.style.strokeColor,
          backgroundColor: opts.style.backgroundColor,
          fillStyle: opts.style.fillStyle,
          strokeWidth: opts.style.strokeWidth,
          strokeStyle: opts.style.strokeStyle,
          roughness: opts.style.roughness,
          opacity: opts.style.opacity,
          groupIds,
          frameId: opts.frameId,
          roundness: null,
          locked: opts.style.locked,
        }),
      );

      elements.push(
        newTextElement({
          x: currentX + CELL_PADDING_X,
          y: textY,
          text: wrappedText,
          originalText: cells[rowIndex][columnIndex],
          strokeColor: opts.style.strokeColor,
          backgroundColor: "transparent",
          fillStyle: opts.style.fillStyle,
          strokeWidth: opts.style.strokeWidth,
          strokeStyle: opts.style.strokeStyle,
          roughness: opts.style.roughness,
          opacity: opts.style.opacity,
          groupIds,
          frameId: opts.frameId,
          fontSize: opts.fontSize,
          fontFamily: opts.fontFamily,
          lineHeight,
          textAlign: "left",
          verticalAlign: "top",
          locked: opts.style.locked,
        }),
      );

      currentX += columnWidth;
    }

    currentY += rowHeight;
  }

  return elements;
};
