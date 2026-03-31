/** A single color entry stored in history */
export interface ColorEntry {
  /** Hex color string, e.g. "#FF00AA" */
  hex: string;
  /** ISO 8601 timestamp of when the color was picked */
  pickedAt: string;
}

/** A named color palette */
export interface Palette {
  /** Unique identifier */
  id: string;
  /** User-visible name */
  name: string;
  /** Hex color strings in this palette */
  colors: string[];
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** ISO 8601 timestamp of last modification */
  updatedAt: string;
}
