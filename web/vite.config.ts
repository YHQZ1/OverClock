import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The game server the dev proxy talks to (e2e tests point this at their own server).
const SERVER = process.env.OVERCLOCK_SERVER ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/socket.io": {
        target: SERVER,
        ws: true,
        // A tab closing mid-connection resets the socket — normal, not worth an error log.
        configure: (proxy) => proxy.on("error", (err) => (err as NodeJS.ErrnoException).code !== "ECONNRESET" && console.error(err)),
      },
      "/api": SERVER,
    },
  },
});
