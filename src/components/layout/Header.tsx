import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Menu, X, Wrench, User } from "lucide-react";
import { useState } from "react";
import LankaFixLogo from "@/components/brand/LankaFixLogo";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/60 shadow-sm">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center">
          <LankaFixLogo size="md" />
        </Link>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full border border-border/50">
          <MapPin className="w-3.5 h-3.5 text-primary" /><span className="font-medium text-foreground">Greater Colombo</span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Home</Link>
          <Link to="/diagnose" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Diagnose</Link>
          <Link to="/track" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Track Job</Link>
          <Link to="/account" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Account</Link>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-brand font-semibold" asChild>
            <Link to="/#categories">
              <Wrench className="w-3.5 h-3.5 mr-1.5" />
              Book Now
            </Link>
          </Button>
        </nav>
        <button className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t bg-card p-4 space-y-1 animate-fade-in">
          <Link to="/" className="block text-sm font-medium py-3 px-4 rounded-xl hover:bg-muted transition-colors" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/diagnose" className="block text-sm font-medium py-3 px-4 rounded-xl hover:bg-muted transition-colors text-muted-foreground" onClick={() => setMenuOpen(false)}>Diagnose</Link>
          <Link to="/track" className="block text-sm font-medium py-3 px-4 text-muted-foreground rounded-xl hover:bg-muted transition-colors" onClick={() => setMenuOpen(false)}>Track Job</Link>
          <Link to="/account" className="block text-sm font-medium py-3 px-4 text-muted-foreground rounded-xl hover:bg-muted transition-colors" onClick={() => setMenuOpen(false)}>
            <span className="flex items-center gap-2"><User className="w-4 h-4" /> Account</span>
          </Link>
          <div className="pt-2">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-brand font-semibold" size="sm" asChild>
              <Link to="/#categories" onClick={() => setMenuOpen(false)}>
                <Wrench className="w-3.5 h-3.5 mr-1.5" />
                Book Now
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
