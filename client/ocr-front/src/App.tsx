import IdleTimeoutModal from "./components/IdleTimeoutModal";
import DashboardScheme from "../pages/DashboardScheme";

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
      <LandingPage onLogin={() => setShowAuth(true)} />
    );
  }

  return (
    <div>
      <IdleTimeoutModal />

      <h1>Hello</h1>
      <div className="flex h-screen bg-[#0a0a0a] text-white">
        {/* Sidebar - Updated to match image_dc0f83.png */}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <DashboardScheme />
        </main>
      </div>
    </div>
  );
}
