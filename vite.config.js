import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/rossi-mission-sf/", // ✅ Ensures correct asset paths on GitHub Pages
  plugins: [react()],
});
