import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Menu, X, Wrench, User, Moon, Sun } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useState, useEffect } from "react";
import LankaFixLogo from "@/components/brand/LankaFixLogo";
import { motion, AnimatePresence } from "framer-motion";

const useTheme = () => {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("lankafix-theme") === "dark" ||
      (!localStorage.getItem("lankafix-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("lankafix-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("lankafix-theme", "light");
    }
  }, [dark]);

  return { dark, toggle: () => setDark(d => !d) };
};

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { dark, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-50 glass border-b elevation-2 safe-area-top">
      <div className="container flex items-center justify-between h-14 md:h-16">
        <Link to="/" className="flex items-center">
          <LankaFixLogo size="md" />
        </Link>

        {/* Location pill — desktop */}
        <div className="hidden md:flex items-center gap-1.5 text-[var(--text-xs)] text-muted-foreground bg-secondary/80 px-3 py-1.5 rounded-full border border-border/40">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium text-foreground">Greater Colombo</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {[
            { to: "/", label: "Home", active: true },
            { to: "/diagnose", label: "Diagnose" },
            { to: "/track", label: "Track Job" },
            { to: "/account", label: "Account" },
          ].map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-[var(--text-sm)] font-medium transition-smooth ${link.active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {link.label}
            </Link>
          ))}
          <NotificationBell />
          <button
            onClick={toggle}
            className="p-2 rounded-xl hover:bg-muted transition-smooth text-muted-foreground hover:text-foreground"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Button size="sm" className="bg-gradient-brand text-primary-foreground shadow-brand font-semibold rounded-xl" asChild>
            <Link to="/#categories">
              <Wrench className="w-3.5 h-3.5 mr-1.5" />
              Book Now
            </Link>
          </Button>
        </nav>

        {/* Mobile controls */}
        <div className="md:hidden flex items-center gap-0.5">
          <NotificationBell />
          <button
            onClick={toggle}
            className="p-2.5 rounded-xl hover:bg-muted transition-smooth text-muted-foreground touch-target"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
          <button
            className="p-2.5 rounded-xl hover:bg-muted transition-smooth touch-target"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden border-t border-border/30 bg-card overflow-hidden"
          >
            <div className="p-4 space-y-1">
              {[
                { to: "/", label: "Home" },
                { to: "/diagnose", label: "Diagnose" },
                { to: "/track", label: "Track Job" },
                { to: "/account", label: "Account", icon: <User className="w-4 h-4" /> },
              ].map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-2 text-[var(--text-sm)] font-medium py-3 px-4 rounded-xl hover:bg-muted transition-smooth text-muted-foreground touch-target"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
              <div className="pt-3">
                <Button className="w-full bg-gradient-brand text-primary-foreground shadow-brand font-semibold rounded-xl h-12" asChild>
                  <Link to="/#categories" onClick={() => setMenuOpen(false)}>
                    <Wrench className="w-4 h-4 mr-1.5" />
                    Book Now
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
