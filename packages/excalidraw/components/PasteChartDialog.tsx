import React, { useLayoutEffect, useRef, useState } from "react";

import { newTextElement } from "@excalidraw/element";

import type { ChartType } from "@excalidraw/element/types";

import { trackEvent } from "../analytics";
import {
  isSpreadsheetValidForChartType,
  renderSpreadsheet,
  renderTable,
} from "../charts";
import { t } from "../i18n";
import { exportToSvg } from "../scene/export";

import { useUIAppState } from "../context/ui-appState";

import { useApp } from "./App";
import { Dialog } from "./Dialog";

import "./PasteChartDialog.scss";

import { bucketFillIcon } from "./icons";

import type { ChartElements, Spreadsheet } from "../charts";

type OnPlainTextPaste = (rawText: string) => void;

type OnInsertChart = (chartType: ChartType, elements: ChartElements) => void;

const getChartTypeLabel = (chartType: ChartType) => {
  switch (chartType) {
    case "bar":
      return t("labels.chartType_bar");
    case "line":
      return t("labels.chartType_line");
    case "radar":
      return t("labels.chartType_radar");
    default:
      return chartType;
  }
};

const ChartPreviewBtn = (props: {
  spreadsheet: Spreadsheet | null;
  chartType: ChartType;
  colorSeed: number;
  onClick: OnInsertChart;
}) => {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [chartElements, setChartElements] = useState<ChartElements | null>(
    null,
  );
  const { theme } = useUIAppState();

  useLayoutEffect(() => {
    if (!props.spreadsheet) {
      setChartElements(null);
      return;
    }

    const elements = renderSpreadsheet(
      props.chartType,
      props.spreadsheet,
      0,
      0,
      props.colorSeed,
    );
    if (!elements) {
      setChartElements(null);
      previewRef.current?.replaceChildren();
      return;
    }
    setChartElements(elements);
    let svg: SVGSVGElement;
    const previewNode = previewRef.current!;

    (async () => {
      svg = await exportToSvg(
        elements,
        {
          exportBackground: false,
          viewBackgroundColor: "#fff",
          exportWithDarkMode: theme === "dark",
        },
        null, // files
        {
          skipInliningFonts: true,
        },
      );
      svg.querySelector(".style-fonts")?.remove();
      previewNode.replaceChildren();
      previewNode.appendChild(svg);
    })();

    return () => {
      previewNode.replaceChildren();
    };
  }, [props.spreadsheet, props.chartType, props.colorSeed, theme]);

  const chartTypeLabel = getChartTypeLabel(props.chartType);

  return (
    <button
      type="button"
      className="ChartPreview"
      aria-label={chartTypeLabel}
      onClick={() => {
        if (chartElements) {
          props.onClick(props.chartType, chartElements);
        }
      }}
    >
      <div className="ChartPreview__canvas" ref={previewRef} />
      <div className="ChartPreview__label">{chartTypeLabel}</div>
    </button>
  );
};

const TablePreviewBtn = (props: {
  csvCells: string[][];
  onClick: (elements: ChartElements) => void;
}) => {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [tableElements, setTableElements] = useState<ChartElements | null>(
    null,
  );
  const { theme } = useUIAppState();

  useLayoutEffect(() => {
    if (!props.csvCells || props.csvCells.length < 2) {
      setTableElements(null);
      return;
    }

    const elements = renderTable(props.csvCells, 0, 0);
    if (!elements) {
      setTableElements(null);
      previewRef.current?.replaceChildren();
      return;
    }
    setTableElements(elements);
    const previewNode = previewRef.current!;

    (async () => {
      const svg = await exportToSvg(
        elements,
        {
          exportBackground: false,
          viewBackgroundColor: "#fff",
          exportWithDarkMode: theme === "dark",
        },
        null,
        {
          skipInliningFonts: true,
        },
      );
      svg.querySelector(".style-fonts")?.remove();
      previewNode.replaceChildren();
      previewNode.appendChild(svg);
    })();

    return () => {
      previewNode.replaceChildren();
    };
  }, [props.csvCells, theme]);

  return (
    <button
      type="button"
      className="ChartPreview"
      aria-label={t("labels.chartType_table")}
      onClick={() => {
        if (tableElements) {
          props.onClick(tableElements);
        }
      }}
    >
      <div className="ChartPreview__canvas" ref={previewRef} />
      <div className="ChartPreview__label">{t("labels.chartType_table")}</div>
    </button>
  );
};

