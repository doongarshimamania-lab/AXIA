import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split by package
            if (id.includes('react-dom')) return 'vendor-react-dom';
            if (id.includes('react/')) return 'vendor-react';
            if (id.includes('convex')) return 'vendor-convex';
            if (id.includes('recharts')) return 'vendor-recharts';
            if (id.includes('html2canvas')) return 'vendor-html2canvas';
            if (id.includes('dompurify') || id.includes('purify')) return 'vendor-dompurify';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('radix-ui')) return 'vendor-radix';
            if (id.includes('date-fns')) return 'vendor-date';
            if (id.includes('jspdf')) return 'vendor-jspdf';
            if (id.includes('@langchain')) return 'vendor-langchain';
            // Everything else
            return 'vendor-misc';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "convex/react": path.resolve(__dirname, "./src/lib/safe-convex-react.ts"),
      "original-convex-react": path.resolve(__dirname, "./node_modules/convex/react"),
    },
  },
});
