/**
 * Base path for subpath deployment (e.g. /aura). Injected at runtime by the server.
 * Used for React Router basename and API/WebSocket URLs.
 */
declare global {
    interface Window {
        __BASE_PATH__?: string;
    }
}
export const BASE_PATH = ((typeof window !== "undefined" ? window.__BASE_PATH__ : undefined) || "").replace(/\/$/, "") || "";
