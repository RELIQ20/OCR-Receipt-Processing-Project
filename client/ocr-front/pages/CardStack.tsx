"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useAnimationFrame,
} from "framer-motion";
import { Card } from "./Card";

const LAYERS = [
  { id: "back", background: "linear-gradient(135deg, #133020 0%, #034E34 100%)", textColor: "rgba(255,255,255,0.55)" },
  { id: "third", background: "linear-gradient(135deg, #034E34 0%, #417256 100%)", textColor: "rgba(255,255,255,0.7)" },
  { id: "second", background: "linear-gradient(135deg, #C17110 0%, #E89131 100%)", textColor: "rgba(255,255,255,0.92)" },
  { id: "front", background: "linear-gradient(135deg, #FFC370 0%, #F4D0A4 100%)", textColor: "rgba(40,26,4,0.9)" },
] as const;

const AUTO_DEG_PER_SEC = 360 / 20;
const MAX_TILT = 10;

export interface CardStackProps {
  name: string;
  balance: string;
  last4?: string;
  size?: "sidebar" | "hero";
  autoRotate?: boolean;
  onSelect?: () => void;
}

export function CardStack({
  name,
  balance,
  last4 = "5008",
  size = "sidebar",
  autoRotate = true,
  onSelect,
}: CardStackProps) {
  const compact = size === "sidebar";
  const cardW = compact ? 254 : 340;
  const cardH = cardW / 1.586;
  const stepY = compact ? 19 : 30;
  const floatRange = compact ? 11 : 8;
  const hoverLift = compact ? -18 : -14;
  const [justSelected, setJustSelected] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [frontHovered, setFrontHovered] = useState(false);
  const [glow, setGlow] = useState<{ x: number; y: number } | null>(null);

  const rotateY = useMotionValue(0);
  const tiltX = useSpring(0, { stiffness: 220, damping: 20, mass: 0.8 });
  const tiltYRaw = useMotionValue(0);
  const tiltY = useSpring(tiltYRaw, { stiffness: 220, damping: 20, mass: 0.8 });

  const totalRotateY = useTransform([rotateY, tiltY], (latest) =>
    (latest as number[]).reduce((a, b) => a + b, 0)
  );

  useAnimationFrame((_, delta) => {
    if (!autoRotate || isDragging.current) return;
    rotateY.set(rotateY.get() + AUTO_DEG_PER_SEC * (delta / 1000));
  });

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    tiltX.set(-ny * MAX_TILT);
    tiltYRaw.set(nx * MAX_TILT * 0.6);

    if (isDragging.current) {
      rotateY.set(rotateY.get() + e.movementX * 0.45);
    }
  };

  const handlePointerLeave = () => {
    tiltX.set(0);
    tiltYRaw.set(0);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const handleFrontMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setGlow({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleFrontClick = () => {
    onSelect?.();
    setJustSelected(true);
    window.setTimeout(() => setJustSelected(false), 700);
  };

  return (
    <div
      ref={wrapRef}
      className="relative select-none touch-none cursor-grab active:cursor-grabbing"
      style={{ width: cardW + 44, height: cardH + stepY * 3 + 60 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div
        className="absolute left-1/2 bottom-3 -translate-x-1/2 rounded-full blur-2xl pointer-events-none"
        style={{ width: cardW * 0.8, height: 26, background: "rgba(0,0,0,0.45)" }}
      />

      <div className="absolute inset-0" style={{ perspective: 1400 }}>
        <motion.div
          className="relative w-full h-full"
          style={{ transformStyle: "preserve-3d", rotateX: tiltX, rotateY: totalRotateY }}
        >
          {LAYERS.map((layer, i) => {
            const depthFromFront = 3 - i;
            const yOffset = -(depthFromFront * stepY);
            const scale = 1 - depthFromFront * 0.035;
            const zTranslate = -depthFromFront * 20;
            const isFront = layer.id === "front";

            return (
              <motion.div
                key={layer.id}
                className="absolute left-1/2 top-1/2"
                style={{ zIndex: i + 1, x: "-50%", y: `calc(-50% + ${yOffset}px)`, translateZ: zTranslate, scale }}
                animate={{ y: [0, -floatRange, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: i * 0.35 }}
              >
                <motion.div
                  className="relative"
                  style={{ width: cardW, height: cardH, cursor: isFront ? "pointer" : "default" }}
                  animate={isFront && frontHovered ? { y: hoverLift, scale: 1.07 } : { y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 20, mass: 0.8 }}
                  onClick={isFront ? handleFrontClick : undefined}
                >
                  {isFront && justSelected && (
                    <motion.div
                      className="absolute -inset-2 rounded-[28px] pointer-events-none"
                      style={{ border: "2px solid #FFC370" }}
                      initial={{ opacity: 0.9, scale: 0.98 }}
                      animate={{ opacity: 0, scale: 1.06 }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                    />
                  )}
                  <Card
                    background={layer.background}
                    textColor={layer.textColor}
                    name={isFront ? name : "LifeReceipt"}
                    balance={isFront ? balance : "••••••"}
                    last4={last4}
                    detailed={isFront}
                    compact={compact}
                    glow={isFront ? glow : null}
                    onGlowMove={isFront ? handleFrontMove : undefined}
                    onHoverStart={isFront ? () => setFrontHovered(true) : undefined}
                    onHoverEnd={isFront ? () => setFrontHovered(false) : undefined}
                  />
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

export default CardStack;