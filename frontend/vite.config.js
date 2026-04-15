import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 300,
    },
    hmr: {
      host: process.env.VITE_HMR_HOST || "localhost",
      port: 5173,
      clientPort: 5173,
      protocol: "ws",
    },
  },
});
