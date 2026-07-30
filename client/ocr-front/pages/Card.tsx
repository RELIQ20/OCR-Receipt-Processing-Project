import { motion } from "framer-motion";
import { Receipt } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export interface CardProps {
  /** Passed background gradient, we will use it as an accent strip */
  background: string;
  name: string;
  balance: string;
  processingAmount?: string;
  processingCount?: number;
  confirmedAmount?: string;
  confirmedCount?: number;
  exportUrl?: string;
  last4?: string;
  detailed?: boolean;
  compact?: boolean;
  textColor?: string;
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
  processingAmount,
  processingCount,
  confirmedAmount,
  confirmedCount,
  exportUrl,
  last4 = "5008",
  detailed = false,
  compact = false,
  glow,
  onGlowMove,
  onHoverStart,
  onHoverEnd,
  className = "",
}: CardProps) => {


  return (
    <motion.div
      className={`w-full h-full px-5 pb-5 pt-7 flex flex-col relative overflow-hidden bg-[#fafafa] ${className}`}
      style={{
        boxShadow:
          "0 10px 30px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)",
        // A subtle zig-zag or stamp edge effect using clip-path could be added, but rounded is safer for framer-motion masking
        borderRadius: "4px",
      }}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onMouseMove={onGlowMove}
    >
      {/* Accent Strip using the original ATM background */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background }} />

      {glow && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(0,0,0,0.03), transparent 42%)`,
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col items-center border-b-2 border-dashed pb-3 mb-3 mt-1" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
        <div className="flex items-center gap-1.5 mb-1">
          <Receipt size={14} color="#111" />
          <span className="font-bold tracking-widest uppercase text-[#111]" style={{ fontSize: compact ? 12 : 14 }}>
            LifeReceipt
          </span>
        </div>
        {detailed && <span className="text-[9px] text-[#666] font-mono tracking-widest">OFFICIAL RECEIPT</span>}
      </div>

      {/* Body */}
      <div className="flex-1 w-full flex flex-col justify-center gap-3 mt-1 px-2">
        {/* Processing */}
        {(processingCount ?? 0) > 0 && (
          <div className="flex justify-between items-end border-b border-gray-100 pb-1">
            <div className="flex flex-col items-start">
              <div className="text-[9px] text-[#888] font-mono tracking-wider font-semibold">PROCESSING</div>
              <div className="text-[8px] text-[#666] font-mono mt-0.5">{processingCount ?? 0} receipt{(processingCount ?? 0) === 1 ? "" : "s"}</div>
            </div>
            <div className="font-bold tabular-nums tracking-tight text-[#111] text-base leading-none">
              {processingAmount ?? "₱0.00"}
            </div>
          </div>
        )}

        {/* Confirmed */}
        <div className="flex justify-between items-end">
          <div className="flex flex-col items-start">
            <div className="text-[9px] text-[#888] font-mono tracking-wider font-semibold">CONFIRMED</div>
            <div className="text-[8px] text-[#666] font-mono mt-0.5">{confirmedCount ?? 0} receipt{(confirmedCount ?? 0) === 1 ? "" : "s"}</div>
          </div>
          <div className="font-bold tabular-nums tracking-tight text-[#111] text-base leading-none">
            {confirmedAmount ?? "₱0.00"}
          </div>
        </div>
      </div>

      {/* Footer / QR Code */}
      {detailed && (
        <div className="mt-4 pt-3 border-t-2 border-dashed flex flex-col items-center" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
          <QRCodeSVG 
            value={exportUrl ?? `${window.location.origin}/api/receipts/export?sender=${encodeURIComponent(name)}`} 
            size={70} 
            level="M"
            includeMargin={false}
            bgColor="transparent"
            fgColor="#111"
          />
          <span className="text-[8px] font-mono text-[#666] mt-2 tracking-[0.1em]">SCAN TO EXPORT EXCEL</span>
        </div>
      )}
    </motion.div>
  );
};

export default Card;