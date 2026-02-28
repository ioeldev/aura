import { Wifi } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ReadyState } from "react-use-websocket";
import { useNetworkStats } from "@/hooks/useNetworkStats";
import { useNetworkHistory } from "@/hooks/useNetworkHistory";
import type { NetworkHistoryResponse } from "@/types";

function formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    
    // Swizzin utilise 1024 mais affiche les labels sans le 'i' (standard JEDEC)
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
    
    // Calcule l'index de l'unité (0 pour B, 1 pour KB, etc.)
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    // On limite à l'unité maximale disponible dans notre tableau
    const unitIndex = Math.min(i, sizes.length - 1);
    
    const value = bytes / Math.pow(k, unitIndex);
    
    // Formatage intelligent des décimales
    // Moins de 10 -> 2 décimales (ex: 1.86 GB)
    // Plus de 10 -> 2 décimales aussi pour rester précis comme Swizzin
    return `${value.toFixed(2)} ${sizes[unitIndex]}`;
}

const PERIOD_LABELS: Record<keyof NetworkHistoryResponse["periods"], string> = {
    thisHour: "This Hour",
    lastHour: "Last Hour",
    thisDay: "This Day",
    thisMonth: "This Month",
    allTime: "All Time",
};

function TableRow({ label, down, up, total }: { label: string; down: number; up: number; total: number }) {
    return (
        <tr className="border-t border-border/30 first:border-t-0">
            <td className="px-2 py-1 text-xs">{label}</td>
            <td className="px-2 py-1 text-right text-xs font-mono tabular-nums text-emerald-400">{formatBytes(down)}</td>
            <td className="px-2 py-1 text-right text-xs font-mono tabular-nums text-blue-400">{formatBytes(up)}</td>
            <td className="px-2 py-1 text-right text-xs font-mono tabular-nums">{formatBytes(total)}</td>
        </tr>
    );
}

function SectionHeader({ label }: { label: string }) {
    return (
        <tr className="bg-muted/40">
            <td colSpan={4} className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label}
            </td>
        </tr>
    );
}

function HistoryTables({ history }: { history: NetworkHistoryResponse }) {
    const { periods, daily, topDays } = history;
    const periodRows = (["thisHour", "lastHour", "thisDay", "thisMonth", "allTime"] as const).map((key) => ({
        label: PERIOD_LABELS[key],
        ...periods[key],
    }));

    return (
        <div className="overflow-x-auto rounded-lg border border-border/50">
            <table className="w-full text-xs min-w-[280px]">
                <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Period</th>
                        <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Down</th>
                        <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Up</th>
                        <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <SectionHeader label="Period" />
                    {periodRows.map((row) => (
                        <TableRow key={row.label} label={row.label} down={row.down} up={row.up} total={row.total} />
                    ))}
                    {daily.length > 0 && (
                        <>
                            <SectionHeader label="Last 7 days" />
                            {daily.map((row) => (
                                <TableRow key={row.label} label={row.label} down={row.down} up={row.up} total={row.total} />
                            ))}
                        </>
                    )}
                    {topDays.length > 0 && (
                        <>
                            <SectionHeader label="Top 5" />
                            {topDays.map((row) => (
                                <TableRow key={row.label} label={row.label} down={row.down} up={row.up} total={row.total} />
                            ))}
                        </>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export function NetworkSection() {
    const { data, readyState } = useNetworkStats();
    const history = useNetworkHistory();

    if (readyState !== ReadyState.OPEN && !data) {
        return (
            <Card className="mb-6 overflow-hidden border-border/50">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-6 w-32" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) return null;

    return (
        <Card className="mb-6">
            <CardContent>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                        Réseau
                    </h2>
                    {readyState === ReadyState.OPEN && (
                        <span className="hidden shrink-0 sm:inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 ring-1 ring-emerald-500/20 ring-offset-2 ring-offset-background">
                            <Wifi className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {data.interface}
                            </p>
                            <div className="mt-1 flex flex-wrap items-baseline gap-4 gap-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    <span className="font-mono text-sm font-semibold tabular-nums text-emerald-400">
                                        ↓ {formatSpeed(data.down)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                                    <span className="font-mono text-sm font-semibold tabular-nums text-blue-400">
                                        ↑ {formatSpeed(data.up)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Accordion
                        type="single"
                        collapsible
                        className="w-full"
                    >
                        <AccordionItem value="history" className="border-none">
                            <AccordionTrigger className="py-2 hover:no-underline text-muted-foreground">
                                Historique vnstat
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                                {history ? (
                                    <HistoryTables history={history} />
                                ) : (
                                    <div className="py-4 text-sm text-muted-foreground">
                                        Chargement… (vnstat requis sur le serveur)
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </CardContent>
        </Card>
    );
}
