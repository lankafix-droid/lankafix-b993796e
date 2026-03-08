import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Menu, X, Wrench, User } from "lucide-react";
import { useState } from "react";
import LankaFixLogo from "@/components/brand/LankaFixLogo";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b shadow-sm">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <LankaFixLogo size="md" />
        </Link>
        <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
          <MapPin className="w-3.5 h-3.5 text-primary" /><span className="font-medium">Greater Colombo</span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Home</Link>
          <Link to="/diagnose" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Diagnose</Link>
          <Link to="/track" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Track Job</Link>
          <Link to="/account" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Account</Link>
          <Button size="sm" className="bg-gradient-brand hover:opacity-90 shadow-sm" asChild>
            <Link to="/#categories">
              <Wrench className="w-3.5 h-3.5 mr-1" />
              Book Now
            </Link>
          </Button>
        </nav>
        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t bg-card p-4 space-y-3 animate-fade-in">
          <Link to="/" className="block text-sm font-medium py-2.5 px-3 rounded-lg hover:bg-muted transition-colors" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/diagnose" className="block text-sm font-medium py-2.5 px-3 rounded-lg hover:bg-muted transition-colors" onClick={() => setMenuOpen(false)}>Diagnose</Link>
          <Link to="/track" className="block text-sm font-medium py-2.5 px-3 text-muted-foreground rounded-lg hover:bg-muted transition-colors" onClick={() => setMenuOpen(false)}>Track Job</Link>
          <Button className="w-full bg-gradient-brand hover:opacity-90" size="sm" asChild>
            <Link to="/#categories" onClick={() => setMenuOpen(false)}>
              <Wrench className="w-3.5 h-3.5 mr-1" />
              Book Now
            </Link>
          </Button>
        </div>
      )}
    </header>
  );
};

export default Header;
