import express from "express";
import { createServer } from "http";
import cors from "cors";
import path from "path";

import { PORT, STATIC_DIR, AUTH_ENABLED, ADMIN_USERNAME, SESSION_EXPIRE_HOURS } from "./config";
import { authRouter } from "./auth/auth.route";
import { requireAuth } from "./auth/auth.middleware";
import { servicesRouter } from "./services/services.route";
import { systemRouter } from "./system/system.route";
import { storageRouter } from "./storage/storage.route";
import { networkRouter } from "./network/network.route";
import { setupWebSocket } from "./network/network.ws";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api", requireAuth);
app.use("/api", servicesRouter);
app.use("/api", systemRouter);
app.use("/api", storageRouter);
app.use("/api", networkRouter);

app.use(express.static(STATIC_DIR));
app.get("*", (_req, res) => {
    res.sendFile(path.join(STATIC_DIR, "index.html"));
});

const httpServer = createServer(app);
setupWebSocket(httpServer);

httpServer.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT} (ws://localhost:${PORT}/ws)`);
    console.log(
        `Auth: ${
            AUTH_ENABLED
                ? `enabled (user: ${ADMIN_USERNAME}, session: ${SESSION_EXPIRE_HOURS}h)`
                : "DISABLED (set ADMIN_PASSWORD to enable)"
        }`
    );
});
