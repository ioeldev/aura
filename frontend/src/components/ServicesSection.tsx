import { useMemo } from "react";
import { ServiceCard } from "@/components/ServiceCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ServiceStatus } from "@/types";

const SKELETON_COUNT = 12;

interface ServicesSectionProps {
    services: ServiceStatus[];
    loading: boolean;
    onRefresh?: () => void | Promise<void>;
}

export function ServicesSection({ services, loading, onRefresh }: ServicesSectionProps) {
    const grouped = useMemo(() => {
        const map = new Map<string, ServiceStatus[]>();
        const seenCategories: string[] = [];

        for (const svc of services) {
            const cat = svc.category ?? "Uncategorized";

            if (!map.has(cat)) {
                map.set(cat, []);
                seenCategories.push(cat);
            }
            map.get(cat)!.push(svc);
        }

        return seenCategories
            .map((cat) => ({ cat, services: map.get(cat) ?? [] }))
            .filter((g) => g.services.length > 0);
    }, [services]);

    const runningCount = services.filter((s) => s.status === "running").length;

    return (
        <Card className="mb-6">
            <CardContent>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                        Services
                    </h2>
                    {!loading && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                            <span className="text-emerald-400 font-semibold">{runningCount}</span>/{services.length} online
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="overflow-x-auto pb-2">
                        <div className="flex gap-3 min-w-min">
                            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-48 shrink-0 rounded-xl" />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {grouped.map(({ cat, services: catSvcs }) => (
                            <div key={cat}>
                                <p className="text-sm text-muted-foreground font-medium mb-2 ml-0.5">{cat}</p>
                                <div className="overflow-x-auto pb-2">
                                    <div className="flex gap-3 min-w-min">
                                        {catSvcs.map((svc) => (
                                            <div key={svc.id} className="">
                                                <ServiceCard service={svc} onActionSuccess={onRefresh} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
