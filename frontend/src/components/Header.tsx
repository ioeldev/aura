import { Cpu, MemoryStick, Timer } from 'lucide-react';
import type { SystemInfo } from '@/types';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

const WARN_PCT = 75;
const CRIT_PCT = 90;

const SECS_PER_MIN = 60;
const SECS_PER_HOUR = SECS_PER_MIN * 60;
const SECS_PER_DAY = SECS_PER_HOUR * 24;

interface Props {
  system: SystemInfo | null;
  loading: boolean;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / SECS_PER_DAY);
  const hours = Math.floor((seconds % SECS_PER_DAY) / SECS_PER_HOUR);
  const minutes = Math.floor((seconds % SECS_PER_HOUR) / SECS_PER_MIN);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

function getIndicatorClass(pct: number, base: string, warn: string, crit: string): string {
  if (pct >= CRIT_PCT) return crit;
  if (pct >= WARN_PCT) return warn;
  return base;
}

function bytesToGiB(bytes: number): number {
  return bytes / (1024 * 1024 * 1024);
}

function formatGiB(bytes: number): string {
  return `${bytesToGiB(bytes).toFixed(1)} GiB`;
}

function getCpuStatus(load: number): string {
  if (load >= 90) return 'Overloaded';
  if (load >= 75) return 'High';
  if (load >= 50) return 'Busy';
  if (load >= 25) return 'Normal';
  return 'Idle';
}

export function Header({ system, loading }: Props) {
  return (
    <Card className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-2 px-4 py-4 sm:px-6 mb-6 divide-0 sm:divide-y-0 sm:divide-x divide-border">

      {/* Uptime */}
      <div className="flex-1 sm:pr-6">
        <p className="flex items-center gap-1 text-sm text-muted-foreground mb-1.5">
          <Timer className="w-3 h-3" />
          Uptime
        </p>
        {system && !loading ? (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {formatUptime(system.uptime)}
            </span>
            <p className="text-xs text-muted-foreground leading-tight">
              {Math.floor(system.uptime / SECS_PER_DAY)}d {Math.floor((system.uptime % SECS_PER_DAY) / SECS_PER_HOUR)}h since boot
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-28 mt-0.5" />
          </div>
        )}
      </div>

      {/* CPU */}
      <div className="flex-1 sm:px-6">
        <p className="flex items-center gap-1 text-sm text-muted-foreground mb-1.5">
          <Cpu className="w-3 h-3" />
          CPU
        </p>
        {system && !loading ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Progress
                value={system.cpu.load}
                className="w-full max-w-24"
                indicatorClassName={getIndicatorClass(
                  system.cpu.load,
                  'bg-primary',
                  'bg-amber-500',
                  'bg-destructive',
                )}
              />
              <span className="text-sm text-muted-foreground tabular-nums w-10">
                {system.cpu.load}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground tabular-nums leading-tight">
              {getCpuStatus(system.cpu.load)} · load {system.cpu.avgLoad.toFixed(2)}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <Skeleton className="h-2 w-36" />
            <Skeleton className="h-3 w-24 mt-0.5" />
          </div>
        )}
      </div>

      {/* RAM */}
      <div className="flex-1 sm:pl-6">
        <p className="flex items-center gap-1 text-sm text-muted-foreground mb-1.5">
          <MemoryStick className="w-3 h-3" />
          RAM
        </p>
        {system && !loading ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Progress
                value={system.memory.usedPercent}
                className="w-full max-w-24"
                indicatorClassName={getIndicatorClass(
                  system.memory.usedPercent,
                  'bg-violet-500',
                  'bg-amber-500',
                  'bg-destructive',
                )}
              />
              <span className="text-sm text-muted-foreground tabular-nums w-10">
                {system.memory.usedPercent}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground tabular-nums leading-tight">
              <span className="sm:hidden">{formatGiB(system.memory.used)} / {formatGiB(system.memory.total)}</span>
              <span className="hidden sm:inline">
                {formatGiB(system.memory.used)} used · {formatGiB(system.memory.free)} free
              </span>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <Skeleton className="h-2 w-36" />
            <Skeleton className="h-3 w-28 mt-0.5" />
          </div>
        )}
      </div>

    </Card>
  );
}
