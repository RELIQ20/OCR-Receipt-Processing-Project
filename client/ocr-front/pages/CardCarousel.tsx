"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
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
    if (info.offset.x < -SWIPE_THRESHOLD) {
      goTo(clampedIndex + 1);
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      goTo(clampedIndex - 1);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full h-[180px]" style={{ perspective: 1400 }}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={clampedIndex}
            custom={direction}
            initial={{ opacity: 0, x: direction >= 0 ? 60 : -60, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction >= 0 ? -60 : 60, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag={cards.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
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
                <Card background={active.background} name={active.label} balance={active.balance} last4={active.last4} detailed />
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
              className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/25 hover:bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white transition-colors"
              aria-label={flipped ? "Show card front" : "Show card details"}
            >
              <RotateCcw size={12} />
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {!flipped && (active.dateLabel || active.contactNumber) && (
        <div className="flex items-center justify-between mt-3 text-[11px] text-white/40 px-1">
          {active.dateLabel && <span>{active.dateLabel}</span>}
          {active.contactNumber && <span>{active.contactNumber}</span>}
        </div>
      )}

      {cards.length > 1 && (
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => goTo(clampedIndex - 1)}
            className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
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
                  background: i === clampedIndex ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)",
                }}
                aria-label={`Go to card ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() => goTo(clampedIndex + 1)}
            className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
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
