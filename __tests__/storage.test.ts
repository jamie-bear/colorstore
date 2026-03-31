import { describe, it, expect, beforeEach } from "vitest";
import { LocalStorage } from "@raycast/api";
import {
  getColorHistory,
  addColorToHistory,
  removeColorFromHistory,
  clearColorHistory,
  getPalettes,
  createPalette,
  deletePalette,
  renamePalette,
  addColorToPalette,
  removeColorFromPalette,
} from "../src/storage";

beforeEach(() => {
  // Reset the mock storage between tests
  (LocalStorage as unknown as { _reset: () => void })._reset();
});

describe("Color History", () => {
  it("returns empty array when no history exists", async () => {
    const history = await getColorHistory();
    expect(history).toEqual([]);
  });

  it("adds a color to history", async () => {
    const entry = await addColorToHistory("#FF0000");
    expect(entry.hex).toBe("#FF0000");
    expect(entry.pickedAt).toBeTruthy();

    const history = await getColorHistory();
    expect(history).toHaveLength(1);
    expect(history[0].hex).toBe("#FF0000");
  });

  it("normalizes hex colors on add", async () => {
    const entry = await addColorToHistory("#ff0000");
    expect(entry.hex).toBe("#FF0000");
  });

  it("adds new colors to the front", async () => {
    await addColorToHistory("#FF0000");
    await addColorToHistory("#00FF00");

    const history = await getColorHistory();
    expect(history[0].hex).toBe("#00FF00");
    expect(history[1].hex).toBe("#FF0000");
  });

  it("deduplicates colors (moves to front)", async () => {
    await addColorToHistory("#FF0000");
    await addColorToHistory("#00FF00");
    await addColorToHistory("#FF0000");

    const history = await getColorHistory();
    expect(history).toHaveLength(2);
    expect(history[0].hex).toBe("#FF0000");
    expect(history[1].hex).toBe("#00FF00");
  });

  it("limits history to 30 entries", async () => {
    for (let i = 0; i < 35; i++) {
      const hex = `#${i.toString(16).padStart(2, "0")}0000`;
      await addColorToHistory(hex);
    }

    const history = await getColorHistory();
    expect(history).toHaveLength(30);
  });

  it("removes a color from history", async () => {
    await addColorToHistory("#FF0000");
    await addColorToHistory("#00FF00");
    await removeColorFromHistory("#FF0000");

    const history = await getColorHistory();
    expect(history).toHaveLength(1);
    expect(history[0].hex).toBe("#00FF00");
  });

  it("clears all history", async () => {
    await addColorToHistory("#FF0000");
    await addColorToHistory("#00FF00");
    await clearColorHistory();

    const history = await getColorHistory();
    expect(history).toEqual([]);
  });
});

describe("Palettes", () => {
  it("returns empty array when no palettes exist", async () => {
    const palettes = await getPalettes();
    expect(palettes).toEqual([]);
  });

  it("creates a palette", async () => {
    const palette = await createPalette("Test Palette");
    expect(palette.name).toBe("Test Palette");
    expect(palette.colors).toEqual([]);
    expect(palette.id).toBeTruthy();

    const palettes = await getPalettes();
    expect(palettes).toHaveLength(1);
  });

  it("creates a palette with initial colors", async () => {
    const palette = await createPalette("With Colors", ["#ff0000", "#00ff00"]);
    expect(palette.colors).toEqual(["#FF0000", "#00FF00"]);
  });

  it("deletes a palette", async () => {
    const palette = await createPalette("To Delete");
    await deletePalette(palette.id);

    const palettes = await getPalettes();
    expect(palettes).toHaveLength(0);
  });

  it("renames a palette", async () => {
    const palette = await createPalette("Original");
    // Small delay to ensure updatedAt differs
    await new Promise((r) => setTimeout(r, 5));
    await renamePalette(palette.id, "Renamed");

    const palettes = await getPalettes();
    expect(palettes[0].name).toBe("Renamed");
    expect(palettes[0].updatedAt).not.toBe(palette.updatedAt);
  });

  it("throws when renaming non-existent palette", async () => {
    await expect(renamePalette("nonexistent", "Name")).rejects.toThrow("Palette not found");
  });

  it("adds a color to a palette", async () => {
    const palette = await createPalette("My Palette");
    await addColorToPalette(palette.id, "#FF0000");

    const palettes = await getPalettes();
    expect(palettes[0].colors).toEqual(["#FF0000"]);
  });

  it("normalizes colors when adding to palette", async () => {
    const palette = await createPalette("My Palette");
    await addColorToPalette(palette.id, "#ff0000");

    const palettes = await getPalettes();
    expect(palettes[0].colors).toEqual(["#FF0000"]);
  });

  it("does not add duplicate colors to palette", async () => {
    const palette = await createPalette("My Palette");
    await addColorToPalette(palette.id, "#FF0000");
    await addColorToPalette(palette.id, "#FF0000");

    const palettes = await getPalettes();
    expect(palettes[0].colors).toEqual(["#FF0000"]);
  });

  it("removes a color from a palette", async () => {
    const palette = await createPalette("My Palette");
    await addColorToPalette(palette.id, "#FF0000");
    await addColorToPalette(palette.id, "#00FF00");
    await removeColorFromPalette(palette.id, "#FF0000");

    const palettes = await getPalettes();
    expect(palettes[0].colors).toEqual(["#00FF00"]);
  });

  it("throws when adding color to non-existent palette", async () => {
    await expect(addColorToPalette("nonexistent", "#FF0000")).rejects.toThrow("Palette not found");
  });

  it("throws when removing color from non-existent palette", async () => {
    await expect(removeColorFromPalette("nonexistent", "#FF0000")).rejects.toThrow("Palette not found");
  });

  it("handles multiple palettes independently", async () => {
    const p1 = await createPalette("Palette 1");
    const p2 = await createPalette("Palette 2");

    await addColorToPalette(p1.id, "#FF0000");
    await addColorToPalette(p2.id, "#00FF00");

    const palettes = await getPalettes();
    const found1 = palettes.find((p) => p.id === p1.id)!;
    const found2 = palettes.find((p) => p.id === p2.id)!;

    expect(found1.colors).toEqual(["#FF0000"]);
    expect(found2.colors).toEqual(["#00FF00"]);
  });
});
