import AppKit
import ObjectiveC
import RaycastSwiftMacros

private final class ColorPanelActionTarget: NSObject {
    var onDone: (() -> Void)?
    var lastHex: String = ""

    @objc func done(_ sender: Any?) { onDone?() }

    @objc func colorChanged(_ sender: Any?) {
        if let panel = sender as? NSColorPanel,
           let hex = nsColorToHex(panel.color) {
            lastHex = hex
        }
    }
}

// Stable key for objc_setAssociatedObject — must be a pointer-sized value at a
// fixed address, so a file-scope variable works perfectly.
private var colorPanelTargetKey: UInt8 = 0

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

private func nsColorToHex(_ color: NSColor) -> String? {
    // Prefer sRGB; fall back to device RGB so unusual panel color spaces don't
    // silently return nil and get misreported as "cancelled".
    if let c = color.usingColorSpace(.sRGB) {
        return String(format: "#%02X%02X%02X",
                      Int(round(c.redComponent   * 255)),
                      Int(round(c.greenComponent * 255)),
                      Int(round(c.blueComponent  * 255)))
    }
    if let c = color.usingColorSpace(.deviceRGB) {
        return String(format: "#%02X%02X%02X",
                      Int(round(c.redComponent   * 255)),
                      Int(round(c.greenComponent * 255)),
                      Int(round(c.blueComponent  * 255)))
    }
    return nil
}

/// Opens the macOS native color panel (full color chooser with color wheel,
/// sliders, spectrum, etc.). Returns the chosen color as a hex string when
/// the user clicks Done, or an empty string if cancelled.
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

            func resume(returning hex: String) {
                guard !hasResumed else { return }
                hasResumed = true

                if let obs = observer {
                    NotificationCenter.default.removeObserver(obs)
                    observer = nil
                }
                panel.setTarget(nil)
                panel.setAction(nil)
                objc_setAssociatedObject(panel, &colorPanelTargetKey, nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)

                stopRunLoop()
                continuation.resume(returning: hex)
            }

            // Use a single action target for both color tracking and Done.
            // NSColorPanel's own target/action fires on every color change
            // (isContinuous = true), so we always have the latest valid hex
            // without needing to read panel.color at close time.
            let actionTarget = ColorPanelActionTarget()
            actionTarget.lastHex = nsColorToHex(panel.color) ?? ""

            // Wire the panel's color-changed action to continuously track the color.
            panel.setTarget(actionTarget)
            panel.setAction(#selector(ColorPanelActionTarget.colorChanged(_:)))

            actionTarget.onDone = {
                let hex = actionTarget.lastHex
                panel.orderOut(nil)
                resume(returning: hex)
            }

            // Pin actionTarget so the weak button target reference stays alive.
            objc_setAssociatedObject(panel, &colorPanelTargetKey, actionTarget, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
            doneButton.target = actionTarget
            doneButton.action = #selector(ColorPanelActionTarget.done(_:))

            // X button / programmatic close → cancel.
            observer = NotificationCenter.default.addObserver(
                forName: NSWindow.willCloseNotification,
                object: panel,
                queue: .main
            ) { _ in
                resume(returning: "")
            }

            panel.makeKeyAndOrderFront(nil)

            // NSApplication.run() is required (not just RunLoop.main.run) because
            // AppKit dispatches NSEvents through NSApplication.nextEvent(matching:),
            // which RunLoop alone does not call.
            app.run()
        }
    }
}
