import { Link, useLocation } from "react-router-dom";
import { Home, Stethoscope, ClipboardList, HeartPulse, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/diagnose", icon: Stethoscope, label: "Diagnose" },
  { to: "/track", icon: ClipboardList, label: "Bookings" },
  { to: "/home-health", icon: HeartPulse, label: "Care" },
  { to: "/account", icon: User, label: "Account" },
] as const;

export default function MobileBottomNav() {
  const { pathname } = useLocation();

  // Hide on partner/ops/technician/booking pages
  if (pathname.startsWith("/partner") || pathname.startsWith("/ops") || pathname.startsWith("/technician") || pathname.startsWith("/book/")) {
    return null;
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50"
      role="navigation"
      aria-label="Main navigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Frosted glass background */}
      <div
        className="glass border-t"
        style={{ boxShadow: "0 -2px 16px -2px hsl(var(--foreground) / 0.05)" }}
      >
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-1">
          {tabs.map(({ to, icon: Icon, label }) => {
            const active = to === "/"
              ? pathname === "/"
              : pathname.startsWith(to);
            return (
              <Link
                key={label}
                to={to}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-[3px] w-16 h-14 rounded-2xl transition-smooth touch-target",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {/* Active background pill */}
                <AnimatePresence>
                  {active && (
                    <motion.div
                      layoutId="bottomNavPill"
                      className="absolute inset-1 rounded-2xl bg-primary/8"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    />
                  )}
                </AnimatePresence>

                {/* Active indicator dot */}
                {active && (
                  <motion.div
                    layoutId="bottomNavDot"
                    className="absolute -top-[1px] w-5 h-[2.5px] rounded-full bg-gradient-brand"
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
                      "w-[21px] h-[21px] transition-smooth",
                      active ? "stroke-[2.5]" : "stroke-[1.5]"
                    )}
                  />
                </motion.div>
                <span
                  className={cn(
                    "relative z-10 text-[10px] leading-none tracking-wide transition-smooth",
                    active ? "font-bold" : "font-normal opacity-55"
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
