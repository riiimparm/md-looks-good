import esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const isWatch = process.argv.includes("--watch");

const shared = {
  bundle: true,
  outdir: "dist",
  target: ["chrome110"],
  sourcemap: true,
  minify: !isWatch,
  loader: { ".css": "text" },
};

const iifeOptions = {
  ...shared,
  entryPoints: {
    "content/index": "src/content/index.ts",
    "popup/index": "src/popup/index.ts",
    "options/index": "src/options/index.ts",
  },
  format: "iife",
};

const esmOptions = {
  ...shared,
  entryPoints: {
    "background/index": "src/background/index.ts",
  },
  format: "esm",
};

function copyStatic() {
  rmSync("dist", { recursive: true, force: true });
  mkdirSync("dist", { recursive: true });
  cpSync("public", "dist", { recursive: true });
  cpSync("manifest.json", "dist/manifest.json");
  mkdirSync("dist/popup", { recursive: true });
  mkdirSync("dist/options", { recursive: true });
  cpSync("src/popup/popup.css", "dist/popup/popup.css");
  cpSync("src/options/options.css", "dist/options/options.css");
}

copyStatic();

if (isWatch) {
  const ctxIife = await esbuild.context(iifeOptions);
  const ctxEsm = await esbuild.context(esmOptions);
  await Promise.all([ctxIife.watch(), ctxEsm.watch()]);
  console.log("watching for changes...");
} else {
  await Promise.all([esbuild.build(iifeOptions), esbuild.build(esmOptions)]);
  console.log("build complete");
}
