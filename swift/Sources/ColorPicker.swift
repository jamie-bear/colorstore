import AppKit
import ObjectiveC
import RaycastSwiftMacros

private final class ColorPanelActionTarget: NSObject {
    var onDone: (() -> Void)?
    @objc func done(_ sender: Any?) { onDone?() }
}

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
            let app = NSApplication.shared
            app.setActivationPolicy(.accessory)
            app.activate(ignoringOtherApps: true)

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

            func stopRunLoop() {
                // stop() sets a flag; posting a dummy event ensures the loop
                // processes it immediately rather than waiting for the next real event.
                app.stop(nil)
                let dummy = NSEvent.otherEvent(
                    with: .applicationDefined,
                    location: .zero,
                    modifierFlags: [],
                    timestamp: 0,
                    windowNumber: 0,
                    context: nil,
                    subtype: 0,
                    data1: 0,
                    data2: 0
                )!
                app.postEvent(dummy, atStart: true)
            }

            var observer: NSObjectProtocol?

            func finish(with color: NSColor?) {
                guard !hasResumed else { return }
                hasResumed = true

                if let obs = observer {
                    NotificationCenter.default.removeObserver(obs)
                    observer = nil
                }

                guard let color,
                      let rgbColor = color.usingColorSpace(.sRGB) else {
                    stopRunLoop()
                    continuation.resume(returning: "")
                    return
                }

                let r = Int(round(rgbColor.redComponent * 255))
                let g = Int(round(rgbColor.greenComponent * 255))
                let b = Int(round(rgbColor.blueComponent * 255))

                stopRunLoop()
                continuation.resume(returning: String(format: "#%02X%02X%02X", r, g, b))
            }

            // Done button: capture color *before* hiding the panel so we don't
            // depend on reading it from the close notification (where the panel
            // color can be stale or unconvertible).
            let actionTarget = ColorPanelActionTarget()
            actionTarget.onDone = {
                let color = panel.color   // snapshot while panel is still live
                panel.orderOut(nil)       // hide without triggering willCloseNotification
                finish(with: color)
            }
            // NSButton holds a weak reference to its target; the GCD closure that
            // is blocked inside app.run() keeps actionTarget alive for us.
            doneButton.target = actionTarget
            doneButton.action = #selector(ColorPanelActionTarget.done(_:))

            // X button / programmatic close fall through to willCloseNotification.
            observer = NotificationCenter.default.addObserver(
                forName: NSWindow.willCloseNotification,
                object: panel,
                queue: .main
            ) { _ in
                finish(with: panel.color)
            }

            panel.makeKeyAndOrderFront(nil)
            app.run()  // pump the AppKit event loop until stopRunLoop() is called
        }
    }
}
