import express from "express";
import { createServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import cors from "cors";
import Docker from "dockerode";
import si from "systeminformation";
import path from "path";
import { execSync } from "child_process";
import { randomBytes, timingSafeEqual } from "crypto";
import { mkdirSync, readFileSync, statSync } from "fs";
import { Database } from "bun:sqlite";

import type { ServiceConfig } from "../../shared/services.config";

// ─── Runtime services config ──────────────────────────────────────────────────

const SERVICES_CONFIG_PATH = process.env.SERVICES_CONFIG_PATH || path.join(process.cwd(), "config/services.json");

const SERVICES_FALLBACK_PATH = path.join(process.cwd(), "config/services.example.json");

interface ServicesCache {
    services: ServiceConfig[];
    mtime: number;
}

let servicesCache: ServicesCache | null = null;

function loadServices(): ServiceConfig[] {
    const filePath = (() => {
        try {
            statSync(SERVICES_CONFIG_PATH);
            return SERVICES_CONFIG_PATH;
        } catch {
            /* not found */
        }
        try {
            statSync(SERVICES_FALLBACK_PATH);
            return SERVICES_FALLBACK_PATH;
        } catch {
            /* not found */
        }
        return null;
    })();

    if (!filePath) {
        console.warn(`[services] No config file found. Create ${SERVICES_CONFIG_PATH} to add your services.`);
        return [];
    }

    const mtime = statSync(filePath).mtimeMs;

    if (servicesCache && servicesCache.mtime === mtime) {
        return servicesCache.services;
    }

    try {
        const raw = readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw) as { services?: ServiceConfig[] };
        const services = parsed.services ?? [];
        servicesCache = { services, mtime };
        if (filePath === SERVICES_FALLBACK_PATH) {
            console.warn(
                `[services] Using example config. Copy it to ${SERVICES_CONFIG_PATH} and edit it for your setup.`
            );
        } else {
            console.log(`[services] Loaded ${services.length} service(s) from ${filePath}`);
        }
        return services;
    } catch (err) {
        console.error(`[services] Failed to parse config at ${filePath}:`, err);
        return servicesCache?.services ?? [];
    }
}

const BASE_PATH = (process.env.BASE_PATH || "").replace(/\/$/, "") || "";

const app = express();
const docker = new Docker({ socketPath: "/var/run/docker.sock" });
const PORT = process.env.PORT || 2655;
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, "../../public");

app.use(cors());
app.use(express.json());

// Strip BASE_PATH from incoming requests so routes match (for reverse proxy subpath deployment)
if (BASE_PATH) {
    app.use((req, res, next) => {
        if (req.url === BASE_PATH || req.url.startsWith(BASE_PATH + "/")) {
            req.url = req.url === BASE_PATH ? "/" : req.url.slice(BASE_PATH.length);
        }
        next();
    });
}

// ─── Types ───────────────────────────────────────────────────────────────────

type DockerStatus = "running" | "stopped" | "paused" | "not_found";

export interface ServiceStatus extends ServiceConfig {
    status: DockerStatus;
}

export interface SystemInfo {
    cpu: {
        load: number;
        avgLoad: number;
    };
    memory: {
        total: number;
        used: number;
        free: number;
        usedPercent: number;
    };
    uptime: number;
}

export interface StorageDisk {
    filesystem: string;
    total: number;
    used: number;
    available: number;
    usedPercent: number;
    mountpoint: string;
}

export interface NetworkHistoryPeriod {
    down: number;
    up: number;
    total: number;
}

export interface NetworkHistoryRow {
    date: string;
    down: number;
    up: number;
    total: number;
}

export interface NetworkHistoryResponse {
    interface: string;
    current: { down: number; up: number; total: number };
    periods: {
        thisHour: NetworkHistoryPeriod;
        lastHour: NetworkHistoryPeriod;
        thisDay: NetworkHistoryPeriod;
        thisMonth: NetworkHistoryPeriod;
        allTime: NetworkHistoryPeriod;
    };
    daily: NetworkHistoryRow[];
    topDays: NetworkHistoryRow[];
}

// ─── Auth Setup ───────────────────────────────────────────────────────────────

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SESSION_EXPIRE_HOURS = parseInt(process.env.SESSION_EXPIRE_HOURS || "24", 10);
const AUTH_ENABLED = !!ADMIN_PASSWORD;

if (!AUTH_ENABLED) {
    console.warn("WARNING: ADMIN_PASSWORD is not set — authentication is DISABLED.");
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "auth.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT    PRIMARY KEY,
    username   TEXT    NOT NULL,
    expires_at INTEGER NOT NULL
  )
