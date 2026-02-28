export type DockerStatus = 'running' | 'stopped' | 'paused' | 'not_found';

export interface ServiceStatus {
  id: string;
  displayName: string;
  dockerName: string;
  icon: string;
  url: string;
  category?: string;
  status: DockerStatus;
}

export interface SystemInfo {
  cpu: {
    load: number;    // % usage actuel
    avgLoad: number; // load average 1-min
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

export interface NetworkInfo {
  interface: string;
  down: number;  // bytes/sec
  up: number;   // bytes/sec
  total: number;
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
  current: NetworkHistoryPeriod
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
