import AppKit

/// Launches the macOS color sampler (magnifying glass cursor) and prints the picked color as a hex string.
/// Usage: color-picker [--format hex|rgb]
/// Output: #RRGGBB (hex) or R,G,B (rgb)
/// Exit code 0 on success, 1 if the user cancels.

@MainActor
func pickColor() async {
    let format = CommandLine.arguments.count > 2 && CommandLine.arguments[1] == "--format"
        ? CommandLine.arguments[2]
        : "hex"

    let sampler = NSColorSampler()

    guard let color = await sampler.sample() else {
        // User cancelled the picker
        exit(1)
    }

    // Convert to sRGB color space for consistent hex values
    guard let rgbColor = color.usingColorSpace(.sRGB) else {
        fputs("Error: Could not convert color to sRGB\n", stderr)
        exit(2)
    }

    let r = Int(round(rgbColor.redComponent * 255))
    let g = Int(round(rgbColor.greenComponent * 255))
    let b = Int(round(rgbColor.blueComponent * 255))

    switch format {
    case "rgb":
        print("\(r),\(g),\(b)")
    default:
        print(String(format: "#%02X%02X%02X", r, g, b))
    }

    exit(0)
}

Task { @MainActor in
    await pickColor()
}

RunLoop.main.run()
