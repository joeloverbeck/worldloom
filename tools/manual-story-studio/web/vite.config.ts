import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    proxy: {
      "/api": "http://127.0.0.1:5175",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
