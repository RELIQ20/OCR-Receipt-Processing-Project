import { useEffect, useState } from "react";
import AuthPage from "./AuthPage";
import Homepage from "./Homepage";
import LifeReceiptDashboard from "../pages/DashboardScheme";
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
      <Homepage onLogin={() => setShowAuth(true)} />
    );
  }

  return <LifeReceiptDashboard onLogout={handleLogout} />;
}