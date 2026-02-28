import type { ServiceConfig } from "../../shared/services.config";

export type DockerStatus = "running" | "stopped" | "paused" | "not_found";

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
    label: string;
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

export interface NetworkStatsResult {
    interface: string;
    down: number;
    up: number;
    total: number;
}
