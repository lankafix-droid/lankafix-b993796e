import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Menu, X } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">LF</span>
          </div>
          <span className="font-bold text-xl text-foreground">
            Lanka<span className="text-primary">Fix</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span>Greater Colombo</span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Home</Link>
          <Link to="/booking/LK-AC-000123" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Track Job</Link>
          <Button size="sm">Book Now</Button>
        </nav>

        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t bg-card p-4 space-y-3">
          <Link to="/" className="block text-sm font-medium py-2" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/booking/LK-AC-000123" className="block text-sm font-medium py-2 text-muted-foreground" onClick={() => setMenuOpen(false)}>Track Job</Link>
          <Button className="w-full" size="sm">Book Now</Button>
        </div>
      )}
    </header>
  );
};

export default Header;
