import { describe, it, expect } from "vitest";
import { isValidHex, normalizeHex, hexToRgb, rgbToHex, getColorLabel, generateId } from "../src/utils";

describe("isValidHex", () => {
  it("accepts valid 6-digit hex", () => {
    expect(isValidHex("#FF0000")).toBe(true);
    expect(isValidHex("#00ff00")).toBe(true);
    expect(isValidHex("#000000")).toBe(true);
    expect(isValidHex("#FFFFFF")).toBe(true);
  });

  it("accepts valid 3-digit shorthand hex", () => {
    expect(isValidHex("#F00")).toBe(true);
    expect(isValidHex("#fff")).toBe(true);
    expect(isValidHex("#abc")).toBe(true);
  });

  it("accepts valid 8-digit hex (with alpha)", () => {
    expect(isValidHex("#FF000080")).toBe(true);
    expect(isValidHex("#00FF00FF")).toBe(true);
  });

  it("accepts valid 4-digit shorthand hex (with alpha)", () => {
    expect(isValidHex("#F00A")).toBe(true);
    expect(isValidHex("#fffa")).toBe(true);
  });

  it("rejects invalid hex strings", () => {
    expect(isValidHex("")).toBe(false);
    expect(isValidHex("#")).toBe(false);
    expect(isValidHex("#GG0000")).toBe(false);
    expect(isValidHex("FF0000")).toBe(false);
    expect(isValidHex("#FF000")).toBe(false);
    expect(isValidHex("#FF00000")).toBe(false);
    expect(isValidHex("not a color")).toBe(false);
  });
});

describe("normalizeHex", () => {
  it("normalizes 6-digit hex to uppercase", () => {
    expect(normalizeHex("#ff0000")).toBe("#FF0000");
    expect(normalizeHex("#FF0000")).toBe("#FF0000");
  });

  it("expands 3-digit shorthand", () => {
    expect(normalizeHex("#f00")).toBe("#FF0000");
    expect(normalizeHex("#abc")).toBe("#AABBCC");
    expect(normalizeHex("#fff")).toBe("#FFFFFF");
  });

  it("strips alpha from 8-digit hex", () => {
    expect(normalizeHex("#FF000080")).toBe("#FF0000");
    expect(normalizeHex("#aabbccdd")).toBe("#AABBCC");
  });

  it("expands and strips alpha from 4-digit shorthand", () => {
    expect(normalizeHex("#f00a")).toBe("#FF0000");
  });

  it("throws on invalid hex", () => {
    expect(() => normalizeHex("invalid")).toThrow("Invalid hex color");
    expect(() => normalizeHex("#GG0000")).toThrow("Invalid hex color");
  });
});

describe("hexToRgb", () => {
  it("converts hex to RGB", () => {
    expect(hexToRgb("#FF0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb("#00FF00")).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb("#0000FF")).toEqual({ r: 0, g: 0, b: 255 });
    expect(hexToRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("handles 3-digit shorthand", () => {
    expect(hexToRgb("#f00")).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb("#0f0")).toEqual({ r: 0, g: 255, b: 0 });
  });

  it("converts mixed case", () => {
    expect(hexToRgb("#ff8800")).toEqual({ r: 255, g: 136, b: 0 });
  });
});

describe("rgbToHex", () => {
  it("converts RGB to hex", () => {
    expect(rgbToHex(255, 0, 0)).toBe("#FF0000");
    expect(rgbToHex(0, 255, 0)).toBe("#00FF00");
    expect(rgbToHex(0, 0, 255)).toBe("#0000FF");
    expect(rgbToHex(255, 255, 255)).toBe("#FFFFFF");
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
  });

  it("pads single-digit values", () => {
    expect(rgbToHex(1, 2, 3)).toBe("#010203");
  });

  it("throws on out-of-range values", () => {
    expect(() => rgbToHex(-1, 0, 0)).toThrow("Invalid RGB values");
    expect(() => rgbToHex(0, 256, 0)).toThrow("Invalid RGB values");
    expect(() => rgbToHex(0, 0, 1.5)).toThrow("Invalid RGB values");
  });

  it("roundtrips with hexToRgb", () => {
    const hex = "#AB12CD";
    const { r, g, b } = hexToRgb(hex);
    expect(rgbToHex(r, g, b)).toBe(hex);
  });
});

describe("getColorLabel", () => {
  it("identifies primary colors", () => {
    expect(getColorLabel("#FF0000")).toBe("Red");
    expect(getColorLabel("#00FF00")).toBe("Green");
    expect(getColorLabel("#0000FF")).toBe("Blue");
  });

  it("identifies black and white", () => {
    expect(getColorLabel("#000000")).toBe("Black");
    expect(getColorLabel("#FFFFFF")).toBe("White");
  });

  it("identifies gray", () => {
    expect(getColorLabel("#808080")).toBe("Gray");
    expect(getColorLabel("#C0C0C0")).toBe("Gray");
  });

  it("identifies other hues", () => {
    expect(getColorLabel("#FF8800")).toBe("Orange");
    expect(getColorLabel("#FFFF00")).toBe("Yellow");
    expect(getColorLabel("#00FFFF")).toBe("Cyan");
    expect(getColorLabel("#8800FF")).toBe("Purple");
    expect(getColorLabel("#FF0088")).toBe("Pink");
  });
});

describe("generateId", () => {
  it("returns a non-empty string", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
