import { build } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function bundleContentScripts() {
  const sharedConstants = path.resolve(__dirname, "src/shared/constants.ts");
  const sharedUtils = path.resolve(__dirname, "src/shared/utils.ts");

  // Bundle YouTube content script
  await build({
    entryPoints: [path.resolve(__dirname, "src/content/youtube/content.ts")],
    bundle: true,
    format: "iife",
    outfile: path.resolve(__dirname, "dist/content-youtube.js"),
    target: "es2020",
    minify: true,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  });

  // Bundle Instagram content script
  await build({
    entryPoints: [path.resolve(__dirname, "src/content/instagram/content.ts")],
    bundle: true,
    format: "iife",
    outfile: path.resolve(__dirname, "dist/content-instagram.js"),
    target: "es2020",
    minify: true,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  });

  console.log("Content scripts bundled successfully");
}

bundleContentScripts().catch(console.error);
