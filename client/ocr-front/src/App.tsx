// App.tsx
import DashboardScheme from '../pages/DashboardScheme';
export default function App() {
  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">
      {/* Sidebar - Updated to match image_dc0f83.png */}
      <nav className="w-64 border-r border-white/10 p-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-green-900 rounded-xl flex items-center justify-center text-green-400">
            $
          </div>
          <div>
            <h1 className="font-bold">Receipt AI</h1>
            <p className="text-sm text-white/50">Lifewood</p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-white/40 tracking-widest uppercase">Navigation</p>
          <div className="bg-green-900/50 p-3 rounded-xl border border-green-800 flex items-center gap-3 text-green-400">
            <span>▤</span> Dashboard
          </div>
          <div className="p-3 flex items-center justify-between text-white/60 hover:bg-white/5 rounded-xl cursor-pointer">
            <span className="flex items-center gap-3">⊞ Receipt Inbox</span>
            <span className="bg-orange-500/20 text-orange-500 text-xs px-2 py-0.5 rounded-full">2</span>
          </div>
          <div className="p-3 flex items-center gap-3 text-white/60 hover:bg-white/5 rounded-xl cursor-pointer">
            <span>⤓</span> Export
          </div>
          <div className="p-3 flex items-center gap-3 text-white/60 hover:bg-white/5 rounded-xl cursor-pointer">
            <span>⚙</span> Settings
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <DashboardScheme />
      </main>
    </div>
  );
}