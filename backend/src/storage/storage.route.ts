import { Router } from "express";
import si from "systeminformation";

export const storageRouter = Router();

storageRouter.get("/storage", async (_req, res) => {
    const disks = await si.fsSize();
    const seenDevices = new Set<string>();
    const filtered = disks
        .filter((d) => d.mount === "/" || d.mount.startsWith("/mnt/"))
        .filter((d) => {
            if (d.size === 0) return false;
            if (seenDevices.has(d.fs)) return false;
            seenDevices.add(d.fs);
            return true;
        })
        .map((d) => ({
            filesystem: d.fs,
            total: d.size,
            used: d.used,
            available: d.size - d.used,
            usedPercent: Math.round(d.use),
            mountpoint: d.mount,
        }))
        .sort((a, b) => {
            if (a.mountpoint === "/") return -1;
            if (b.mountpoint === "/") return 1;
            const SMALL = 1e9;
            const aSmall = a.total < SMALL;
            const bSmall = b.total < SMALL;
            if (aSmall !== bSmall) return aSmall ? 1 : -1;
            return a.mountpoint.localeCompare(b.mountpoint, undefined, { numeric: true });
        });
    res.json(filtered);
});
