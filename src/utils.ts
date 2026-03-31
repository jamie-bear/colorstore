/**
 * Color utility functions for hex/RGB conversion and validation.
 */

/** Validate a hex color string (3, 4, 6, or 8 hex digits with leading #) */
export function isValidHex(hex: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(hex);
}

/** Normalize a hex color to uppercase 6-digit format (e.g. "#fff" -> "#FFFFFF") */
export function normalizeHex(hex: string): string {
  if (!isValidHex(hex)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  let h = hex.slice(1).toUpperCase();

  // Expand 3-digit shorthand to 6-digit
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  // Expand 4-digit shorthand to 8-digit (with alpha)
  if (h.length === 4) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  // Strip alpha channel if present (take first 6 chars)
  if (h.length === 8) {
    h = h.slice(0, 6);
  }

  return `#${h}`;
}

/** Convert hex color to RGB components */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex);
  const num = parseInt(normalized.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/** Convert RGB components to hex color */
export function rgbToHex(r: number, g: number, b: number): string {
  if ([r, g, b].some((v) => v < 0 || v > 255 || !Number.isInteger(v))) {
    throw new Error(`Invalid RGB values: ${r}, ${g}, ${b}`);
  }
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

/** Generate a unique ID */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Get a human-readable color name approximation based on hue */
export function getColorLabel(hex: string): string {
  const { r, g, b } = hexToRgb(hex);

  // Check for grayscale
  if (r === g && g === b) {
    if (r === 0) return "Black";
    if (r === 255) return "White";
    return "Gray";
  }

  // Calculate HSL hue
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;

  if (max === min) return "Gray";

  const d = max - min;
  let h = 0;
  if (max === rNorm) h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
  else if (max === gNorm) h = ((bNorm - rNorm) / d + 2) / 6;
  else h = ((rNorm - gNorm) / d + 4) / 6;

  const hue = h * 360;
  const saturation = d / (1 - Math.abs(2 * l - 1));

  if (saturation < 0.1) return "Gray";
  if (l < 0.15) return "Dark";
  if (l > 0.9) return "Light";

  if (hue < 15) return "Red";
  if (hue < 45) return "Orange";
  if (hue < 65) return "Yellow";
  if (hue < 160) return "Green";
  if (hue < 200) return "Cyan";
  if (hue < 260) return "Blue";
  if (hue < 300) return "Purple";
  if (hue < 340) return "Pink";
  return "Red";
}
