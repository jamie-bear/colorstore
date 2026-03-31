# Contributing to Color Store

Thank you for your interest in contributing!

## Development Setup

1. Ensure you have [Node.js](https://nodejs.org/) (v20+) and [Raycast](https://raycast.com) installed.
2. Install Xcode Command Line Tools: `xcode-select --install`
3. Clone and install:

   ```bash
   git clone https://github.com/jamie-bear/colorstore.git
   cd colorstore
   npm install
   ```

4. Start development:

   ```bash
   npm run dev
   ```

## Project Structure

- `src/` — TypeScript source for Raycast commands
- `swift/` — Native macOS color picker binary
- `__tests__/` — Unit tests (vitest)

## Code Style

This project uses ESLint with the `@raycast/eslint-config` preset and Prettier for formatting.

```bash
npm run lint        # Check for lint errors
npm run fix-lint    # Auto-fix lint errors
```

## Testing

```bash
npm test
```

All new features should include corresponding tests. The storage layer tests mock `@raycast/api`'s `LocalStorage`.

## Submitting Changes

1. Create a feature branch from `main`
2. Make your changes with clear commit messages
3. Add or update tests as needed
4. Run `npm test` and `npm run lint` to verify
5. Open a pull request with a description of your changes
