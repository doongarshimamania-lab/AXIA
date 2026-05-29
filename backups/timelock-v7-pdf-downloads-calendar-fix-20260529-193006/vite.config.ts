import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Safe wrapper for convex/react - prevents query errors from crashing the app
      "convex/react": path.resolve(__dirname, "./src/lib/safe-convex-react.ts"),
      // Internal alias so safe-convex-react.ts can import the ORIGINAL convex/react
      "original-convex-react": path.resolve(__dirname, "./node_modules/convex/react"),
    },
  },
});
