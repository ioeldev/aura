import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE_PATH for subpath deployment (e.g. /aura). Set via VITE_BASE_PATH at build time.
const basePath = (process.env.VITE_BASE_PATH || "").replace(/\/$/, "");
const base = basePath ? `${basePath}/` : "/";

// https://vite.dev/config/
export default defineConfig({
    base,
    plugins: [
        tailwindcss(),
        react({
            babel: {
                plugins: [["babel-plugin-react-compiler"]],
            },
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 5173,
        proxy: basePath
            ? {
                  [`${basePath}/api`]: {
                      target: "http://localhost:2655",
                      changeOrigin: true,
                      rewrite: (path) => path.slice(basePath.length) || "/",
                  },
                  [`${basePath}/ws`]: {
                      target: "http://localhost:2655",
                      ws: true,
                      rewrite: (path) => path.slice(basePath.length) || "/",
                  },
              }
            : {
                  "/api": { target: "http://localhost:2655", changeOrigin: true },
                  "/ws": { target: "http://localhost:2655", ws: true },
              },
    },
});
