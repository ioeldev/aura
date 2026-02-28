import { Routes, Route, Navigate, Outlet } from "react-router";
import { StarsBackground } from "@/components/StarsBackground";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";

// ─── Route guards ─────────────────────────────────────────────────────────────

function ProtectedRoute() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function GuestRoute() {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading) return null;
    return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
    return (
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
            <TooltipProvider>
                <AuthProvider>
                    <StarsBackground />
                    <Routes>
                        <Route element={<GuestRoute />}>
                            <Route path="/login" element={<LoginPage />} />
                        </Route>
                        <Route element={<ProtectedRoute />}>
                            <Route path="/*" element={<DashboardPage />} />
                        </Route>
                    </Routes>
                </AuthProvider>
            </TooltipProvider>
        </ThemeProvider>
    );
}
