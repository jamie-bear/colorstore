import { Clipboard, closeMainWindow, environment, showHUD } from "@raycast/api";
import { execFileSync } from "child_process";
import path from "path";
import { addColorToHistory } from "./storage";

/**
 * Pick Color command (no-view mode).
 *
 * Launches the macOS NSColorSampler via a compiled Swift helper binary.
 * The cursor turns into a magnifying glass; the user clicks to pick a color.
 * The hex value is copied to the clipboard and saved to history.
 */
export default async function Command() {
  // Close the Raycast window so the user can see the screen
  await closeMainWindow();

  const swiftBinary = path.join(environment.assetsPath, "..", "swift", "build", "color-picker");

  try {
    const result = execFileSync(swiftBinary, { timeout: 60000 }).toString().trim();

    if (!result.startsWith("#") || result.length !== 7) {
      await showHUD("❌ Unexpected color format");
      return;
    }

    // Copy to clipboard
    await Clipboard.copy(result);

    // Save to history
    await addColorToHistory(result);

    await showHUD(`🎨 Copied ${result} to clipboard`);
  } catch (error: unknown) {
    const exitCode = (error as { status?: number }).status;
    if (exitCode === 1) {
      // User cancelled the picker
      await showHUD("Color picking cancelled");
    } else {
      await showHUD("❌ Failed to pick color. Is the Swift binary built?");
    }
  }
}
