import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Allow importing `../Addresses.json` from the monorepo root.
  server: {
    fs: {
      allow: [".."],
    },
  },
});
