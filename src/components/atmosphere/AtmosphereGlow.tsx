/**
 * AtmosphereGlow — Subtle ambient light overlay
 * 
 * Renders a soft, blurred radial glow at the top of the viewport
 * that reflects the current weather mood. Completely non-interactive,
 * pure atmospheric decoration.
 */
import { motion, AnimatePresence } from "framer-motion";
import { useAdaptiveTheme } from "@/hooks/useAdaptiveTheme";

const AtmosphereGlow = () => {
  const { atmosphere, isLoaded } = useAdaptiveTheme();

  if (!isLoaded) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={atmosphere.mood}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[40vh] overflow-hidden"
        aria-hidden="true"
      >
        {/* Primary glow */}
        <div
          className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[120vw] h-[80vh] rounded-full blur-[120px]"
          style={{
            background: `radial-gradient(ellipse at center, hsl(${atmosphere.ambientGlow} / ${atmosphere.moodIntensity * 0.08}) 0%, transparent 70%)`,
            transition: "background 3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />

        {/* Secondary accent glow — offset for depth */}
        <div
          className="absolute -top-1/3 left-1/3 w-[60vw] h-[50vh] rounded-full blur-[100px]"
          style={{
            background: `radial-gradient(ellipse at center, hsl(var(--atmosphere-accent, 147 57% 43%) / ${atmosphere.moodIntensity * 0.05}) 0%, transparent 60%)`,
            transition: "background 3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default AtmosphereGlow;
