import { Router } from "express";
import { execSync } from "child_process";
import si from "systeminformation";
import type { NetworkHistoryResponse, NetworkStatsResult } from "../types";

export const networkRouter = Router();

export async function fetchNetworkStats(): Promise<NetworkStatsResult | null> {
    try {
        const defaultIface = await si.networkInterfaceDefault();
        const stats = await si.networkStats(defaultIface);
        const data = stats[0];
        if (!data) return null;
        const down = data.rx_sec ?? 0;
        const up = data.tx_sec ?? 0;
        return { interface: data.iface, down: Math.round(down), up: Math.round(up), total: Math.round(down + up) };
    } catch (err) {
        console.error("[network_stats]", err);
        return null;
    }
}

async function getNetworkHistory(): Promise<NetworkHistoryResponse | null> {
    let iface = "unknown";
    let currentRates = { down: 0, up: 0, total: 0 };

    try {
        const stats = await fetchNetworkStats();
        if (stats) {
            iface = stats.interface;
            currentRates = { down: stats.down, up: stats.up, total: stats.total };
        }
    } catch (err) {
        console.error("Error fetching live stats:", err);
    }

    try {
        const raw = execSync("vnstat --json", { encoding: "utf-8" });
        const vn = JSON.parse(raw);
        const ifaces = vn.interfaces ?? [];
        const data = ifaces.find((i: any) => i.name === iface) ?? ifaces[0];
        if (!data || !data.traffic) throw new Error("No traffic data");

        const t = data.traffic;
        const parseEntry = (entry: any) => ({
            down: entry?.rx ?? 0,
            up: entry?.tx ?? 0,
            total: (entry?.rx ?? 0) + (entry?.tx ?? 0),
        });

        const hoursArr = t.hour ?? t.hours ?? [];
        const daysArr = t.day ?? t.days ?? [];
        const monthsArr = t.month ?? t.months ?? [];

        const periods = {
            thisHour: parseEntry(hoursArr.at(-1)),
            lastHour: parseEntry(hoursArr.at(-2)),
            thisDay: parseEntry(daysArr.at(-1)),
            thisMonth: parseEntry(monthsArr.at(-1)),
            allTime: parseEntry(t.total),
        };

        const daily = daysArr
            .slice(-7)
            .reverse()
            .map((d: any) => ({
                label: d.date ? `${d.date.day}/${d.date.month}` : "?",
                ...parseEntry(d),
            }));

        const topDays = (t.top ?? t.tops ?? []).slice(0, 5).map((d: any) => ({
            label: d.date ? `${d.date.day}/${d.date.month}/${d.date.year}` : "?",
            ...parseEntry(d),
        }));

        return { interface: data.name, current: currentRates, periods, daily, topDays };
    } catch (err) {
        console.error("vnStat error:", err);
        return null;
    }
}

networkRouter.get("/network-history", async (_req, res) => {
    try {
        const data = await getNetworkHistory();
        res.json(data);
    } catch (err) {
        console.error("[/api/network-history]", err);
        res.status(500).json({ error: "Failed to get network history" });
    }
});

networkRouter.get("/network-stats", async (_req, res) => {
    try {
        const data = await fetchNetworkStats();
        res.json(data ?? { interface: "unknown", down: 0, up: 0, total: 0 });
    } catch (err) {
        console.error("[/api/network-stats]", err);
        res.status(500).json({ error: "Failed to get network stats" });
    }
});
