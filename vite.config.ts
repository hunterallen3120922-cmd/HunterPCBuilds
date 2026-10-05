import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base "./" lets the site work from any GitHub Pages path (user.github.io/HunterPCBuilds/)
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
