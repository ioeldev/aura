import { Router } from "express";
import si from "systeminformation";

export const systemRouter = Router();

systemRouter.get("/system", async (_req, res) => {
    const [load, mem, time] = await Promise.all([si.currentLoad(), si.mem(), si.time()]);
    res.json({
        cpu: {
            load: Math.round(load.currentLoad * 10) / 10,
            avgLoad: Math.round(load.avgLoad * 100) / 100,
        },
        memory: {
            total: mem.total,
            used: mem.active,
            free: mem.available,
            usedPercent: Math.round((mem.active / mem.total) * 100),
        },
        uptime: Math.floor(time.uptime),
    });
});
