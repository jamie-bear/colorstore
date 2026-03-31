import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { addColorToHistory } from "./storage";
import { isValidHex } from "./utils";
import { pickColor } from "swift:ColorPicker";

/**
 * Pick Color command (no-view mode).
 *
 * Launches the macOS NSColorSampler via Raycast's Swift bridge.
 * The cursor turns into a magnifying glass; the user clicks to pick a color.
 * The hex value is copied to the clipboard and saved to history.
 */
export default async function Command() {
  await closeMainWindow();

  try {
    const hex = await pickColor();

    if (!hex || !isValidHex(hex)) {
      // Empty string means user cancelled
      if (!hex) {
        await showHUD("Color picking cancelled");
      } else {
        await showHUD(`Unexpected color format: ${hex}`);
      }
      return;
    }

    await Clipboard.copy(hex);
    await addColorToHistory(hex);
    await showHUD(`Copied ${hex} to clipboard`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Pick color failed:", message);
    await showHUD(`Failed to pick color: ${message}`);
  }
}
