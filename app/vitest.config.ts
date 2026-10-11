import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/inventory/*.test.ts", "src/client/navigation.test.ts"],
  },
});
