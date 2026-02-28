import { Router } from "express";
import { docker, mapDockerState, getContainerByDockerName } from "./services.docker";
import { loadServices } from "./service-config";

export const servicesRouter = Router();

servicesRouter.get("/services", async (_req, res) => {
    try {
        const containers = await docker.listContainers({ all: true });
        const containerMap = new Map<string, string>();
        for (const c of containers) {
            for (const name of c.Names) {
                containerMap.set(name.replace(/^\//, ""), c.State);
            }
        }
        const services = loadServices().map((svc) => {
            const state = containerMap.get(svc.dockerName);
            return { ...svc, status: state ? mapDockerState(state) : "not_found" };
        });
        res.json(services);
    } catch (err) {
        console.error("[/api/services]", err);
        res.status(500).json({ error: "Failed to query Docker" });
    }
});

servicesRouter.post("/services/:dockerName/start", async (req, res) => {
    try {
        const container = await getContainerByDockerName(req.params.dockerName);
        if (!container) return res.status(404).json({ error: "Container not found" });
        await container.start();
        res.json({ ok: true });
    } catch (err) {
        console.error("[/api/services/:dockerName/start]", err);
        res.status(500).json({ error: "Failed to start container" });
    }
});

servicesRouter.post("/services/:dockerName/stop", async (req, res) => {
    try {
        const container = await getContainerByDockerName(req.params.dockerName);
        if (!container) return res.status(404).json({ error: "Container not found" });
        await container.stop();
        res.json({ ok: true });
    } catch (err) {
        console.error("[/api/services/:dockerName/stop]", err);
        res.status(500).json({ error: "Failed to stop container" });
    }
});

servicesRouter.post("/services/:dockerName/restart", async (req, res) => {
    try {
        const container = await getContainerByDockerName(req.params.dockerName);
        if (!container) return res.status(404).json({ error: "Container not found" });
        await container.restart();
        res.json({ ok: true });
    } catch (err) {
        console.error("[/api/services/:dockerName/restart]", err);
        res.status(500).json({ error: "Failed to restart container" });
    }
});
