import { Link, useLocation } from "react-router-dom";
import { Home, Grid3X3, Stethoscope, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/#categories", icon: Grid3X3, label: "Services" },
  { to: "/diagnose", icon: Stethoscope, label: "Diagnose" },
  { to: "/track", icon: ClipboardList, label: "Bookings" },
  { to: "/account", icon: User, label: "Profile" },
] as const;

export default function MobileBottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 safe-area-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Frosted glass background with top shadow for depth */}
      <div
        className="bg-card/85 backdrop-blur-2xl border-t border-border/20"
        style={{ boxShadow: "0 -4px 20px -4px hsl(var(--foreground) / 0.06)" }}
      >
        <div className="flex items-center justify-around h-[72px] max-w-md mx-auto px-2">
          {tabs.map(({ to, icon: Icon, label }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to.replace("/#", "/"));
            return (
              <Link
                key={label}
                to={to}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-2xl transition-smooth",
                  active
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {/* Active background glow */}
                <AnimatePresence>
                  {active && (
                    <motion.div
                      layoutId="bottomNavBg"
                      className="absolute inset-1 rounded-2xl bg-primary/8"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    />
                  )}
                </AnimatePresence>

                {/* Active indicator line */}
                {active && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -top-[1px] w-6 h-[2.5px] rounded-full bg-gradient-brand"
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  />
                )}

                <motion.div
                  whileTap={{ scale: 0.75 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="relative z-10"
                >
                  <Icon
                    className={cn(
                      "w-[22px] h-[22px] transition-smooth",
                      active ? "stroke-[2.5]" : "stroke-[1.5]"
                    )}
                  />
                </motion.div>
                <span
                  className={cn(
                    "relative z-10 text-[10px] leading-none tracking-wide transition-smooth",
                    active ? "font-bold" : "font-normal opacity-60"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
