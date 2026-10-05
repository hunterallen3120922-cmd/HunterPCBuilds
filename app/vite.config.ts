import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base "./" lets the site work from any GitHub Pages path (user.github.io/HunterPCBuilds/)
// The finished site is written to the repo root (one folder up) so GitHub Pages can serve it.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: { outDir: "..", emptyOutDir: false },
});
