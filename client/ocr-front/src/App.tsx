import { useEffect, useState } from "react";
import AuthPage from "./AuthPage";
import LifeReceiptDashboard from "../pages/DashboardScheme";
import AdminManagementPage from "../pages/AdminManagementPage";
import { fetchSession, logout, type PublicUser } from "./lib/auth-client";

export default function App() {
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const account = await fetchSession();
        if (!cancelled) setUser(account ?? null);
      } catch {
        if (!cancelled) setUser(null);
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const pathname = window.location.pathname;
  useEffect(() => {
    if (pathname === "/admin-management" && user?.role !== "superadmin") {
      window.location.href = "/";
    }
  }, [pathname, user]);

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    setUser(null);
    setShowAuth(false);
  };

  if (user === undefined) {
    return null; // still resolving session
  }

  if (!user) {
    return showAuth ? (
      <AuthPage
        onAuthSuccess={(account) => {
          setUser(account);
          setShowAuth(false);
        }}
      />
    ) : (
      <LandingPage onLogin={() => setShowAuth(true)} />
    );
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">
      <main className="flex-1 overflow-y-auto">
        <LifeReceiptDashboard onLogout={handleLogout} />
      </main>
    </div>
  );
}