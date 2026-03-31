import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts"],
    environment: "node",
    alias: {
      "@raycast/api": path.resolve(__dirname, "__tests__/__mocks__/@raycast/api.ts"),
    },
  },
});
