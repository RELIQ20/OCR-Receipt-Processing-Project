import { useEffect, useState } from "react";
import AuthPage from "./AuthPage";
import Homepage from "./Homepage";
import LifeReceiptDashboard from "../pages/DashboardScheme";
import { fetchSession, logout, type PublicUser } from "./lib/auth-client";

export default function App() {
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    fetchSession()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    setUser(null);
    setShowAuth(false);
  };

  if (user === undefined) return null;
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

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">
      <main className="flex-1 overflow-y-auto">
        <LifeReceiptDashboard onLogout={handleLogout} />
      </main>
    </div>
  );
}