import React from "react";

import { newTextElement } from "@excalidraw/element";

import { trackEvent } from "../analytics";
import { t } from "../i18n";

import { useApp } from "./App";
import { Dialog } from "./Dialog";

import "./PasteChartDialog.scss";

export const PasteTableDialog = ({
  cells,
  rawText,
  onClose,
}: {
  cells: string[][];
  rawText: string;
  onClose: () => void;
}) => {
  const { insertTableElement, onInsertElements, focusContainer } = useApp();

  const handleClose = React.useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  const handleTableClick = () => {
    insertTableElement({ cells });
    trackEvent("paste", "table", "table");
    onClose();
    focusContainer();
  };

  const handlePlainTextClick = () => {
    const textElement = newTextElement({
      text: rawText,
      x: 0,
      y: 0,
    });
    onInsertElements([textElement]);
    trackEvent("paste", "table", "plaintext");
    onClose();
    focusContainer();
  };

  return (
    <Dialog
      size="regular"
      onCloseRequest={handleClose}
      title={t("labels.pasteCharts")}
      className="PasteChartDialog"
      autofocus={false}
    >
      <div className="container">
        <button
          type="button"
          className="ChartPreview"
          aria-label={t("labels.chartType_table")}
          onClick={handleTableClick}
        >
          <div className="ChartPreview__canvas ChartPreview__table-preview">
            <table>
              <tbody>
                {cells.slice(0, 4).map((row, i) => (
                  <tr key={i}>
                    {row.slice(0, 3).map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ChartPreview__label">
            {t("labels.chartType_table")}
          </div>
        </button>
        <button
          type="button"
          className="ChartPreview"
          aria-label={t("labels.chartType_plaintext")}
          onClick={handlePlainTextClick}
        >
          <div className="ChartPreview__canvas ChartPreview__plaintext-preview">
            {rawText.slice(0, 80)}
            {rawText.length > 80 ? "…" : ""}
          </div>
          <div className="ChartPreview__label">
            {t("labels.chartType_plaintext")}
          </div>
        </button>
      </div>
    </Dialog>
  );
};
