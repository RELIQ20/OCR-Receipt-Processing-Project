import { ArrowRight } from "lucide-react";

interface LandingPageProps {
    onLogin: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
    return (
        <div className="min-h-screen flex flex-col justify-center items-center font-sans" style={{ backgroundColor: "#050f0a", color: "#FFFFFF" }}>
            {/* Decorative background gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00563F] opacity-20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#1FA872] opacity-10 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 w-full max-w-4xl p-8 flex flex-col items-center text-center">
                {/* Brand Tag */}
                <div className="mb-6 px-4 py-1.5 rounded-full border" style={{ borderColor: "rgba(245,180,0,0.16)", backgroundColor: "rgba(255,255,255,0.035)" }}>
                    <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: "#F5B400" }}>Lifewood OCR</span>
                </div>

                {/* Hero Title */}
                <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Every receipt, <br /> perfectly exposed.
                </h1>

                {/* Subtitle */}
                <p className="text-lg md:text-xl mb-10 max-w-2xl" style={{ color: "#c9d4cc" }}>
                    The intelligent dashboard that keeps your spending totals visible and receipts organized from WhatsApp, email, or mobile uploads.
                </p>

                {/* Call to action */}
                <button
                    onClick={onLogin}
                    className="group relative inline-flex items-center justify-center gap-3 rounded-full px-8 py-4 text-sm font-semibold transition-all overflow-hidden"
                    style={{ backgroundColor: "#1FA872", color: "#FFFFFF" }}
                >
                    {/* Hover highlight */}
                    <div className="absolute inset-0 w-full h-full bg-white opacity-0 group-hover:opacity-20 transition-opacity" />

                    <span className="relative z-10">Enter Dashboard</span>
                    <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Feature grid */}
                <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
                    {[
                        { title: "Smart OCR", desc: "Instantly extracts totals, merchants, and line items." },
                        { title: "Unified Inbox", desc: "Syncs directly with WhatsApp OpenClaw bot." },
                        { title: "Secure Storage", desc: "Backs up every receipt to your private database." },
                    ].map((feature, i) => (
                        <div key={i} className="p-6 rounded-[20px] border transition-colors hover:bg-white/5" style={{ backgroundColor: "rgba(255,255,255,0.035)", borderColor: "rgba(255,255,255,0.075)" }}>
                            <h3 className="font-bold text-lg mb-2" style={{ color: "#F5B400" }}>{feature.title}</h3>
                            <p className="text-sm leading-relaxed" style={{ color: "#c9d4cc" }}>{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}