`);

// Remove expired sessions on startup
db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

function createSession(username: string): string {
    const token = randomBytes(32).toString("hex");
    const expiresAt = Date.now() + SESSION_EXPIRE_HOURS * 3_600_000;
    db.prepare("INSERT INTO sessions (id, username, expires_at) VALUES (?, ?, ?)").run(token, username, expiresAt);
    return token;
}

function validateSession(token: string): string | null {
    const row = db.prepare("SELECT username, expires_at FROM sessions WHERE id = ?").get(token) as
        | { username: string; expires_at: number }
        | undefined;
    if (!row) return null;
    if (row.expires_at < Date.now()) {
        db.prepare("DELETE FROM sessions WHERE id = ?").run(token);
        return null;
    }
    return row.username;
}

function deleteSession(token: string): void {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(token);
}

function extractBearerToken(req: express.Request): string | null {
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) return auth.slice(7);
    return null;
}

/** Constant-time string comparison to prevent timing attacks */
function safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    const maxLen = Math.max(bufA.length, bufB.length);
    const paddedA = Buffer.concat([bufA, Buffer.alloc(maxLen - bufA.length)]);
    const paddedB = Buffer.concat([bufB, Buffer.alloc(maxLen - bufB.length)]);
    return timingSafeEqual(paddedA, paddedB) && bufA.length === bufB.length;
}

// ─── Auth Routes ─────────────────────────────────────────────────────────────

// POST /api/auth/login
app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!AUTH_ENABLED) {
        // Auth not configured — return a valid session token anyway
        const token = createSession(ADMIN_USERNAME);
        res.json({ token, expiresIn: SESSION_EXPIRE_HOURS * 3600 });
        return;
    }

    const usernameMatch = safeCompare(username ?? "", ADMIN_USERNAME);
    const passwordMatch = safeCompare(password ?? "", ADMIN_PASSWORD);

    if (!usernameMatch || !passwordMatch) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
    }

    const token = createSession(ADMIN_USERNAME);
    res.json({ token, expiresIn: SESSION_EXPIRE_HOURS * 3600 });
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req, res) => {
    const token = extractBearerToken(req);
    if (token) deleteSession(token);
    res.json({ ok: true });
});

// GET /api/auth/me — used by the frontend to check whether the current session is valid
app.get("/api/auth/me", (req, res) => {
    if (!AUTH_ENABLED) {
        res.json({ username: ADMIN_USERNAME, authDisabled: true });
        return;
    }
    const token = extractBearerToken(req);
    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const username = validateSession(token);
    if (!username) {
        res.status(401).json({ error: "Session expired" });
        return;
    }
    res.json({ username });
});

// ─── Auth Middleware (applies to all /api/* routes below) ────────────────────

app.use("/api", (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!AUTH_ENABLED) return next();
    const token = extractBearerToken(req);
    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const username = validateSession(token);
    if (!username) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    next();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapDockerState(state: string): DockerStatus {
    if (state === "running") return "running";
    if (state === "paused") return "paused";
    return "stopped";
}

async function getContainerByDockerName(dockerName: string) {
    const containers = await docker.listContainers({ all: true });
    for (const c of containers) {
        for (const name of c.Names || []) {
            const n = name.replace(/^\//, "");
            if (n === dockerName || n.endsWith("_" + dockerName) || n.endsWith("_" + dockerName + "_1")) {
                return docker.getContainer(c.Id);
            }
        }
    }
    return null;
}

// ─── Protected API Routes ─────────────────────────────────────────────────────

app.get("/api/services", async (_req, res) => {
    try {
        const containers = await docker.listContainers({ all: true });
        const containerMap = new Map<string, string>();
        for (const c of containers) {
            for (const name of c.Names) {
                containerMap.set(name.replace(/^\//, ""), c.State);
            }
        }
        const services: ServiceStatus[] = loadServices().map((svc) => {
            const state = containerMap.get(svc.dockerName);
            return { ...svc, status: state ? mapDockerState(state) : "not_found" };
        });
        res.json(services);
    } catch (err) {
        console.error("[/api/services]", err);
        res.status(500).json({ error: "Failed to query Docker" });
    }
});

app.post("/api/services/:dockerName/start", async (req, res) => {
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

app.post("/api/services/:dockerName/stop", async (req, res) => {
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

app.post("/api/services/:dockerName/restart", async (req, res) => {
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

app.get("/api/system", async (_req, res) => {
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

app.get("/api/storage", async (_req, res) => {
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

app.get("/api/network-history", async (_req, res) => {
    try {
        const data = await getNetworkHistory();
        res.json(data);
    } catch (err) {
        console.error("[/api/network-history]", err);
        res.status(500).json({ error: "Failed to get network history" });
    }
});

// ─── Network Stats ────────────────────────────────────────────────────────────

const NETWORK_STATS_INTERVAL_MS = 2_000;

async function fetchNetworkStats(): Promise<{ interface: string; down: number; up: number; total: number } | null> {
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

app.get("/api/network-stats", async (_req, res) => {
    try {
        const data = await fetchNetworkStats();
        res.json(data ?? { interface: "unknown", down: 0, up: 0, total: 0 });
    } catch (err) {
        console.error("[/api/network-stats]", err);
        res.status(500).json({ error: "Failed to get network stats" });
    }
});

// ─── Static Frontend (production) ─────────────────────────────────────────────

app.use(express.static(STATIC_DIR));

app.get("*", (_req, res) => {
    const indexPath = path.join(STATIC_DIR, "index.html");
    let html = readFileSync(indexPath, "utf-8");
    if (BASE_PATH) {
        html = html.replace(/__AURA_BASE_PATH_PLACEHOLDER__/g, BASE_PATH);
    } else {
        html = html.replace(/__AURA_BASE_PATH_PLACEHOLDER__/g, "");
    }
    res.type("html").send(html);
});

// ─── HTTP Server + WebSocket ───────────────────────────────────────────────────

const httpServer = createServer(app);
const wsPath = BASE_PATH ? `${BASE_PATH}/ws` : "/ws";
const wss = new WebSocketServer({ server: httpServer, path: wsPath });
const networkStatsSubscribers = new Set<WebSocket>();

wss.on("connection", (ws, req) => {
    // Validate session token passed as ?token=<token> query param
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

    ws.on("message", (raw) => {
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

httpServer.listen(PORT, () => {
    const base = BASE_PATH ? `${BASE_PATH}` : "";
    console.log(`Backend running on http://localhost:${PORT}${base} (ws://localhost:${PORT}${wsPath})`);
    console.log(
        `Auth: ${
            AUTH_ENABLED
                ? `enabled (user: ${ADMIN_USERNAME}, session: ${SESSION_EXPIRE_HOURS}h)`
                : "DISABLED (set ADMIN_PASSWORD to enable)"
        }`
    );
});
