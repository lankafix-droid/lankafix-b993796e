import { Link, useLocation } from "react-router-dom";
import { Home, Grid3X3, Stethoscope, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
      {/* Frosted glass background */}
      <div className="bg-card/80 backdrop-blur-2xl border-t border-border/30">
        <div className="flex items-center justify-around h-[72px] max-w-md mx-auto px-2">
          {tabs.map(({ to, icon: Icon, label }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to.replace("/#", "/"));
            return (
              <Link
                key={label}
                to={to}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-2xl transition-smooth",
                  active
                    ? "text-primary"
                    : "text-muted-foreground active:scale-90"
                )}
              >
                {/* Active indicator dot */}
                {active && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -top-0.5 w-5 h-[3px] rounded-full bg-gradient-brand"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Icon
                    className={cn(
                      "w-[22px] h-[22px] transition-smooth",
                      active ? "stroke-[2.5]" : "stroke-[1.8]"
                    )}
                  />
                </motion.div>
                <span
                  className={cn(
                    "text-[10px] leading-none tracking-wide transition-smooth",
                    active ? "font-bold" : "font-medium opacity-70"
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
