import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Menu, X } from "lucide-react";
import { useState } from "react";
import LankaFixLogo from "@/components/brand/LankaFixLogo";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <LankaFixLogo size="md" />
        </Link>
        <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 text-primary" /><span>Greater Colombo</span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Home</Link>
          <Link to="/categories" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Categories</Link>
          <Link to="/track" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Track Job</Link>
          <Button size="sm" asChild><Link to="/categories">Book Now</Link></Button>
        </nav>
        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t bg-card p-4 space-y-3">
          <Link to="/" className="block text-sm font-medium py-2" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/categories" className="block text-sm font-medium py-2" onClick={() => setMenuOpen(false)}>Categories</Link>
          <Link to="/track" className="block text-sm font-medium py-2 text-muted-foreground" onClick={() => setMenuOpen(false)}>Track Job</Link>
          <Button className="w-full" size="sm" asChild><Link to="/categories" onClick={() => setMenuOpen(false)}>Book Now</Link></Button>
        </div>
      )}
    </header>
  );
};

export default Header;
