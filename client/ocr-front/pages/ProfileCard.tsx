import { motion, useMotionValue, useTransform } from "framer-motion";

export function ProfileCard({ name, title, enableTilt, behindGlowEnabled, innerGradient }: any) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Tilt logic - only active if enableTilt is true
  const rotateX = useTransform(y, [-100, 100], [15, -15]);
  const rotateY = useTransform(x, [-100, 100], [-15, 15]);

  return (
    <div className="relative w-full h-[180px] [perspective:1000px]">
      {/* Background Glow Effect */}
      {behindGlowEnabled && (
        <div className="absolute inset-0 bg-orange-500/20 blur-[40px] rounded-3xl" />
      )}
      
      <motion.div
        className="relative w-full h-full rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col justify-end"
        style={{
          background: innerGradient,
          rotateX: enableTilt ? rotateX : 0,
          rotateY: enableTilt ? rotateY : 0,
          transformStyle: "preserve-3d"
        }}
        onMouseMove={(e: any) => {
          if (!enableTilt) return;
          const rect = e.currentTarget.getBoundingClientRect();
          x.set(e.clientX - rect.left - rect.width / 2);
          y.set(e.clientY - rect.top - rect.height / 2);
        }}
        onMouseLeave={() => { x.set(0); y.set(0); }}
        whileHover={{ scale: 1.02 }}
      >
        <p className="text-white/60 text-[10px] font-bold tracking-widest">{name}</p>
        <p className="text-white text-lg font-bold">{title}</p>
      </motion.div>
    </div>
  );
}