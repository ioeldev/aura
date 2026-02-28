import { Database } from "bun:sqlite";
import { randomBytes, timingSafeEqual } from "crypto";
import path from "path";
import { mkdirSync } from "fs";
import { DATA_DIR, SESSION_EXPIRE_HOURS } from "../config";

mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, "auth.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT    PRIMARY KEY,
    username   TEXT    NOT NULL,
    expires_at INTEGER NOT NULL
  )
`);

db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());

export function createSession(username: string): string {
    const token = randomBytes(32).toString("hex");
    const expiresAt = Date.now() + SESSION_EXPIRE_HOURS * 3_600_000;
    db.prepare("INSERT INTO sessions (id, username, expires_at) VALUES (?, ?, ?)").run(token, username, expiresAt);
    return token;
}

export function validateSession(token: string): string | null {
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

export function deleteSession(token: string): void {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(token);
}

/** Constant-time string comparison to prevent timing attacks */
export function safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    const maxLen = Math.max(bufA.length, bufB.length);
    const paddedA = Buffer.concat([bufA, Buffer.alloc(maxLen - bufA.length)]);
    const paddedB = Buffer.concat([bufB, Buffer.alloc(maxLen - bufB.length)]);
    return timingSafeEqual(paddedA, paddedB) && bufA.length === bufB.length;
}
