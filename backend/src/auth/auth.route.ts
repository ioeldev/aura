import { Router } from "express";
import { AUTH_ENABLED, ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_EXPIRE_HOURS } from "../config";
import { createSession, validateSession, deleteSession, safeCompare } from "./auth.db";
import { extractBearerToken } from "./auth.middleware";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!AUTH_ENABLED) {
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

authRouter.post("/logout", (req, res) => {
    const token = extractBearerToken(req);
    if (token) deleteSession(token);
    res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
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
