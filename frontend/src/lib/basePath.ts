/**
 * Base path for subpath deployment (e.g. /aura). Set via VITE_BASE_PATH at build time.
 * Used for React Router basename and API/WebSocket URLs.
 */
export const BASE_PATH = (import.meta.env.VITE_BASE_PATH || "").replace(/\/$/, "") || "";
