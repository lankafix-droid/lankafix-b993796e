import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";

interface TapScaleProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  scale?: number;
  className?: string;
}

/**
 * Wraps any element with a premium tap/press scale animation.
 * Mimics iOS/Uber haptic-feel press response.
 */
const TapScale = forwardRef<HTMLDivElement, TapScaleProps>(
  ({ children, scale = 0.97, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      whileTap={{ scale }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);

TapScale.displayName = "TapScale";

export default TapScale;
