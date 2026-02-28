import type { StorageDisk } from '@/types';
import { Progress } from '@/components/ui/progress';

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;
const TB = GB * 1024;

const DISK_WARN_PCT = 80;
const DISK_CRIT_PCT = 90;

function formatBytes(bytes: number): string {
  if (bytes >= TB) return `${(bytes / TB).toFixed(1)} TB`;
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(0)} MB`;
  return `${bytes} B`;
}

function getIndicatorClass(pct: number): string {
  if (pct >= DISK_CRIT_PCT) return 'bg-destructive';
  if (pct >= DISK_WARN_PCT) return 'bg-amber-500';
  return 'bg-primary';
}

function getPctTextClass(pct: number): string {
  if (pct >= DISK_CRIT_PCT) return 'text-destructive';
  if (pct >= DISK_WARN_PCT) return 'text-amber-400';
  return 'text-muted-foreground';
}

interface Props {
  disk: StorageDisk;
}

export function StorageBar({ disk }: Props) {
  const { usedPercent, total, used, mountpoint } = disk;
  const name = mountpoint === '/' ? 'Root (/)' : mountpoint.replace('/mnt/', '');

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground font-medium truncate max-w-[50%]">{name}</span>
        <span className="text-muted-foreground tabular-nums">
          {formatBytes(used)} / {formatBytes(total)}
          <span className={`ml-2 font-semibold ${getPctTextClass(usedPercent)}`}>
            {usedPercent}%
          </span>
        </span>
      </div>
      <Progress
        value={Math.min(usedPercent, 100)}
        indicatorClassName={getIndicatorClass(usedPercent)}
      />
    </div>
  );
}
