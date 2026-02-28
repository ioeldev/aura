import { useState, useEffect } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { apiFetch, getWsUrl } from "@/lib/api";
import type { NetworkInfo } from "@/types";

interface UseNetworkStatsResult {
    data: NetworkInfo | null;
    readyState: ReadyState;
}

export function useNetworkStats(): UseNetworkStatsResult {
    const [initialData, setInitialData] = useState<NetworkInfo | null>(null);
    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(getWsUrl, {
        share: true,
        shouldReconnect: () => true,
        reconnectAttempts: 10,
        reconnectInterval: 3000,
    });

    useEffect(() => {
        let cancelled = false;
        apiFetch("/api/network-stats")
            .then((res) => res.ok ? res.json() : null)
            .then((json: NetworkInfo | null) => {
                if (!cancelled && json) setInitialData(json);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (readyState === ReadyState.OPEN) {
            sendJsonMessage({ subscribe: "network_stats" });
        }
    }, [readyState, sendJsonMessage]);

    const msg = lastJsonMessage as { type?: string; data?: NetworkInfo } | null;
    const wsData = msg?.type === "network_stats" && msg.data ? msg.data : null;

    return { data: wsData ?? initialData, readyState };
}
