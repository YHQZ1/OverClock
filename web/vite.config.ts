import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const SERVER = "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/socket.io": { target: SERVER, ws: true },
      "/api": SERVER,
    },
  },
});
