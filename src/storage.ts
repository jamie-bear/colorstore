import { LocalStorage } from "@raycast/api";
import { ColorEntry, Palette } from "./types";
import { generateId, normalizeHex } from "./utils";

const HISTORY_KEY = "color-history";
const PALETTES_KEY = "palettes";
const MAX_HISTORY = 30;

// --- Color History ---

export async function getColorHistory(): Promise<ColorEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ColorEntry[];
  } catch {
    return [];
  }
}

export async function addColorToHistory(hex: string): Promise<ColorEntry> {
  const normalized = normalizeHex(hex);
  const entry: ColorEntry = {
    hex: normalized,
    pickedAt: new Date().toISOString(),
  };

  const history = await getColorHistory();

  // Remove duplicate if it exists already
  const filtered = history.filter((c) => c.hex !== normalized);

  // Add to front, trim to max
  const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));

  return entry;
}

export async function removeColorFromHistory(hex: string): Promise<void> {
  const history = await getColorHistory();
  const updated = history.filter((c) => c.hex !== hex);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function clearColorHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}

// --- Palettes ---

export async function getPalettes(): Promise<Palette[]> {
  const raw = await LocalStorage.getItem<string>(PALETTES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Palette[];
  } catch {
    return [];
  }
}

async function savePalettes(palettes: Palette[]): Promise<void> {
  await LocalStorage.setItem(PALETTES_KEY, JSON.stringify(palettes));
}

export async function createPalette(name: string, colors: string[] = []): Promise<Palette> {
  const now = new Date().toISOString();
  const palette: Palette = {
    id: generateId(),
    name,
    colors: colors.map(normalizeHex),
    createdAt: now,
    updatedAt: now,
  };

  const palettes = await getPalettes();
  palettes.push(palette);
  await savePalettes(palettes);

  return palette;
}

export async function deletePalette(id: string): Promise<void> {
  const palettes = await getPalettes();
  await savePalettes(palettes.filter((p) => p.id !== id));
}

export async function renamePalette(id: string, name: string): Promise<void> {
  const palettes = await getPalettes();
  const palette = palettes.find((p) => p.id === id);
  if (!palette) throw new Error(`Palette not found: ${id}`);
  palette.name = name;
  palette.updatedAt = new Date().toISOString();
  await savePalettes(palettes);
}

export async function addColorToPalette(id: string, hex: string): Promise<void> {
  const normalized = normalizeHex(hex);
  const palettes = await getPalettes();
  const palette = palettes.find((p) => p.id === id);
  if (!palette) throw new Error(`Palette not found: ${id}`);

  if (!palette.colors.includes(normalized)) {
    palette.colors.push(normalized);
    palette.updatedAt = new Date().toISOString();
    await savePalettes(palettes);
  }
}

export async function removeColorFromPalette(id: string, hex: string): Promise<void> {
  const palettes = await getPalettes();
  const palette = palettes.find((p) => p.id === id);
  if (!palette) throw new Error(`Palette not found: ${id}`);

  palette.colors = palette.colors.filter((c) => c !== hex);
  palette.updatedAt = new Date().toISOString();
  await savePalettes(palettes);
}
