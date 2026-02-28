import { readFileSync, statSync } from "fs";
import { SERVICES_CONFIG_PATH, SERVICES_FALLBACK_PATH } from "../config";
import type { ServiceConfig } from "../../../shared/services.config";

interface ServicesCache {
    services: ServiceConfig[];
    mtime: number;
}

let servicesCache: ServicesCache | null = null;

function resolveConfigPath(): string | null {
    for (const p of [SERVICES_CONFIG_PATH, SERVICES_FALLBACK_PATH]) {
        try {
            statSync(p);
            return p;
        } catch {
            /* not found */
        }
    }
    return null;
}

export function loadServices(): ServiceConfig[] {
    const filePath = resolveConfigPath();

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
