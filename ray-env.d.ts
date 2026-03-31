/// <reference types="@raycast/api">

declare module "swift:ColorPicker" {
  /** Launches macOS NSColorSampler. Returns hex string or empty string if cancelled. */
  export function pickColor(): Promise<string>;
}
