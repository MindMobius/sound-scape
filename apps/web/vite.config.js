import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  server: {
    fs: {
      allow: [resolve(import.meta.dirname, "../..")],
    },
  },
  build: {
    target: "es2020",
  },
});
