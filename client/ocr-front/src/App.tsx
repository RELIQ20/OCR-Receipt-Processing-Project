import { useEffect, useState } from "react";
import AuthPage from "./AuthPage";
import LifeReceiptDashboard from "../pages/DashboardScheme";
import { fetchSession, logout, type PublicUser } from "./lib/auth-client";

export default function App() {
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined);

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

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    setUser(null);
  };

  if (user === undefined) {
    return null; // still resolving session
  }

  if (!user) {
    return (
      <AuthPage
        onAuthSuccess={(account) => {
          setUser(account);
        }}
      />
    );
  }

  return <LifeReceiptDashboard user={user} onLogout={handleLogout} />;
}