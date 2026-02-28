import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import type { NetworkHistoryResponse } from "@/types";

const CACHE_KEY = "aura-network-history";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const POLL_INTERVAL_MS = 60_000;

interface CacheEntry {
    data: NetworkHistoryResponse;
    cachedAt: number;
}

function readCache(): NetworkHistoryResponse | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const entry: CacheEntry = JSON.parse(raw);
        if (Date.now() - entry.cachedAt >= CACHE_TTL_MS) return null;
        return entry.data;
    } catch {
        return null;
    }
}

function writeCache(data: NetworkHistoryResponse): void {
    try {
        const entry: CacheEntry = { data, cachedAt: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch {
        // Ignore localStorage errors (quota, private mode, etc.)
    }
}

export function useNetworkHistory(): NetworkHistoryResponse | null {
    const [data, setData] = useState<NetworkHistoryResponse | null>(readCache);

    useEffect(() => {
        let cancelled = false;

        async function fetchData() {
            try {
                const res = await apiFetch("/api/network-history");
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = (await res.json()) as NetworkHistoryResponse | null;
                if (!cancelled && json) {
                    setData(json);
                    writeCache(json);
                }
            } catch {
                if (!cancelled) setData(readCache());
            }
        }

        void fetchData();
        const id = setInterval(() => void fetchData(), POLL_INTERVAL_MS);

        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    return data;
}
