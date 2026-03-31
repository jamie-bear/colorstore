# Color Store

A [Raycast](https://raycast.com) extension to pick colors from anywhere on your screen, keep a history of picked colors, and organize them into custom palettes.

## Features

### Pick Color

Launch the **Pick Color** command to activate the macOS native color sampler. Your cursor turns into a magnifying glass — click anywhere on your screen(s) to pick a color. The hex value is automatically copied to your clipboard.

### Color History

The **Color History** command shows your last 30 picked colors. For each color you can:

- Copy the hex value (`#FF5500`)
- Copy the RGB value (`rgb(255, 85, 0)`)
- Copy the CSS RGB value (`rgb(255 85 0)`)
- Paste the hex directly into the frontmost app
- Add the color to any palette
- Remove individual entries or clear all history

### Manage Palettes

The **Manage Palettes** command lets you organize colors into named collections. You can:

- Create, rename, and delete palettes
- Add colors manually by entering a hex code or RGB values
- Add colors from your pick history
- Copy any palette color to the clipboard
- Remove individual colors from a palette

## Installation

### From Raycast Store

Search for "Color Store" in the Raycast Store and install it.

### From Source

1. Clone this repository:

   ```bash
   git clone https://github.com/jamie-bear/colorstore.git
   cd colorstore
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build and run in development mode:

   ```bash
   npm run dev
   ```

   This will compile the Swift color picker binary and start the extension in Raycast.

## Requirements

- macOS 12.0 (Monterey) or later
- [Raycast](https://raycast.com) v1.83.0 or later
- Xcode Command Line Tools (for building the Swift color picker binary)

## Architecture

```
colorstore/
├── swift/                     # Native macOS color picker
│   ├── Package.swift
│   └── Sources/
│       └── main.swift         # NSColorSampler wrapper
├── src/
│   ├── pick-color.tsx         # Pick Color command (no-view)
│   ├── color-history.tsx      # Color History command (list view)
│   ├── manage-palettes.tsx    # Manage Palettes command (list view)
│   ├── storage.ts             # LocalStorage persistence layer
│   ├── types.ts               # TypeScript type definitions
│   └── utils.ts               # Color conversion & validation utilities
├── __tests__/
│   ├── utils.test.ts          # Unit tests for color utilities
│   └── storage.test.ts        # Unit tests for storage layer (mocked)
├── package.json               # Raycast extension manifest & dependencies
├── tsconfig.json              # TypeScript configuration
└── vitest.config.ts           # Test runner configuration
```

### Swift Color Picker

The `swift/` directory contains a standalone Swift executable that wraps macOS's `NSColorSampler` API. When invoked, it:

1. Displays the native magnifying glass cursor
2. Waits for the user to click on a pixel
3. Converts the color to sRGB and prints the hex value to stdout
4. Exits with code 0 (success) or 1 (user cancelled)

The TypeScript `pick-color` command launches this binary and reads its output.

### Storage

All data is persisted using Raycast's `LocalStorage` API:

- **Color History** — stored under the `color-history` key as a JSON array of `{ hex, pickedAt }` entries, capped at 30 items.
- **Palettes** — stored under the `palettes` key as a JSON array of `{ id, name, colors, createdAt, updatedAt }` objects.

## Running Tests

```bash
npm test
```

Tests use [Vitest](https://vitest.dev) and mock the Raycast API's `LocalStorage` to test the storage layer and utility functions in isolation.

## Keyboard Shortcuts

| Shortcut              | Context          | Action              |
| --------------------- | ---------------- | ------------------- |
| `⏎` Enter             | Any list         | Primary action      |
| `⌘ N`                 | Palettes list    | Create new palette  |
| `⌘ R`                 | Palettes list    | Rename palette      |
| `⌘ N`                 | Palette detail   | Add color manually  |
| `⌘ H`                 | Palette detail   | Add from history    |
| `⌃ X`                 | Any color item   | Delete / remove     |
| `⌃ ⇧ X`              | Color history    | Clear all history   |

## License

MIT
