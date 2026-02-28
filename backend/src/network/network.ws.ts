import WebSocket, { WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { AUTH_ENABLED } from "../config";
import { validateSession } from "../auth/auth.db";
import { fetchNetworkStats } from "./network.route";

const NETWORK_STATS_INTERVAL_MS = 2_000;

export function setupWebSocket(httpServer: Server): void {
    const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
    const networkStatsSubscribers = new Set<WebSocket>();

    wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
        if (AUTH_ENABLED) {
            try {
                const url = new URL(req.url ?? "/", `http://localhost`);
                const token = url.searchParams.get("token");
                if (!token || !validateSession(token)) {
                    ws.close(4001, "Unauthorized");
                    return;
                }
            } catch {
                ws.close(4001, "Unauthorized");
                return;
            }
        }

        ws.on("message", (raw: WebSocket.RawData) => {
            try {
                const msg = JSON.parse(raw.toString()) as { subscribe?: string; unsubscribe?: string };
                if (msg.subscribe === "network_stats") networkStatsSubscribers.add(ws);
                if (msg.unsubscribe === "network_stats") networkStatsSubscribers.delete(ws);
            } catch (_) {
                /* ignore invalid JSON */
            }
        });

        ws.on("close", () => networkStatsSubscribers.delete(ws));
    });

    setInterval(async () => {
        const data = await fetchNetworkStats();
        if (!data) return;
        const payload = JSON.stringify({ type: "network_stats", data });
        for (const ws of networkStatsSubscribers) {
            if (ws.readyState === WebSocket.OPEN) ws.send(payload);
        }
    }, NETWORK_STATS_INTERVAL_MS);
}
