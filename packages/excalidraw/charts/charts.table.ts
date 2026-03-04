import {
  COLOR_PALETTE,
  DEFAULT_FONT_FAMILY,
  FONT_FAMILY,
  FONT_SIZES,
  getFontString,
  getLineHeight,
  ROUNDNESS,
} from "@excalidraw/common";

import { measureText, newElement, newTextElement } from "@excalidraw/element";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import type { ChartElements } from "./charts.types";

const TABLE_CELL_PADDING = 12;
const TABLE_MIN_COL_WIDTH = 60;
const TABLE_MAX_COL_WIDTH = 220;
const TABLE_ROW_HEIGHT_PADDING = 14;

const HEADER_BG = "#e8eaed";
const CELL_BG = "#ffffff";
const BORDER_COLOR = COLOR_PALETTE.black;

export const renderTable = (
  cells: string[][],
  x: number,
  y: number,
): ChartElements | null => {
  if (cells.length < 1 || cells[0].length < 1) {
    return null;
  }

  const numRows = cells.length;
  const numCols = cells[0].length;

  const fontFamily = DEFAULT_FONT_FAMILY;
  const headerFontFamily = FONT_FAMILY["Lilita One"];
  const fontSize = FONT_SIZES.md;
  const lineHeight = getLineHeight(fontFamily);
  const headerLineHeight = getLineHeight(headerFontFamily);
  const fontString = getFontString({ fontFamily, fontSize });
  const headerFontString = getFontString({
    fontFamily: headerFontFamily,
    fontSize,
  });

  const colWidths = new Array(numCols).fill(TABLE_MIN_COL_WIDTH);
  for (let col = 0; col < numCols; col++) {
    for (let row = 0; row < numRows; row++) {
      const cellText = cells[row][col] || "";
      const isHeader = row === 0;
      const metrics = measureText(
        cellText,
        isHeader ? headerFontString : fontString,
        isHeader ? headerLineHeight : lineHeight,
      );
      const desiredWidth = metrics.width + TABLE_CELL_PADDING * 2;
      colWidths[col] = Math.min(
        TABLE_MAX_COL_WIDTH,
        Math.max(colWidths[col], desiredWidth),
      );
    }
  }

  const rowHeights = new Array(numRows).fill(0);
  for (let row = 0; row < numRows; row++) {
    const isHeader = row === 0;
    const metrics = measureText(
      "Ag",
      isHeader ? headerFontString : fontString,
      isHeader ? headerLineHeight : lineHeight,
    );
    rowHeights[row] = metrics.height + TABLE_ROW_HEIGHT_PADDING;
  }

  const elements: NonDeletedExcalidrawElement[] = [];

  const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
  const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0);

  elements.push(
    newElement({
      type: "rectangle",
      x,
      y,
      width: totalWidth,
      height: totalHeight,
      backgroundColor: CELL_BG,
      strokeColor: BORDER_COLOR,
      fillStyle: "solid",
      strokeWidth: 1,
      roughness: 0,
      opacity: 100,
      roundness: { type: ROUNDNESS.ADAPTIVE_RADIUS },
    }),
  );

  let currentY = y;
  for (let row = 0; row < numRows; row++) {
    const isHeader = row === 0;
    let currentX = x;

    for (let col = 0; col < numCols; col++) {
      const cellWidth = colWidths[col];
      const cellHeight = rowHeights[row];

      elements.push(
        newElement({
          type: "rectangle",
          x: currentX,
          y: currentY,
          width: cellWidth,
          height: cellHeight,
          backgroundColor: isHeader ? HEADER_BG : "transparent",
          strokeColor: BORDER_COLOR,
          fillStyle: "solid",
          strokeWidth: 1,
          roughness: 0,
          opacity: 100,
          roundness: null,
        }),
      );

      const cellText = cells[row][col] || "";
      if (cellText) {
        elements.push(
          newTextElement({
            text: cellText,
            x: currentX + TABLE_CELL_PADDING,
            y: currentY + cellHeight / 2,
            fontFamily: isHeader ? headerFontFamily : fontFamily,
            fontSize,
            lineHeight: isHeader ? headerLineHeight : lineHeight,
            textAlign: "left",
            verticalAlign: "middle",
            strokeColor: COLOR_PALETTE.black,
            opacity: 100,
          }),
        );
      }

      currentX += cellWidth;
    }
    currentY += rowHeights[row];
  }

  return elements;
};
