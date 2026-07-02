import { useState } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Inbox, Search, Bell, Plus } from "lucide-react";

export default function DashboardScheme() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "inbox", label: "Receipt Inbox", icon: Inbox },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-zinc-950 via-emerald-950/30 to-zinc-950 text-gray-100 font-sans antialiased selection:bg-emerald-500/30 overflow-hidden">
      
      {/* Sidebar Container */}
      <aside className="w-80 bg-zinc-950/40 backdrop-blur-2xl border-r border-emerald-500/10 p-6 flex flex-col justify-between relative z-10 shadow-[5px_0_30px_rgba(0,0,0,0.5)]">
        <div>
          {/* Logo Section with Glass Accent */}
          <div className="flex items-center gap-3 mb-2 px-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
              <span className="text-zinc-950 font-bold text-lg">R</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wider font-mono">RECEIPT.IO</h1>
              <p className="text-[10px] text-emerald-400/70 tracking-tight uppercase font-medium">Expense tracking via OCR & AI</p>
            </div>
          </div>
          
          <hr className="border-zinc-800/60 my-6 mx-2" />
          
          {/* Interactive Metallic/Liquid Sidebar Track Area */}
          <div className="relative p-1 rounded-2xl bg-zinc-900/20 border border-white/[0.03]">
            
            {/* The Vertical Emerald Energy Stream (Right Side Rail Effect) */}
            <div className="absolute right-3 top-4 bottom-4 w-[6px] rounded-full bg-emerald-950/50 border border-emerald-500/10 overflow-hidden">
              {/* Dynamic flowing neon particles background */}
              <div className="w-full h-full opacity-60 bg-[linear-gradient(to_bottom,transparent,rgba(16,185,129,0.3),transparent)] animate-[pulse_2s_infinite]" />
            </div>

            <nav className="space-y-3 relative z-10">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`group relative flex items-center justify-between w-full px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 text-left focus:outline-none ${
                      isActive ? "text-white font-semibold" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {/* Sliding Metallic Emerald Pill (The Liquid Joint Connection) */}
                    {isActive && (
                      <motion.div
                        layoutId="metallicLiquidGlow"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-400/20 to-emerald-400/40 border border-emerald-400/40 shadow-[0_0_25px_rgba(52,211,153,0.15),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                      >
                        {/* High-Gloss Radial Highlight Center dot connecting to the track line */}
                        <div className="absolute right-[10px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-300 shadow-[0_0_12px_#34d399] ring-2 ring-emerald-500 z-20" />
                        
                        {/* Fluid Curved Connecting Node Flare */}
                        <div className="absolute -right-[4px] top-1/2 -translate-y-1/2 w-4 h-8 bg-emerald-400/30 blur-[4px] rounded-full mix-blend-screen pointer-events-none" />
                      </motion.div>
                    )}

                    {/* Icon & Label Content */}
                    <span className="relative z-10 flex items-center gap-3.5">
                      <Icon className={`w-4 h-4 transition-transform duration-300 ${
                        isActive ? "text-emerald-400 scale-110" : "text-zinc-400 group-hover:text-zinc-200"
                      }`} />
                      {item.label}
                    </span>

                    {/* Faint Radar Ring Waves when Active */}
                    {isActive && (
                      <span className="absolute right-[6px] top-1/2 -translate-y-1/2 w-4 h-4 z-0 pointer-events-none flex items-center justify-center">
                        <span className="absolute w-full h-full rounded-full bg-emerald-400/40 animate-ping opacity-75" />
                        <span className="absolute w-2/3 h-2/3 rounded-full bg-emerald-400/20 animate-ping opacity-50" />
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
        
        {/* User Footer Profile */}
        <div className="pt-4 border-t border-zinc-800/60 flex items-center gap-3 px-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
          <div className="text-xs text-zinc-500 font-medium tracking-wide">
            Logged in as <span className="text-zinc-400">Admin</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-950/20 via-zinc-950 to-zinc-950">
        
        {/* Metallic Glossy Top Header */}
        <header className="h-16 border-b border-zinc-800/60 px-8 flex items-center justify-between bg-zinc-900/20 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center bg-zinc-900/50 border border-zinc-800/80 rounded-xl px-3 py-2 w-80 shadow-inner group focus-within:border-emerald-500/50 transition-colors">
            <Search className="w-4 h-4 text-zinc-500 mr-2.5 group-focus-within:text-emerald-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search receipts..." 
              className="bg-transparent text-xs w-full focus:outline-none text-zinc-200 placeholder-zinc-500"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-zinc-400 hover:text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/60 rounded-xl transition relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_6px_#f59e0b]" />
            </button>
            
            {/* Metallic avatar ring */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 p-[1px] shadow-md">
              <div className="w-full h-full rounded-[11px] bg-emerald-600 flex items-center justify-center font-bold text-white text-sm tracking-wider">
                A
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Welcome Back!</h2>
              <p className="text-xs text-zinc-400 mt-1">Here is your receipt processing overview.</p>
            </div>
            
            <button className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-semibold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/10 hover:shadow-emerald-400/20 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0">
              <Plus className="w-4 h-4 stroke-[3]" />
              Upload Receipt
            </button>
          </div>

          {/* Glassmorphic Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="relative group overflow-hidden bg-gradient-to-b from-zinc-900/60 to-zinc-900/20 backdrop-blur-md border border-zinc-800/60 p-6 rounded-2xl shadow-xl transition-all duration-300 hover:border-zinc-700/60">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/[0.02] pointer-events-none" />
              <p className="text-xs font-medium text-zinc-400 tracking-wider uppercase">Total Scanned</p>
              <p className="text-3xl font-bold text-white mt-3 tracking-tight font-mono">1,248</p>
            </div>

            {/* Card 2 */}
            <div className="relative group overflow-hidden bg-gradient-to-b from-zinc-900/60 to-zinc-900/20 backdrop-blur-md border border-zinc-800/60 p-6 rounded-2xl shadow-xl transition-all duration-300 hover:border-zinc-700/60">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-amber-500/[0.01] pointer-events-none" />
              <p className="text-xs font-medium text-zinc-400 tracking-wider uppercase">Pending Review</p>
              <p className="text-3xl font-bold text-amber-400 mt-3 tracking-tight font-mono">14</p>
            </div>

            {/* Card 3 */}
            <div className="relative group overflow-hidden bg-gradient-to-b from-zinc-900/60 to-zinc-900/20 backdrop-blur-md border border-zinc-800/60 p-6 rounded-2xl shadow-xl transition-all duration-300 hover:border-zinc-700/60">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-emerald-500/[0.02] pointer-events-none" />
              <p className="text-xs font-medium text-zinc-400 tracking-wider uppercase">Processed Value</p>
              <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mt-3 tracking-tight font-mono">$14,235.50</p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}