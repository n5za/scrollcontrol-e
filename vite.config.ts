import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, "src/popup/index.html"),
        background: path.resolve(__dirname, "src/background/service-worker.ts"),
        "content-youtube": path.resolve(__dirname, "src/content/youtube/content.ts"),
        "content-instagram": path.resolve(__dirname, "src/content/instagram/content.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "background") return "background.js";
          if (chunkInfo.name === "content-youtube") return "content-youtube.js";
          if (chunkInfo.name === "content-instagram") return "content-instagram.js";
          if (chunkInfo.name === "popup") return "popup.js";
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
    target: "esnext",
    minify: "esbuild",
    sourcemap: process.env.NODE_ENV === "development",
  },
});
