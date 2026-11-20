import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-markdown") || id.includes("node_modules/remark") || id.includes("node_modules/micromark") || id.includes("node_modules/mdast") || id.includes("node_modules/unified") || id.includes("node_modules/hast")) return "markdown";
          if (id.includes("node_modules/react")) return "react";
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
