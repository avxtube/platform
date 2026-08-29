import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/server.ts"],
    format: ["esm"],
    platform: "node",
    target: "node20",
    bundle: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    noExternal: ["@workspace/auth", "@workspace/core", "@workspace/db"],
    external: ["mongodb", "mongoose"],
});
