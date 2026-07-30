"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw, CreditCard, User } from "lucide-react";
import { Card } from "./Card";

export interface CarouselCardItem {
  name: string;
  qty: number;
  price: number;
}

export interface CarouselCard {
  /** CSS background — usually a linear-gradient string */
  background: string;
  /** Primary label shown on the card (vendor name / account name) */
  label: string;
  balance: string;
  last4: string;
  dateLabel?: string;
  contactNumber?: string;
  items?: CarouselCardItem[];
  processingAmount?: string;
  processingCount?: number;
  confirmedAmount?: string;
  confirmedCount?: number;
  exportUrl?: string;
}

export interface CardCarouselProps {
  cards: CarouselCard[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
  className?: string;
}

const SWIPE_THRESHOLD = 60;

/** Reverse face: line-item breakdown + support/contact meta, styled to match the front card's palette. */
function CardBack({ card }: { card: CarouselCard }) {
  return (
    <div
      className="w-full h-full rounded-[24px] p-5 flex flex-col border border-white/15 overflow-hidden"
      style={{
        background: card.background,
        boxShadow:
          "0 45px 90px rgba(0,0,0,0.28), 0 20px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.2)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-white/90 truncate">{card.label}</span>
        <span className="font-mono text-[10.5px] tracking-wider text-white/55">•••• {card.last4}</span>
      </div>

      {card.contactNumber && <p className="text-[11px] text-white/60 mb-2">{card.contactNumber}</p>}

      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        {card.items && card.items.length > 0 ? (
          card.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] text-white/80">
              <span className="truncate pr-2">
                {item.qty}× {item.name}
              </span>
              <span className="shrink-0 tabular-nums">
                ₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-white/40">No line items for this card.</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/15">
        {card.dateLabel && <span className="text-[10.5px] text-white/50">{card.dateLabel}</span>}
        <span className="font-semibold text-sm text-white/90 tabular-nums ml-auto">{card.balance}</span>
      </div>
    </div>
  );
}

export function CardCarousel({ cards, activeIndex, onActiveChange, className = "" }: CardCarouselProps) {
  const [direction, setDirection] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const clampedIndex = Math.min(Math.max(activeIndex, 0), cards.length - 1);

  // Always land back on the front face when the active card changes.
  useEffect(() => {
    setFlipped(false);
  }, [clampedIndex]);

  if (cards.length === 0) {
    return (
      <div className="w-full h-[180px] rounded-3xl border border-white/10 bg-white/[0.02] flex items-center justify-center">
        <span className="text-xs text-white/30">No cards yet</span>
      </div>
    );
  }

  const active = cards[clampedIndex];

  const goTo = (nextIndex: number) => {
    if (nextIndex === clampedIndex) return;
    setDirection(nextIndex > clampedIndex ? 1 : -1);
    const wrapped = (nextIndex + cards.length) % cards.length;
    onActiveChange(wrapped);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // If user pulls down (y > threshold), we go to the next receipt (pulling it out)
    if (info.offset.y > SWIPE_THRESHOLD) {
      goTo(clampedIndex + 1);
    } 
    // If user pushes up (y < -threshold), we go to the previous receipt (pushing it back in)
    else if (info.offset.y < -SWIPE_THRESHOLD) {
      goTo(clampedIndex - 1);
    }
  };

  return (
    <div className={`relative w-full flex flex-col items-center ${className}`}>
      {/* --- Receipts Machine UI --- */}
      <div className="relative z-20 w-full max-w-[320px] mx-auto bg-gradient-to-b from-gray-200 to-gray-300 rounded-t-[32px] shadow-2xl border-t border-l border-r border-white/60 flex flex-col items-center pt-6 pb-0">
        {/* Hardware details / Screws */}
        <div className="absolute top-4 left-5 w-2 h-2 rounded-full bg-gray-400 shadow-inner border border-gray-300" />
        <div className="absolute top-4 right-5 w-2 h-2 rounded-full bg-gray-400 shadow-inner border border-gray-300" />
        
        {/* Sender Label */}
        <div className="flex items-center gap-1.5 mb-1.5 text-gray-500/80">
          <User size={12} strokeWidth={2.5} />
          <span className="text-[10px] font-bold tracking-widest uppercase">Sender</span>
        </div>

        {/* LCD Screen */}
        <div className="w-[75%] bg-[#c6f6d5] border-[3px] border-gray-800 rounded-lg p-2 mb-5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] flex flex-col items-center justify-center relative overflow-hidden">
          {/* LCD scanline overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_4px] pointer-events-none" />
          
          <p className="font-mono text-[11px] font-extrabold text-[#064e3b] uppercase tracking-[0.08em] text-center truncate w-full px-2 drop-shadow-[0_0_2px_rgba(6,78,59,0.3)] relative z-10">
            {cards.length > 0 ? active.label : "NO SENDERS"}
          </p>
        </div>

        {/* The Receipt Slot (Positioned exactly at the bottom lip) */}
        <div className="w-[276px] h-3 bg-gray-900 shadow-[inset_0_4px_6px_rgba(0,0,0,0.6)] border-b border-gray-400 rounded-t-sm" />
      </div>

      {/* --- Receipt Card Container --- */}
      {/* 
        The machine above is max-w 320px, the slot is 276px wide.
        The card max-w is 268px so it fits perfectly inside the 276px slot.
        -mt-1.5 pulls it exactly behind the slot so it emerges from the dark gap.
      */}
      <div className="relative w-full aspect-[9/14] max-w-[268px] mx-auto perspective-[1200px] z-10 -mt-[6px]">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={clampedIndex}
            custom={direction}
            initial={{ opacity: 0, y: direction >= 0 ? -120 : 120, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: direction >= 0 ? 120 : -120, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag={cards.length > 1 ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.6}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <motion.div
              className="relative w-full h-full"
              style={{ transformStyle: "preserve-3d" }}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
            >
              <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
                <Card 
                  background={active.background} 
                  name={active.label} 
                  balance={active.balance} 
                  processingAmount={active.processingAmount} 
                  processingCount={active.processingCount} 
                  confirmedAmount={active.confirmedAmount} 
                  confirmedCount={active.confirmedCount} 
                  exportUrl={active.exportUrl}
                  last4={active.last4} 
                  detailed 
                />
              </div>
              <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                <CardBack card={active} />
              </div>
            </motion.div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setFlipped((v) => !v);
              }}
              className="absolute bottom-4 right-4 z-10 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-black/60 hover:text-black transition-colors"
              aria-label={flipped ? "Show card front" : "Show card details"}
            >
              <CreditCard size={14} />
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {!flipped && (active.dateLabel || active.contactNumber) && (
        <div className="flex items-center justify-center mt-3 text-[11px] text-gray-500 font-semibold px-1 w-full text-center">
          {active.dateLabel && <span>{active.dateLabel}</span>}
          {active.contactNumber && <span className="ml-2">{active.contactNumber}</span>}
        </div>
      )}

      {cards.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-2 mb-2">
          <button
            onClick={() => goTo(clampedIndex - 1)}
            className="w-7 h-7 rounded-full bg-black/5 border border-black/10 flex items-center justify-center text-black/60 hover:text-black hover:bg-black/10 transition-colors"
            aria-label="Previous card"
          >
            <ChevronLeft size={14} />
          </button>

          <div className="flex items-center gap-1.5">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === clampedIndex ? 16 : 6,
                  height: 6,
                  background: i === clampedIndex ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.15)",
                }}
                aria-label={`Go to card ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() => goTo(clampedIndex + 1)}
            className="w-7 h-7 rounded-full bg-black/5 border border-black/10 flex items-center justify-center text-black/60 hover:text-black hover:bg-black/10 transition-colors"
            aria-label="Next card"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default CardCarousel;
