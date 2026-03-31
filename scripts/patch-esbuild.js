/**
 * Patches esbuild to handle empty metafile responses gracefully.
 *
 * esbuild 0.27.x has a bug where build errors combined with metafile: true
 * return an empty metafile buffer (0-byte Uint8Array). Since empty arrays are
 * truthy in JS, the check `if (response.metafile)` passes and JSON.parse("")
 * throws "Unexpected end of JSON input", masking the actual build error.
 *
 * This patch adds a length check so the real error is surfaced instead.
 */
const fs = require("fs");
const path = require("path");

const esbuildMain = path.join(__dirname, "..", "node_modules", "esbuild", "lib", "main.js");

if (!fs.existsSync(esbuildMain)) {
  process.exit(0);
}

let code = fs.readFileSync(esbuildMain, "utf8");

const target = "if (response.metafile) result.metafile = parseJSON(response.metafile);";
const replacement =
  "if (response.metafile && response.metafile.length > 0) result.metafile = parseJSON(response.metafile);";

if (code.includes(replacement)) {
  process.exit(0);
}

if (!code.includes(target)) {
  console.warn("patch-esbuild: could not find target string, skipping patch");
  process.exit(0);
}

code = code.replace(target, replacement);
fs.writeFileSync(esbuildMain, code);