const PlainTextPreviewBtn = (props: {
  rawText: string;
  onClick: OnPlainTextPaste;
}) => {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useUIAppState();

  useLayoutEffect(() => {
    if (!props.rawText) {
      return;
    }

    const textElement = newTextElement({
      text: props.rawText,
      x: 0,
      y: 0,
    });

    const previewNode = previewRef.current!;

    (async () => {
      const svg = await exportToSvg(
        [textElement],
        {
          exportBackground: false,
          viewBackgroundColor: "#fff",
          exportWithDarkMode: theme === "dark",
        },
        null,
        {
          skipInliningFonts: true,
        },
      );
      svg.querySelector(".style-fonts")?.remove();
      previewNode.replaceChildren();
      previewNode.appendChild(svg);
    })();

    return () => {
      previewNode.replaceChildren();
    };
  }, [props.rawText, theme]);

  return (
    <button
      type="button"
      className="ChartPreview"
      aria-label={t("labels.chartType_plaintext")}
      onClick={() => {
        props.onClick(props.rawText);
      }}
    >
      <div className="ChartPreview__canvas" ref={previewRef} />
      <div className="ChartPreview__label">
        {t("labels.chartType_plaintext")}
      </div>
    </button>
  );
};

export const PasteChartDialog = ({
  data,
  rawText,
  csvCells,
  onClose,
}: {
  data: Spreadsheet | null;
  rawText: string;
  csvCells?: string[][] | null;
  onClose: () => void;
}) => {
  const { onInsertElements, focusContainer } = useApp();
  const [colorSeed, setColorSeed] = useState(Math.random());

  const handleReshuffleColors = React.useCallback(() => {
    setColorSeed(Math.random());
  }, []);

  const handleClose = React.useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  const handleChartClick = (chartType: ChartType, elements: ChartElements) => {
    onInsertElements(elements);
    trackEvent("paste", "chart", chartType);
    onClose();
    focusContainer();
  };

  const handleTableClick = (elements: ChartElements) => {
    onInsertElements(elements);
    trackEvent("paste", "chart", "table");
    onClose();
    focusContainer();
  };

  const handlePlainTextClick = (rawText: string) => {
    const textElement = newTextElement({
      text: rawText,
      x: 0,
      y: 0,
    });
    onInsertElements([textElement]);
    trackEvent("paste", "chart", "plaintext");
    onClose();
    focusContainer();
  };

  const hasChartData = data !== null;
  const hasTableData = csvCells && csvCells.length >= 2;
  const dialogTitle = hasChartData
    ? t("labels.pasteCharts")
    : t("labels.pasteChartsOrTable");

  return (
    <Dialog
      size="regular"
      onCloseRequest={handleClose}
      title={
        <div className="PasteChartDialog__title">
          <div className="PasteChartDialog__titleText">{dialogTitle}</div>
          {hasChartData && (
            <div
              className="PasteChartDialog__reshuffleBtn"
              onClick={handleReshuffleColors}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleReshuffleColors();
                }
              }}
            >
              {bucketFillIcon}
            </div>
          )}
        </div>
      }
      className={"PasteChartDialog"}
      autofocus={false}
    >
      <div className={"container"}>
        {hasChartData &&
          (["bar", "line", "radar"] as const).map((chartType) => {
            if (!isSpreadsheetValidForChartType(data, chartType)) {
              return null;
            }

            return (
              <ChartPreviewBtn
                key={chartType}
                chartType={chartType}
                spreadsheet={data}
                colorSeed={colorSeed}
                onClick={handleChartClick}
              />
            );
          })}
        {hasTableData && (
          <TablePreviewBtn csvCells={csvCells} onClick={handleTableClick} />
        )}
        {rawText && (
          <PlainTextPreviewBtn
            rawText={rawText}
            onClick={handlePlainTextClick}
          />
        )}
      </div>
    </Dialog>
  );
};
