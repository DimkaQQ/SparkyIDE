import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Extra hostnames allowed to reach the dev server (comma separated), e.g. a
// cloud preview hostname. Kept opt-in so the default stays localhost-only.
const allowedHosts = (process.env.VITE_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

// GitHub's OAuth endpoints send no CORS headers, so the browser cannot call
// them directly. This proxy keeps the device flow same-origin while the app is
// served by Vite (npm run dev / npm run preview). A static build needs an
// equivalent proxy in front of github.com.
const githubOAuthProxy = {
  "/github-oauth": {
    target: "https://github.com",
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/github-oauth/, ""),
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts,
    proxy: githubOAuthProxy,
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts,
    proxy: githubOAuthProxy,
  },
});
