import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors the "@/*" path alias from tsconfig.json.
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // Tests run on the server side: use the no-op file Next.js uses there.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
});
