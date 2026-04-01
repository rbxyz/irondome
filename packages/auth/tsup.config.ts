import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts", "src/jwt.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ["@irondome/core", "drizzle-orm"],
  },
  {
    entry: { pg: "src/schema/pg.ts" },
    outDir: "dist/schema",
    format: ["esm"],
    dts: true,
    sourcemap: true,
    external: ["drizzle-orm"],
  },
]);
