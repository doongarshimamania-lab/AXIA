import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Sentry source maps upload (only in production builds with DSN set)
    sentryVitePlugin({
      org: import.meta.env?.VITE_SENTRY_ORG || process.env.SENTRY_ORG || "",
      project: import.meta.env?.VITE_SENTRY_PROJECT || process.env.SENTRY_PROJECT || "axia",
      authToken: process.env.SENTRY_AUTH_TOKEN || "",
      release: {
        name: process.env.VITE_GIT_SHA || "dev",
      },
      sourcemaps: {
        filesToDeleteAfterUpload: ["dist/assets/*.map"],
      },
      // Only upload in CI/production
      disabled: process.env.NODE_ENV !== "production" || !process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  base: "/",
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  build: {
    chunkSizeWarningLimit: 1500,
    // Generate source maps for Sentry
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
