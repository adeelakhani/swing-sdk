import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    outDir: "dist",
    clean: true,
    sourcemap: true,
    external: ["react", "react-dom", "next"],
    outExtension({ format }) {
      return {
        js: format === "cjs" ? ".js" : ".mjs",
      };
    },
  },
  {
    entry: ["src/react.tsx"],
    format: ["cjs", "esm"],
    dts: true,
    outDir: "dist",
    sourcemap: true,
    external: ["react", "react-dom", "next"],
    outExtension({ format }) {
      return {
        js: format === "cjs" ? ".js" : ".mjs",
      };
    },
  },
]);
