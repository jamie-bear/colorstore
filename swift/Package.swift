// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "color-picker",
    platforms: [.macOS(.v12)],
    targets: [
        .executableTarget(
            name: "color-picker",
            path: "Sources"
        ),
    ]
)
