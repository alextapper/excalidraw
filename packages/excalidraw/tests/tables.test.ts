import { FONT_FAMILY } from "@excalidraw/common";

import { parseTabularText, renderTableFromCells } from "../tables";

describe("parseTabularText", () => {
  it("parses CSV rows and trims cells", () => {
    const result = parseTabularText(
      "id, first_name, last_name\n1, Alice, Awtood\n2, Bob, Billby",
    );

    expect(result).toEqual({
      ok: true,
      data: [
        ["id", "first_name", "last_name"],
        ["1", "Alice", "Awtood"],
        ["2", "Bob", "Billby"],
      ],
    });
  });

  it("parses TSV", () => {
    const result = parseTabularText("name\trole\nAlice\tEngineer\nBob\tDesigner");

    expect(result).toEqual({
      ok: true,
      data: [
        ["name", "role"],
        ["Alice", "Engineer"],
        ["Bob", "Designer"],
      ],
    });
  });

  it("parses quoted CSV cells containing commas", () => {
    const result = parseTabularText(
      'name,notes\nAlice,"likes apples, pears"\nBob,"uses commas, often"',
    );

    expect(result).toEqual({
      ok: true,
      data: [
        ["name", "notes"],
        ["Alice", "likes apples, pears"],
        ["Bob", "uses commas, often"],
      ],
    });
  });

  it("does not treat single-column multiline text as a table", () => {
    const result = parseTabularText("first line\nsecond line\nthird line");

    expect(result).toEqual({
      ok: false,
      reason: "Less than 2 columns",
    });
  });
});

describe("renderTableFromCells", () => {
  it("renders grouped rectangle and text elements per cell", () => {
    const elements = renderTableFromCells({
      cells: [
        ["id", "name"],
        ["1", "Alice"],
        ["2", "Bob"],
      ],
      x: 100,
      y: 200,
      groupId: "table-group",
      frameId: null,
      style: {
        strokeColor: "#1e1e1e",
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        locked: false,
      },
      fontFamily: FONT_FAMILY.Excalifont,
      fontSize: 20,
    });

    const rectangles = elements.filter((element) => element.type === "rectangle");
    const texts = elements.filter((element) => element.type === "text");

    expect(rectangles).toHaveLength(6);
    expect(texts).toHaveLength(6);
    expect(elements.every((element) => element.groupIds[0] === "table-group")).toBe(
      true,
    );
    expect(rectangles.every((element) => element.width > 0)).toBe(true);
    expect(texts.some((element) => element.originalText === "Alice")).toBe(true);
  });
});
