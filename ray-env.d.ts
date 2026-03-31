/// <reference types="@raycast/api">

declare module "swift:../swift" {
  /** Launches macOS NSColorSampler. Returns hex string or empty string if cancelled. */
  export function pickColor(): Promise<string>;
}
