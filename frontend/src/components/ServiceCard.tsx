import { ExternalLink, MoreVertical, Play, Square, RotateCw } from 'lucide-react';
import type { ServiceStatus, DockerStatus } from '@/types';
import { apiFetch } from '@/lib/api';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface StatusConfig {
  label: string;
  dotClass: string;
  pulse: boolean;
}

const STATUS_CONFIG: Record<DockerStatus, StatusConfig> = {
  running: {
    label: 'Online',
    dotClass: 'bg-emerald-500',
    pulse: true,
  },
  paused: {
    label: 'Paused',
    dotClass: 'bg-amber-500',
    pulse: false,
  },
  stopped: {
    label: 'Stopped',
    dotClass: 'bg-muted-foreground',
    pulse: false,
  },
  not_found: {
    label: 'Not found',
    dotClass: 'bg-destructive',
    pulse: false,
  },
};

interface Props {
  service: ServiceStatus;
  onActionSuccess?: () => void | Promise<void>;
}

export function ServiceCard({ service, onActionSuccess }: Props) {
  const { label, dotClass, pulse } = STATUS_CONFIG[service.status];
  const isOnline = service.status === 'running';
  const canStart = service.status === 'stopped' || service.status === 'paused';
  const canStop = service.status === 'running' || service.status === 'paused';
  const canRestart = service.status === 'running' || service.status === 'paused';
  const hasContainer = service.status !== 'not_found';

  const runAction = async (action: 'start' | 'stop' | 'restart') => {
    try {
      const res = await apiFetch(`/api/services/${service.dockerName}/${action}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await onActionSuccess?.();
    } catch (err) {
      console.error(`[ServiceCard] ${action} failed:`, err);
      alert(err instanceof Error ? err.message : 'Action failed');
    }
  };

  return (
    <a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      className={isOnline ? undefined : 'pointer-events-none'}
      onClick={isOnline ? undefined : (e) => e.preventDefault()}
    >
      <div
        className={[
          'flex items-center gap-3 px-3 py-2 transition-all duration-200 group cursor-pointer border rounded-lg',
          !isOnline && 'opacity-60',
        ].join(' ')}
      >
        {/* Image */}
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center overflow-hidden border border-border shrink-0">
          <img
            src={service.icon}
            alt={service.displayName}
            className="w-4 h-4 object-contain"
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = 'none';
              const parent = el.parentElement;
              if (parent) {
                parent.textContent = service.displayName[0].toUpperCase();
                parent.classList.add('text-muted-foreground', 'font-bold', 'text-xs');
              }
            }}
          />
        </div>

        {/* Title */}
        <p className="flex-1 min-w-0 text-sm font-semibold text-foreground transition-colors truncate flex items-center gap-1.5">
          {service.displayName}
          {isOnline && (
            <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          )}
        </p>

        {/* Status pulse with tooltip */}
        <div className="flex items-center justify-center shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="relative flex items-center justify-center w-4 h-4 cursor-default">
                {pulse && (
                  <span
                    className={`absolute inline-flex h-2 w-2 rounded-full opacity-75 animate-ping ${dotClass}`}
                  />
                )}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotClass}`} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Actions dropdown - pointer-events-auto when link is disabled so menu stays clickable */}
        {hasContainer && (
          <div className={!isOnline ? 'pointer-events-auto' : undefined}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                variant="ghost"
                size="icon-xs"
                className="shrink-0 -mr-1 opacity-60 hover:opacity-100 hover:bg-accent/50"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                disabled={!canStart}
                onClick={() => runAction('start')}
              >
                <Play className="size-4" />
                Start
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canStop}
                onClick={() => runAction('stop')}
              >
                <Square className="size-4" />
                Stop
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canRestart}
                onClick={() => runAction('restart')}
              >
                <RotateCw className="size-4" />
                Restart
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </a>
  );
}
