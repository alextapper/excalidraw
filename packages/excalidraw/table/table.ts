/**
 * Parses tabular data from CSV, TSV, or similar delimited text.
 * Returns a 2D array of cell values, or null if parsing fails.
 */
export const parseTableData = (text: string): string[][] | null => {
  const parseDelimitedLines = (delimiter: "\t" | "," | ";") =>
    text
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => line.split(delimiter).map((cell) => cell.trim()));

  const candidates = (["\t", ",", ";"] as const).map((delimiter) => {
    const parsed = parseDelimitedLines(delimiter);
    const numCols = parsed[0]?.length ?? 0;
    const isConsistent =
      parsed.length > 0 && parsed.every((line) => line.length === numCols);
    return { delimiter, parsed, numCols, isConsistent };
  });

  const best =
    candidates.find((c) => c.isConsistent && c.numCols >= 1) ??
    candidates.find((c) => c.isConsistent) ??
    candidates[0];

  const lines = best.parsed;

  if (lines.length === 0) {
    return null;
  }

  const numColsFirstLine = lines[0].length;
  const isTable = lines.every((line) => line.length === numColsFirstLine);

  if (!isTable) {
    return null;
  }

  return lines;
};

export const TABLE_CELL_WIDTH = 120;
export const TABLE_CELL_HEIGHT = 32;
export const TABLE_HEADER_HEIGHT = 36;
export const TABLE_PADDING = 8;

/**
 * Calculates dimensions for a table based on cell count.
 */
export const getTableDimensions = (
  rows: number,
  cols: number,
): { width: number; height: number } => {
  return {
    width: cols * TABLE_CELL_WIDTH + TABLE_PADDING * 2,
    height: TABLE_HEADER_HEIGHT + rows * TABLE_CELL_HEIGHT + TABLE_PADDING * 2,
  };
};

/**
 * Creates an HTML string for an editable table.
 */
export const createTableHtml = (
  cells: string[][],
  theme: "light" | "dark",
): string => {
  const isDark = theme === "dark";
  const bg = isDark ? "#1b1913" : "#f7f7f4";
  const headerBg = isDark ? "#26241e" : "#e6e5e0";
  const borderColor = isDark ? "#3d3b35" : "#d4d3ce";
  const textColor = isDark ? "#edecec" : "#26251e";

  const rows = cells
    .map((row, rowIndex) => {
      const tag = rowIndex === 0 ? "th" : "td";
      const cellStyle = rowIndex === 0 ? `background:${headerBg};` : "";
      const cellsHtml = row
        .map(
          (cell) =>
            `<${tag} style="${cellStyle}border:1px solid ${borderColor};padding:6px 8px;color:${textColor};" contenteditable="true">${escapeHtml(
              cell,
            )}</${tag}>`,
        )
        .join("");
      return `<tr>${cellsHtml}</tr>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      background: ${bg};
      color: ${textColor};
      width: 100%;
      height: 100%;
      overflow: auto;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      table-layout: fixed;
    }
    th, td {
      min-width: 80px;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    th {
      font-weight: 600;
    }
    [contenteditable="true"]:focus {
      outline: 2px solid #f54e00;
      outline-offset: -2px;
    }
  </style>
</head>
<body>
  <table>
    ${rows}
  </table>
</body>
</html>`;
};

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};
