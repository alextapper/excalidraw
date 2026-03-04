import { getFontString, getLineHeight } from "@excalidraw/common";

import { convertToExcalidrawElements, measureText } from "@excalidraw/element";

import type { ExcalidrawElementSkeleton } from "@excalidraw/element";
import type {
  ExcalidrawElement,
  ExcalidrawGenericElement,
  ExcalidrawTextElement,
} from "@excalidraw/element/types";

type SupportedDelimiter = "\t" | "," | ";";

const SUPPORTED_DELIMITERS = ["\t", ",", ";"] as const;
const MAX_TABLE_CELLS = 2500;

const CELL_PADDING_X = 16;
const CELL_PADDING_Y = 10;
const MIN_CELL_WIDTH = 80;
const MAX_CELL_WIDTH = 320;
const MIN_CELL_HEIGHT = 40;
const MAX_CELL_HEIGHT = 200;

export type ParsedTabularData = {
  rows: string[][];
  delimiter: SupportedDelimiter;
};

export type ParseTabularDataResult =
  | { ok: true; data: ParsedTabularData }
  | { ok: false; reason: string };

export type TableRenderStyle = {
  strokeColor: ExcalidrawGenericElement["strokeColor"];
  textColor: ExcalidrawTextElement["strokeColor"];
  backgroundColor: ExcalidrawGenericElement["backgroundColor"];
  fillStyle: ExcalidrawGenericElement["fillStyle"];
  strokeWidth: ExcalidrawGenericElement["strokeWidth"];
  strokeStyle: ExcalidrawGenericElement["strokeStyle"];
  roughness: ExcalidrawGenericElement["roughness"];
  opacity: ExcalidrawGenericElement["opacity"];
  fontSize: ExcalidrawTextElement["fontSize"];
  fontFamily: ExcalidrawTextElement["fontFamily"];
};

type Candidate = {
  delimiter: SupportedDelimiter;
  rows: string[][];
  columnCount: number;
  multiColumnRowCount: number;
  valid: boolean;
};

const parseDelimitedText = (rawText: string, delimiter: SupportedDelimiter) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < rawText.length; i++) {
    const char = rawText[i];

    if (char === '"') {
      if (inQuotes && rawText[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && rawText[i + 1] === "\n") {
        i++;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (inQuotes) {
    return null;
  }

  row.push(cell);
  rows.push(row);

  return rows;
};

const getCandidate = (text: string, delimiter: SupportedDelimiter): Candidate => {
  const rows = parseDelimitedText(text, delimiter);

  if (!rows) {
    return {
      delimiter,
      rows: [],
      columnCount: 0,
      multiColumnRowCount: 0,
      valid: false,
    };
  }

  const normalizedRows = rows
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));

  const columnCount = normalizedRows.reduce(
    (max, row) => Math.max(max, row.length),
    0,
  );
  const paddedRows = normalizedRows.map((row) =>
    row.length < columnCount
      ? [...row, ...Array(columnCount - row.length).fill("")]
      : row,
  );
  const multiColumnRowCount = paddedRows.filter((row) => row.length > 1).length;

  return {
    delimiter,
    rows: paddedRows,
    columnCount,
    multiColumnRowCount,
    valid:
      paddedRows.length >= 2 &&
      columnCount >= 2 &&
      multiColumnRowCount >= 2 &&
      paddedRows.every((row) => row.length === columnCount),
  };
};

export const tryParseTabularData = (text: string): ParseTabularDataResult => {
  const normalizedText = text.replace(/^\uFEFF/, "");

  const bestCandidate = SUPPORTED_DELIMITERS.map((delimiter) =>
    getCandidate(normalizedText, delimiter),
  )
    .filter((candidate) => candidate.valid)
    .reduce<Candidate | null>((best, candidate) => {
      if (!best) {
        return candidate;
      }

      if (candidate.columnCount > best.columnCount) {
        return candidate;
      }

      if (candidate.columnCount === best.columnCount) {
        return candidate.rows.length > best.rows.length ? candidate : best;
      }

      return best;
    }, null);

  if (!bestCandidate) {
    return { ok: false, reason: "No tabular data" };
  }

  if (bestCandidate.columnCount * bestCandidate.rows.length > MAX_TABLE_CELLS) {
    return { ok: false, reason: "Too many cells" };
  }

  return {
    ok: true,
    data: {
      rows: bestCandidate.rows,
      delimiter: bestCandidate.delimiter,
    },
  };
};

const getCellMetrics = ({
  text,
  fontString,
  lineHeight,
  lineHeightPx,
}: {
  text: string;
  fontString: ReturnType<typeof getFontString>;
  lineHeight: ReturnType<typeof getLineHeight>;
  lineHeightPx: number;
}) => {
  const lines = text ? text.split("\n") : [""];
  const maxLineWidth = Math.max(
    ...lines.map((line) => measureText(line || " ", fontString, lineHeight).width),
  );

  return {
    width: Math.min(
      MAX_CELL_WIDTH,
      Math.max(MIN_CELL_WIDTH, maxLineWidth + CELL_PADDING_X * 2),
    ),
    height: Math.min(
      MAX_CELL_HEIGHT,
      Math.max(MIN_CELL_HEIGHT, lineHeightPx * Math.max(lines.length, 1) + CELL_PADDING_Y * 2),
    ),
  };
};

export const renderTabularDataAsTable = ({
  rows,
  x = 0,
  y = 0,
  style,
}: {
  rows: string[][];
  x?: number;
  y?: number;
  style: TableRenderStyle;
}): readonly ExcalidrawElement[] => {
  if (!rows.length || !rows[0]?.length) {
    return [];
  }

  const rowCount = rows.length;
  const columnCount = rows[0].length;
  const fontString = getFontString({
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
  });
  const lineHeight = getLineHeight(style.fontFamily);
  const lineHeightPx = lineHeight * style.fontSize;

  const columnWidths = new Array(columnCount).fill(MIN_CELL_WIDTH);
  const rowHeights = new Array(rowCount).fill(MIN_CELL_HEIGHT);

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
      const metrics = getCellMetrics({
        text: rows[rowIndex][columnIndex] || "",
        fontString,
        lineHeight,
        lineHeightPx,
      });
      columnWidths[columnIndex] = Math.max(columnWidths[columnIndex], metrics.width);
      rowHeights[rowIndex] = Math.max(rowHeights[rowIndex], metrics.height);
    }
  }

  const skeletonElements: ExcalidrawElementSkeleton[] = [];
  let currentY = y;

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    let currentX = x;

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
      const text = rows[rowIndex][columnIndex] || "";
      const width = columnWidths[columnIndex];
      const height = rowHeights[rowIndex];

      skeletonElements.push({
        type: "rectangle",
        x: currentX,
        y: currentY,
        width,
        height,
        strokeColor: style.strokeColor,
        backgroundColor: style.backgroundColor,
        fillStyle: style.fillStyle,
        strokeWidth: style.strokeWidth,
        strokeStyle: style.strokeStyle,
        roughness: style.roughness,
        opacity: style.opacity,
        roundness: null,
        label: text
          ? {
              text,
              strokeColor: style.textColor,
              fontSize: style.fontSize,
              fontFamily: style.fontFamily,
              textAlign: "left",
              verticalAlign: "middle",
            }
          : undefined,
      });

      currentX += width;
    }

    currentY += rowHeights[rowIndex];
  }

  return convertToExcalidrawElements(skeletonElements);
};
