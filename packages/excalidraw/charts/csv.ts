/**
 * Parses a CSV/TSV/semicolon-separated text string into a 2D array of cells.
 * Unlike tryParseSpreadsheet, this does not require numeric data — any
 * consistently-columned tabular text qualifies.
 */
export const tryParseCSVCells = (text: string): string[][] | null => {
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
    candidates.find((c) => c.isConsistent && c.numCols > 1) ??
    candidates.find((c) => c.isConsistent) ??
    candidates[0];

  const lines = best.parsed;

  if (lines.length === 0) {
    return null;
  }

  const numColsFirstLine = lines[0].length;
  const isTabular = lines.every((line) => line.length === numColsFirstLine);

  if (!isTabular || numColsFirstLine < 2 || lines.length < 2) {
    return null;
  }

  return lines;
};
