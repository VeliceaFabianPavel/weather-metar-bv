import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// On GitHub Pages the app is served from /<repo-name>/. The deploy workflow
// passes BASE_PATH as a build-time env var; locally it defaults to "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});
