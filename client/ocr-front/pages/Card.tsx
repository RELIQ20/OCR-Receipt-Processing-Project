import { motion } from "framer-motion";
import {
  Wifi,
  Receipt,
  PieChart,
  TrendingUp,
  ShieldCheck,
  Wallet,
  Sparkles,
} from "lucide-react";
//sssssssssss
const NOISE_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export interface CardProps {
  /** CSS background — usually a linear-gradient string from the brand palette */
  background: string;
  name: string;
  balance: string;
  last4?: string;
  /** Front-of-stack face: chip, contactless, icon cluster all show. Back cards stay minimal. */
  detailed?: boolean;
  /** Shrinks type for tighter sidebar placements */
  compact?: boolean;
  textColor?: string;
  /** 0-100 cursor position for the moving light spot — omit to disable */
  glow?: { x: number; y: number } | null;
  onGlowMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  className?: string;
}

export const Card = ({
  background,
  name,
  balance,
  last4 = "5008",
  detailed = false,
  compact = false,
  textColor = "rgba(255,255,255,0.92)",
  glow,
  onGlowMove,
  onHoverStart,
  onHoverEnd,
  className = "",
}: CardProps) => {
  return (
    <motion.div
      className={`w-full h-full rounded-[24px] p-5 flex flex-col justify-between relative overflow-hidden border border-white/15 ${className}`}
      style={{
        background,
        boxShadow:
          "0 45px 90px rgba(0,0,0,0.28), 0 20px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.2)",
      }}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onMouseMove={onGlowMove}
    >
      {/* subtle metal noise */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: NOISE_URI }}
      />

      {/* animated diagonal shine */}
      <motion.div
        className="absolute -inset-1/2 pointer-events-none"
        style={{
          background:
            "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.25) 48%, transparent 56%)",
        }}
        animate={{ x: ["-30%", "30%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />

      {/* cursor-following light spot (front card only) */}
      {glow && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(255,255,255,0.35), transparent 42%)`,
          }}
        />
      )}

      {/* top row */}
      <div className="relative z-10 flex items-center justify-between">
        <span
          className="font-bold tracking-tight"
          style={{ color: textColor, fontSize: compact ? 13 : 16 }}
        >
          LifeReceipt
        </span>
        {detailed && (
          <ShieldCheck size={14} color={textColor} strokeWidth={1.6} style={{ opacity: 0.75 }} />
        )}
      </div>

      {/* chip + contactless — front card only */}
      {detailed && (
        <div className="relative z-10 flex items-center gap-3 mt-1">
          <div
            className="rounded-md flex items-center justify-center"
            style={{
              width: 30,
              height: 22,
              background: "linear-gradient(135deg,#FFE9C7,#D8A85C)",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)",
            }}
          >
            <div className="grid grid-cols-3 grid-rows-2 gap-[1px] w-[20px] h-[12px]">
              {Array.from({ length: 6 }).map((_, k) => (
                <span key={k} className="bg-black/25 rounded-[1px]" />
              ))}
            </div>
          </div>
          <Wifi size={16} color={textColor} strokeWidth={1.6} className="rotate-90" style={{ opacity: 0.75 }} />
        </div>
      )}

      {/* icon cluster — front card only */}
      {detailed && (
        <div className="relative z-10 flex-1 flex items-center justify-end gap-2.5 my-2" style={{ opacity: 0.85 }}>
          <Receipt size={compact ? 20 : 26} color={textColor} strokeWidth={1.3} />
          <PieChart size={compact ? 15 : 19} color={textColor} strokeWidth={1.3} />
          <TrendingUp size={compact ? 15 : 19} color={textColor} strokeWidth={1.3} />
          <Wallet size={compact ? 14 : 17} color={textColor} strokeWidth={1.3} />
          <Sparkles size={11} color={textColor} strokeWidth={1.3} />
        </div>
      )}

      {/* bottom identity row */}
      <div className="relative z-10">
        {detailed && (
          <div
            className="text-[10px] uppercase tracking-wide mb-1"
            style={{ color: textColor, opacity: 0.6 }}
          >
            {name}
          </div>
        )}
        <div className="flex items-end justify-between">
          <span
            className="font-semibold tabular-nums"
            style={{ color: textColor, fontSize: compact ? 16 : detailed ? 20 : 14 }}
          >
            {balance}
          </span>
          <div className="flex items-center gap-1.5">
            {!detailed && (
              <Wifi size={13} color={textColor} strokeWidth={1.6} style={{ opacity: 0.8 }} />
            )}
            <span
              className="font-mono text-[10.5px] tracking-wider"
              style={{ color: textColor, opacity: 0.55 }}
            >
              •••• {last4}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Card;