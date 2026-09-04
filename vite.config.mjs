import { resolve } from "node:path";
import { defineConfig } from "vite";

const pagesBuild = process.env.VITE_PAGES === "true";

export default defineConfig({
  root: "src",
  base: pagesBuild ? "/sort_animation/" : "/",
  build: {
    outDir: resolve(process.cwd(), pagesBuild ? "docs" : "dist"),
    emptyOutDir: true,
  },
});
