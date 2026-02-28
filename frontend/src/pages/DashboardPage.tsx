import { usePolling } from "@/hooks/usePolling";
import { Header } from "@/components/Header";
import { NetworkSection } from "@/components/NetworkSection";
import { StorageSection } from "@/components/StorageSection";
import { ServicesSection } from "@/components/ServicesSection";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import type { ServiceStatus, SystemInfo, StorageDisk } from "@/types";

const POLL_SERVICES_MS = 15_000;
const POLL_SYSTEM_MS = 5_000;
const POLL_STORAGE_MS = 60_000;

export function DashboardPage() {
    const { logout, username } = useAuth();
    const { data: services, loading: svcLoading, refetch: refetchServices } = usePolling<ServiceStatus[]>(
        "/api/services",
        POLL_SERVICES_MS,
        []
    );
    const { data: system, loading: sysLoading } = usePolling<SystemInfo | null>("/api/system", POLL_SYSTEM_MS, null);
    const { data: storage } = usePolling<StorageDisk[]>("/api/storage", POLL_STORAGE_MS, []);

    return (
        <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto relative">
            <div className="py-4 w-full flex justify-between">
                <div className="flex items-center gap-2">
                    <img src="/logo.svg" alt="Logo" className="w-auto h-12" />
                    <h1 className="text-xl text-primary">AURA</h1>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <button
                        onClick={() => void logout()}
                        title={`Log out (${username ?? ""})`}
                        className="flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <Header system={system} loading={sysLoading} />
            <NetworkSection />
            {storage.length > 0 && <StorageSection storage={storage} />}
            <ServicesSection services={services} loading={svcLoading} onRefresh={refetchServices} />
        </div>
    );
}
