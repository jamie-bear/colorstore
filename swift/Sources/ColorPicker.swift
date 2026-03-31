import AppKit
import RaycastSwiftMacros

/// Launches the macOS native color sampler (magnifying glass cursor).
/// Returns the picked color as a hex string (e.g. "#FF5500"),
/// or an empty string if the user cancels.
@raycast
func pickColor() async -> String {
    let sampler = NSColorSampler()

    guard let color = await sampler.sample() else {
        // User cancelled the picker
        return ""
    }

    // Convert to sRGB color space for consistent hex values
    guard let rgbColor = color.usingColorSpace(.sRGB) else {
        return ""
    }

    let r = Int(round(rgbColor.redComponent * 255))
    let g = Int(round(rgbColor.greenComponent * 255))
    let b = Int(round(rgbColor.blueComponent * 255))

    return String(format: "#%02X%02X%02X", r, g, b)
}
