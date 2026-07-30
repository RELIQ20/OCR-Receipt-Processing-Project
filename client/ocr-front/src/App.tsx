import { useEffect, useState } from "react";
import AuthPage from "./AuthPage";
import LandingPage from "./LandingPage";
import LifeReceiptDashboard from "../pages/DashboardScheme";
import AdminManagementPage from "../pages/AdminManagementPage";
import { fetchSession, logout, type PublicUser } from "./lib/auth-client";

export default function App() {
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    fetchSession()
      .then(setUser)
      .catch(() => setUser(null));
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
      <LandingPage onLogin={() => setShowAuth(true)} />
    );
  }


  if (pathname === "/admin-management") {
    if (user.role !== "superadmin") return null;
    return <AdminManagementPage currentUser={user} />;
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">
      <main className="flex-1 overflow-y-auto">
        <LifeReceiptDashboard currentUser={user} onLogout={handleLogout} />
      </main>
    </div>
  );
}