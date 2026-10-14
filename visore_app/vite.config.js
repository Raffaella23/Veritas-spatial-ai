// EIDETICA nel visore (IWSDK). Si costruisce qui e si pubblica nella cartella
// visore/ del repository: GitHub Pages la serve accanto alla pagina di sempre.
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.BASE || "/Veritas-spatial-ai/visore/",
  publicDir: "public",
  build: { outDir: process.env.USCITA || "dist", emptyOutDir: true, target: "esnext", sourcemap: false },
  esbuild: { target: "esnext" },
  optimizeDeps: { exclude: ["@babylonjs/havok"], esbuildOptions: { target: "esnext" } },
  server: { host: "0.0.0.0", port: 5173 },
});
