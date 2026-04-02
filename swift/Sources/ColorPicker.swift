import AppKit
import ObjectiveC
import RaycastSwiftMacros

private final class ColorPanelActionTarget: NSObject {
    var onDone: (() -> Void)?
    @objc func done(_ sender: Any?) { onDone?() }
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

            // CFRunLoopStop is more reliable than NSApplication.stop() in a
            // plugin subprocess: it stops the run loop immediately without
            // needing a dummy event to flush a "stop requested" flag.
            func stopRunLoop() {
                CFRunLoopStop(RunLoop.main.getCFRunLoop())
            }

            var observer: NSObjectProtocol?

            func finish(with color: NSColor?) {
                guard !hasResumed else { return }
                hasResumed = true

                if let obs = observer {
                    NotificationCenter.default.removeObserver(obs)
                    observer = nil
                }
                // Clear the retained target so it can be released after we finish.
                objc_setAssociatedObject(panel, &colorPanelTargetKey, nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)

                guard let color, let hex = nsColorToHex(color) else {
                    stopRunLoop()
                    continuation.resume(returning: "")
                    return
                }

                stopRunLoop()
                continuation.resume(returning: hex)
            }

            // Done button: use a direct target-action so we read panel.color
            // before the panel is hidden/closed (reading it inside
            // willCloseNotification is too late and can yield an unconvertible color).
            let actionTarget = ColorPanelActionTarget()
            actionTarget.onDone = {
                let color = panel.color   // snapshot while panel is fully live
                panel.orderOut(nil)       // hide; does NOT fire willCloseNotification
                finish(with: color)
            }
            // NSButton holds only a weak reference to its target. Pin actionTarget
            // to the panel (a long-lived singleton) so it cannot be deallocated
            // while the panel is visible, regardless of whether app.run() or
            // RunLoop.main.run() keeps the GCD block on the stack.
            objc_setAssociatedObject(panel, &colorPanelTargetKey, actionTarget, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
            doneButton.target = actionTarget
            doneButton.action = #selector(ColorPanelActionTarget.done(_:))

            // X button / programmatic close falls through to willCloseNotification.
            observer = NotificationCenter.default.addObserver(
                forName: NSWindow.willCloseNotification,
                object: panel,
                queue: .main
            ) { _ in
                finish(with: panel.color)
            }

            panel.makeKeyAndOrderFront(nil)

            // RunLoop.main.run(until:) is more reliable than NSApplication.run()
            // in a Raycast plugin subprocess: NSApplication.run() can return early
            // if the app object thinks it is already running or not yet launched,
            // which would deallocate stack-local objects and silently break the
            // Done button. RunLoop.main.run(until:) unconditionally pumps the main
            // run loop until CFRunLoopStop() is called from finish().
            RunLoop.main.run(until: .distantFuture)
        }
    }
}
