import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Extra hostnames allowed to reach the dev server (comma separated), e.g. a
// cloud preview hostname. Kept opt-in so the default stays localhost-only.
const allowedHosts = (process.env.VITE_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts,
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts,
  },
});
