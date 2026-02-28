import type { Request, Response, NextFunction } from "express";
import { AUTH_ENABLED } from "../config";
import { validateSession } from "./auth.db";

export function extractBearerToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) return auth.slice(7);
    return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
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
}
