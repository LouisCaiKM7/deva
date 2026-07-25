// Build script for the deva Notion MV3 extension.
//
// Bundles the two TypeScript entry points (service worker + popup) with esbuild
// as ESM, then copies the static popup assets into dist/. The manifest points at
// the files this script emits, so keep dist/ output names in sync with manifest.json.
//
// Usage:
//   node build.mjs           one-shot dev build
//   node build.mjs --watch   rebuild on change

import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const watch = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: {
    "service-worker": "src/background/service-worker.ts",
    "popup": "src/popup/popup.ts",
  },
  outdir: "dist",
  bundle: true,
  format: "esm",
  target: "es2020",
  minify: false,
  sourcemap: true,
  logLevel: "info",
};

function copyStatic() {
  mkdirSync("dist", { recursive: true });
  cpSync("src/popup/popup.html", "dist/popup.html");
  cpSync("src/popup/popup.css", "dist/popup.css");
  console.log("[build] copied popup.html + popup.css to dist/");
}

// Start from a clean dist so removed files never linger.
rmSync("dist", { recursive: true, force: true });

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.rebuild();
  copyStatic();
  await ctx.watch();
  console.log("[build] watching for changes...");
} else {
  await esbuild.build(buildOptions);
  copyStatic();
  console.log("[build] done");
}
