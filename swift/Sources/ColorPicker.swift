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

/// Opens the macOS native color panel (full color chooser with color wheel,
/// sliders, spectrum, etc.). Returns the chosen color as a hex string when
/// the user closes the panel, or an empty string if cancelled/invalid.
@raycast
func chooseColor() async -> String {
    await withCheckedContinuation { continuation in
        var hasResumed = false

        DispatchQueue.main.async {
            NSApp.setActivationPolicy(.accessory)
            NSApp.activate(ignoringOtherApps: true)

            let panel = NSColorPanel.shared
            panel.isContinuous = true
            panel.isFloatingPanel = true
            panel.hidesOnDeactivate = false
            panel.showsAlpha = false

            // Add a "Done" button as accessory view so the user can confirm
            let container = NSView(frame: NSRect(x: 0, y: 0, width: 220, height: 44))
            let doneButton = NSButton(frame: NSRect(x: 62, y: 8, width: 96, height: 28))
            doneButton.title = "Done"
            doneButton.bezelStyle = .rounded
            doneButton.keyEquivalent = "\r"
            container.addSubview(doneButton)
            panel.accessoryView = container

            func resolveColor() {
                guard !hasResumed else { return }
                hasResumed = true

                let color = panel.color
                guard let rgbColor = color.usingColorSpace(.sRGB) else {
                    continuation.resume(returning: "")
                    return
                }

                let r = Int(round(rgbColor.redComponent * 255))
                let g = Int(round(rgbColor.greenComponent * 255))
                let b = Int(round(rgbColor.blueComponent * 255))

                continuation.resume(returning: String(format: "#%02X%02X%02X", r, g, b))
            }

            // Handle "Done" button click
            doneButton.target = nil
            doneButton.action = #selector(NSColorPanel.close)

            // Handle panel close (both via Done button and window close button)
            var observer: NSObjectProtocol?
            observer = NotificationCenter.default.addObserver(
                forName: NSWindow.willCloseNotification,
                object: panel,
                queue: .main
            ) { _ in
                if let obs = observer {
                    NotificationCenter.default.removeObserver(obs)
                    observer = nil
                }
                resolveColor()
            }

            panel.makeKeyAndOrderFront(nil)
        }
    }
}
